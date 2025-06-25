
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { SlackChannel } from '@/services/blockdrive_slack';

interface SlackFileUploadProps {
  channels: SlackChannel[];
  loading: boolean;
  onFileUpload: (file: File, channelId: string) => Promise<void>;
}

export const SlackFileUpload = ({ channels, loading, onFileUpload }: SlackFileUploadProps) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (selectedFile && selectedChannel) {
      await onFileUpload(selectedFile, selectedChannel);
      setSelectedFile(null);
    }
  };

  return (
    <Card className="p-6 bg-gray-800 border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Upload File to Slack</h3>
      <div className="space-y-4">
        <div>
          <Label className="text-white">Select Channel</Label>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Choose a channel" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  #{channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-white">Select File</Label>
          <Input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
        
        <Button 
          onClick={handleUpload}
          disabled={!selectedFile || !selectedChannel || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload to Slack
        </Button>
      </div>
    </Card>
  );
};
