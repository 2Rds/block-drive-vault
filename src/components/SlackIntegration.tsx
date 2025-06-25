
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { blockdriveSlack, SlackChannel, SlackFile } from '@/services/blockdrive_slack';
import { toast } from 'sonner';
import { Slack } from 'lucide-react';
import { SlackConnectionStatus } from './slack/SlackConnectionStatus';
import { SlackFileUpload } from './slack/SlackFileUpload';
import { SlackFileList } from './slack/SlackFileList';
import { SlackConnectButton } from './slack/SlackConnectButton';

interface SlackIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackIntegration = ({ isOpen, onClose }: SlackIntegrationProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [slackFiles, setSlackFiles] = useState<SlackFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have a stored access token
    const storedToken = localStorage.getItem('slack_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
      setIsConnected(true);
      loadChannels(storedToken);
      loadSlackFiles(storedToken);
    }

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('OAuth error:', error);
      toast.error(`Slack connection failed: ${error}`);
      return;
    }

    if (code) {
      handleOAuthCallback(code);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    try {
      setLoading(true);
      const redirectUri = window.location.origin + window.location.pathname;
      console.log('Using redirect URI:', redirectUri);
      
      const tokenData = await blockdriveSlack.exchangeCodeForToken(code, redirectUri);
      console.log('Token exchange response:', tokenData);
      
      if (tokenData.ok && tokenData.access_token) {
        setAccessToken(tokenData.access_token);
        localStorage.setItem('slack_access_token', tokenData.access_token);
        setIsConnected(true);
        await loadChannels(tokenData.access_token);
        await loadSlackFiles(tokenData.access_token);
        toast.success('Successfully connected to Slack!');
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        console.error('Token exchange failed:', tokenData);
        toast.error(`Failed to connect to Slack: ${tokenData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast.error('Failed to connect to Slack');
    } finally {
      setLoading(false);
    }
  };

  const connectToSlack = async () => {
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      console.log('Initiating OAuth with redirect URI:', redirectUri);
      
      const authUrl = await blockdriveSlack.getAuthUrl(redirectUri);
      console.log('Auth URL:', authUrl);
      
      // Open in same window to handle the OAuth flow
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Slack:', error);
      toast.error('Failed to initiate Slack connection');
    }
  };

  const loadChannels = async (token: string) => {
    try {
      const channelList = await blockdriveSlack.getChannels(token);
      setChannels(channelList);
    } catch (error) {
      console.error('Error loading channels:', error);
      toast.error('Failed to load Slack channels');
    }
  };

  const loadSlackFiles = async (token: string) => {
    try {
      setLoading(true);
      const files = await blockdriveSlack.getFiles(token);
      setSlackFiles(files);
    } catch (error) {
      console.error('Error loading Slack files:', error);
      toast.error('Failed to load Slack files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, channelId: string) => {
    if (!accessToken) {
      toast.error('Please connect to Slack first');
      return;
    }

    try {
      setLoading(true);
      const result = await blockdriveSlack.uploadFileToSlack(
        accessToken,
        file,
        [channelId],
        file.name
      );

      if (result.ok) {
        toast.success('File uploaded to Slack successfully!');
        await loadSlackFiles(accessToken);
      } else {
        toast.error('Failed to upload file to Slack');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file to Slack');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = async (file: SlackFile) => {
    try {
      setLoading(true);
      const blob = await blockdriveSlack.downloadFileFromSlack(accessToken, file.url_private);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('File downloaded successfully!');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file from Slack');
    } finally {
      setLoading(false);
    }
  };

  const syncFiles = async () => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      await blockdriveSlack.syncSlackFiles(accessToken, 'current-user-id'); // Replace with actual user ID
      await loadSlackFiles(accessToken);
      toast.success('Files synced successfully!');
    } catch (error) {
      console.error('Error syncing files:', error);
      toast.error('Failed to sync files');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('slack_access_token');
    setAccessToken('');
    setIsConnected(false);
    setChannels([]);
    setSlackFiles([]);
    toast.success('Disconnected from Slack');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Slack className="w-6 h-6 text-blue-500" />
            Slack Integration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!isConnected ? (
            <SlackConnectButton loading={loading} onConnect={connectToSlack} />
          ) : (
            <div className="space-y-6">
              <SlackConnectionStatus isConnected={isConnected} onDisconnect={disconnect} />
              <SlackFileUpload 
                channels={channels} 
                loading={loading} 
                onFileUpload={handleFileUpload} 
              />
              <SlackFileList 
                files={slackFiles} 
                loading={loading} 
                onFileDownload={handleFileDownload} 
                onSyncFiles={syncFiles} 
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
