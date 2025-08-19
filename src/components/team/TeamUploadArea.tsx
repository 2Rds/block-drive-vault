import React, { useRef, useState } from 'react';
import { Upload, Plus, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TeamUploadAreaProps {
  onFileUploaded?: () => void;
}

export const TeamUploadArea = ({ onFileUploaded }: TeamUploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [visibility, setVisibility] = useState<'private' | 'team'>('private');
  const { currentTeam } = useTeams();
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const uploadFiles = async () => {
    if (!selectedFiles || !currentTeam || !user) {
      toast.error('Please select files and ensure you\'re in a team');
      return;
    }

    setIsUploading(true);
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Upload to Supabase storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${currentTeam.id}/${Date.now()}-${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ipfs-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('ipfs-files')
          .getPublicUrl(fileName);

        // Save file metadata to database
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            team_id: currentTeam.id,
            filename: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            content_type: file.type,
            visibility: visibility,
            storage_provider: 'supabase',
            ipfs_url: publicUrl
          });

        if (dbError) throw dbError;
      }

      toast.success(`${selectedFiles.length} file(s) uploaded successfully`);
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onFileUploaded?.();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-dashed border-white/30 p-8 text-center">
        <div className="text-center py-8">
          <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No team selected</h3>
          <p className="text-gray-500">Select a team to upload files</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-dashed border-white/30 p-6 hover:border-blue-500/50 transition-colors">
      <div
        className="space-y-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex justify-center">
          <div className="p-4 bg-blue-600/20 rounded-full">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Upload to {currentTeam.name}
          </h3>
          <p className="text-gray-400 mb-4">
            Drag and drop your files here, or click to browse
          </p>
        </div>

        {/* Visibility Settings */}
        <div className="max-w-xs mx-auto space-y-2">
          <Label className="text-sm text-gray-300">File Visibility</Label>
          <Select value={visibility} onValueChange={(value: 'private' | 'team') => setVisibility(value)}>
            <SelectTrigger className="bg-white/5 border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Private (Only You)</span>
                </div>
              </SelectItem>
              <SelectItem value="team">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Team (All Members)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            {visibility === 'private' 
              ? 'Only you can see these files'
              : 'All team members can view and download these files'
            }
          </p>
        </div>

        {/* Selected Files Display */}
        {selectedFiles && (
          <div className="max-w-md mx-auto bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-sm font-medium text-white mb-2">Selected Files:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Array.from(selectedFiles).map((file, index) => (
                <div key={index} className="text-xs text-gray-400 truncate">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isUploading}
          >
            <Plus className="w-4 h-4 mr-2" />
            {selectedFiles ? 'Choose Different Files' : 'Choose Files'}
          </Button>
          
          {selectedFiles && (
            <Button
              onClick={uploadFiles}
              disabled={isUploading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse w-1/2"></div>
            </div>
            <p className="text-sm text-gray-400 mt-2">Uploading to team storage...</p>
          </div>
        )}
      </div>
    </div>
  );
};