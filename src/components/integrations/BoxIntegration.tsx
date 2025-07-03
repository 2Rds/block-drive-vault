
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BoxConnectButton } from '@/components/box/BoxConnectButton';
import { BoxConnectionStatus } from '@/components/box/BoxConnectionStatus';
import { BoxFileList } from '@/components/box/BoxFileList';
import { useToast } from '@/hooks/use-toast';

interface BoxIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface BoxFile {
  id: string;
  name: string;
  size: number;
  type: string;
  modified_at: string;
}

export const BoxIntegration: React.FC<BoxIntegrationProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<BoxFile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already connected to Box
    const boxAccessToken = localStorage.getItem('box_access_token');
    if (boxAccessToken) {
      setIsConnected(true);
      syncFiles();
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    console.log('Initiating Box connection...');
    
    try {
      // Box OAuth flow would typically happen here
      // For demo purposes, we'll simulate a successful connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would:
      // 1. Redirect to Box OAuth URL
      // 2. Handle the callback with authorization code
      // 3. Exchange code for access token
      
      localStorage.setItem('box_access_token', 'demo_box_token');
      setIsConnected(true);
      
      toast({
        title: "Connected to Box",
        description: "Successfully connected to your Box account.",
      });
      
      await syncFiles();
    } catch (error) {
      console.error('Box connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Box. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('box_access_token');
    setIsConnected(false);
    setFiles([]);
    
    toast({
      title: "Disconnected from Box",
      description: "Successfully disconnected from your Box account.",
    });
  };

  const syncFiles = async () => {
    setLoading(true);
    console.log('Syncing Box files...');
    
    try {
      // Simulate API call to Box
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock Box files data
      const mockFiles: BoxFile[] = [
        {
          id: 'box1',
          name: 'Project Proposal.docx',
          size: 2048000,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          modified_at: '2024-01-15T10:30:00Z'
        },
        {
          id: 'box2',
          name: 'Financial Report.pdf',
          size: 1536000,
          type: 'application/pdf',
          modified_at: '2024-01-14T15:45:00Z'
        },
        {
          id: 'box3',
          name: 'Team Meeting.mp4',
          size: 52428800,
          type: 'video/mp4',
          modified_at: '2024-01-13T09:15:00Z'
        }
      ];
      
      setFiles(mockFiles);
      
      toast({
        title: "Files Synced",
        description: `Synced ${mockFiles.length} files from Box.`,
      });
    } catch (error) {
      console.error('Box sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync files from Box.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = async (file: BoxFile) => {
    console.log('Downloading file from Box:', file.name);
    
    try {
      // In a real implementation, you would download the file from Box API
      // and then upload it to IPFS
      toast({
        title: "Download Started",
        description: `Downloading ${file.name} from Box...`,
      });
      
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Download Complete",
        description: `${file.name} has been downloaded and added to BlockDrive.`,
      });
    } catch (error) {
      console.error('Box download error:', error);
      toast({
        title: "Download Failed",
        description: `Failed to download ${file.name} from Box.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Box Integration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!isConnected ? (
            <BoxConnectButton loading={loading} onConnect={handleConnect} />
          ) : (
            <>
              <BoxConnectionStatus 
                isConnected={isConnected} 
                onDisconnect={handleDisconnect} 
              />
              <BoxFileList 
                files={files}
                loading={loading}
                onFileDownload={handleFileDownload}
                onSyncFiles={syncFiles}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
