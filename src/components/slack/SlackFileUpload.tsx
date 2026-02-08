
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
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Upload File to Slack</h3>
      <div className="space-y-4">
        <div>
          <Label className="text-foreground">Select Channel</Label>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="bg-muted border-border text-foreground">
              <SelectValue placeholder="Choose a channel" />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border">
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  #{channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-foreground">Select File</Label>
          <Input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="bg-muted border-border text-foreground"
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
