
import React, { useRef, useState } from 'react';
import { Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateFolderModal } from './CreateFolderModal';
import { toast } from 'sonner';

interface UploadAreaProps {
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  onCreateFolder?: (folderName: string) => void;
}

export const UploadArea = ({ isUploading, setIsUploading, onCreateFolder }: UploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false);
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCreateFolder = (folderName: string) => {
    console.log('Creating folder:', folderName);
    toast.success(`Folder "${folderName}" created successfully!`);
    
    if (onCreateFolder) {
      onCreateFolder(folderName);
    }
  };

  return (
    <>
      <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-dashed border-white/30 p-8 text-center hover:border-blue-500/50 transition-colors">
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
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Upload to Blockchain Storage
            </h3>
            <p className="text-gray-400 mb-4">
              Drag and drop your files here, or click to browse
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isUploading}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Choose Files'}
              </Button>
              <Button 
                onClick={() => setShowCreateFolderModal(true)}
                className="bg-blue-600/20 border-blue-600/50 text-blue-400 hover:bg-blue-600/30 hover:border-blue-600/70 hover:text-blue-300"
                variant="outline"
              >
                Create Folder
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          {isUploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse w-1/2"></div>
              </div>
              <p className="text-sm text-gray-400 mt-2">Uploading to blockchain...</p>
            </div>
          )}
        </div>
      </div>

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
    </>
  );
};
