
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
      return;
    }

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('box_oauth_state');
    
    if (code && state && state === storedState) {
      handleOAuthCallback(code);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    console.log('Processing Box OAuth callback...');
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('box-integration', {
        body: { action: 'exchange_code', code }
      });

      if (error) throw error;

      localStorage.setItem('box_access_token', data.access_token);
      localStorage.removeItem('box_oauth_state');
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setIsConnected(true);
      
      toast({
        title: "Connected to Box",
        description: "Successfully connected to your Box account.",
      });
      
      await syncFiles();
    } catch (error) {
      console.error('Box OAuth callback error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to complete Box connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    console.log('Initiating Box OAuth connection...');
    
    try {
      // Initiate Box OAuth flow
      const clientId = 't3pgad8ucoxzrolvf4ljngfgpvb9ov5y';
      const redirectUri = encodeURIComponent(window.location.origin + '/auth');
      const state = Math.random().toString(36).substring(7);
      
      // Store state for verification
      localStorage.setItem('box_oauth_state', state);
      
      const authUrl = `https://account.box.com/api/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
      
      // Redirect to Box OAuth
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Box connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Box connection. Please try again.",
        variant: "destructive",
      });
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
      const accessToken = localStorage.getItem('box_access_token');
      if (!accessToken) {
        throw new Error('No Box access token found');
      }

      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('box-integration', {
        body: { action: 'get_files', access_token: accessToken }
      });

      if (error) throw error;

      setFiles(data.files);
      
      toast({
        title: "Files Synced",
        description: `Synced ${data.files.length} files from Box.`,
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
      const accessToken = localStorage.getItem('box_access_token');
      if (!accessToken) {
        throw new Error('No Box access token found');
      }

      toast({
        title: "Download Started",
        description: `Downloading ${file.name} from Box...`,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('box-integration', {
        body: { 
          action: 'download_file', 
          access_token: accessToken,
          file_id: file.id 
        }
      });

      if (error) throw error;

      // Download the file using the provided URL
      const response = await fetch(data.download_url);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Complete",
        description: `${file.name} has been downloaded successfully.`,
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
