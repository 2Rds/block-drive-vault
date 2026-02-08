
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, RefreshCw } from 'lucide-react';
import { BoxFile } from '@/components/integrations/BoxIntegration';

interface BoxFileListProps {
  files: BoxFile[];
  loading: boolean;
  onFileDownload: (file: BoxFile) => Promise<void>;
  onSyncFiles: () => Promise<void>;
}

export const BoxFileList = ({ files, loading, onFileDownload, onSyncFiles }: BoxFileListProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Box Files</h3>
        <Button 
          onClick={onSyncFiles}
          disabled={loading}
          variant="outline"
          className="bg-card border-border text-foreground hover:bg-muted"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Files
        </Button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-foreground font-medium">{file.name}</p>
              <p className="text-muted-foreground text-sm">
                {formatFileSize(file.size)} • Modified {formatDate(file.modified_at)}
              </p>
            </div>
            <Button
              onClick={() => onFileDownload(file)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="bg-card border-border text-foreground hover:bg-muted"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        {files.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No files found in your Box account</p>
          </div>
        )}
      </div>
    </Card>
  );
};
