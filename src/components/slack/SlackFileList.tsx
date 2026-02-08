
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, RefreshCw } from 'lucide-react';
import { SlackFile } from '@/services/blockdrive_slack';

interface SlackFileListProps {
  files: SlackFile[];
  loading: boolean;
  onFileDownload: (file: SlackFile) => Promise<void>;
  onSyncFiles: () => Promise<void>;
}

export const SlackFileList = ({ files, loading, onFileDownload, onSyncFiles }: SlackFileListProps) => {
  return (
    <Card className="p-6 bg-gray-800 border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Slack Files</h3>
        <Button 
          onClick={onSyncFiles}
          disabled={loading}
          variant="outline"
          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Files
        </Button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-white font-medium">{file.title || file.name}</p>
              <p className="text-gray-400 text-sm">
                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.mimetype}
              </p>
            </div>
            <Button
              onClick={() => onFileDownload(file)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        {files.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No files found in your Slack workspace</p>
          </div>
        )}
      </div>
    </Card>
  );
};
