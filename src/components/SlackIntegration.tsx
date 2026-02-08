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
  const [teamInfo, setTeamInfo] = useState<any>(null);

  useEffect(() => {
    console.log('SlackIntegration component mounted, initializing connection...');
    initializeConnection();
    handleOAuthCallback();
  }, []);

  const initializeConnection = async () => {
    console.log('Checking for stored Slack token...');
    const storedToken = localStorage.getItem('slack_access_token');

    if (storedToken) {
      console.log('Found stored token, verifying validity...');
      setLoading(true);
      try {
        const isValid = await blockdriveSlack.isTokenValid(storedToken);
        console.log('Token validation result:', isValid);

        if (isValid) {
          console.log('Token is valid, setting up connection...');
          setAccessToken(storedToken);
          setIsConnected(true);
          await Promise.all([
            loadTeamInfo(storedToken),
            loadChannels(storedToken),
            loadSlackFiles(storedToken)
          ]);
        } else {
          console.log('Token expired, clearing from storage');
          localStorage.removeItem('slack_access_token');
          toast.error('Slack connection expired. Please reconnect.');
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        localStorage.removeItem('slack_access_token');
        toast.error('Error verifying Slack connection. Please reconnect.');
      } finally {
        setLoading(false);
      }
    } else {
      console.log('No stored token found');
    }
  };

  const handleOAuthCallback = async () => {
    console.log('Checking URL for OAuth callback parameters...');
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    console.log('URL params:', { code: !!code, error, state });

    if (error) {
      console.error('OAuth error received:', error);
      toast.error(`Slack connection failed: ${error}`);
      return;
    }

    if (code) {
      console.log('OAuth code received, processing...');
      await processOAuthCode(code);
    }
  };

  const processOAuthCode = async (code: string) => {
    try {
      setLoading(true);
      const redirectUri = window.location.origin + window.location.pathname;
      console.log('Processing OAuth with:', { code: code.substring(0, 10) + '...', redirectUri });

      const tokenData = await blockdriveSlack.exchangeCodeForToken(code, redirectUri);
      console.log('Token exchange result:', {
        ok: tokenData.ok,
        hasAccessToken: !!tokenData.access_token,
        error: tokenData.error
      });

      if (tokenData.ok && tokenData.access_token) {
        console.log('Token exchange successful, setting up connection...');
        setAccessToken(tokenData.access_token);
        localStorage.setItem('slack_access_token', tokenData.access_token);
        setIsConnected(true);

        await Promise.all([
          loadTeamInfo(tokenData.access_token),
          loadChannels(tokenData.access_token),
          loadSlackFiles(tokenData.access_token)
        ]);

        toast.success('Successfully connected to Slack workspace!');

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        console.error('Token exchange failed:', tokenData);
        throw new Error(tokenData.error || 'Unknown error during token exchange');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast.error(`Failed to connect to Slack: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const connectToSlack = async () => {
    try {
      console.log('Initiating Slack connection...');
      setLoading(true);
      const redirectUri = window.location.origin + window.location.pathname;
      console.log('Using redirect URI:', redirectUri);

      const authUrl = await blockdriveSlack.getAuthUrl(redirectUri, 'blockdrive-integration');
      console.log('Generated auth URL:', authUrl);

      console.log('Redirecting to Slack OAuth...');
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Slack:', error);
      toast.error(`Failed to initiate Slack connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  const loadTeamInfo = async (token: string) => {
    try {
      console.log('Loading team info...');
      const team = await blockdriveSlack.getTeamInfo(token);
      console.log('Team info loaded:', team?.name || 'No team info');
      setTeamInfo(team);
    } catch (error) {
      console.error('Error loading team info:', error);
      toast.error('Failed to load workspace information');
    }
  };

  const loadChannels = async (token: string) => {
    try {
      console.log('Loading channels...');
      const channelList = await blockdriveSlack.getChannels(token);
      console.log('Channels loaded:', channelList.length);
      setChannels(channelList);
    } catch (error) {
      console.error('Error loading channels:', error);
      toast.error('Failed to load Slack channels');
    }
  };

  const loadSlackFiles = async (token: string) => {
    try {
      console.log('Loading Slack files...');
      setLoading(true);
      const files = await blockdriveSlack.getFiles(token);
      console.log('Files loaded:', files.length);
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
      console.log('Uploading file to Slack:', file.name, 'to channel:', channelId);
      const result = await blockdriveSlack.uploadFileToSlack(
        accessToken,
        file,
        [channelId],
        file.name,
        `Uploaded from BlockDrive`
      );

      if (result.ok) {
        console.log('File upload successful');
        toast.success('File uploaded to Slack successfully!');
        await loadSlackFiles(accessToken);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = async (file: SlackFile) => {
    try {
      setLoading(true);
      console.log('Downloading file from Slack:', file.name);
      const blob = await blockdriveSlack.downloadFileFromSlack(accessToken, file.url_private);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('File download successful');
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
      console.log('Syncing files with Supabase...');
      await blockdriveSlack.syncSlackFiles(accessToken, 'current-user-id');
      await loadSlackFiles(accessToken);
      console.log('File sync successful');
      toast.success('Files synced successfully!');
    } catch (error) {
      console.error('Error syncing files:', error);
      toast.error('Failed to sync files');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    console.log('Disconnecting from Slack...');
    localStorage.removeItem('slack_access_token');
    setAccessToken('');
    setIsConnected(false);
    setChannels([]);
    setSlackFiles([]);
    setTeamInfo(null);
    toast.success('Disconnected from Slack');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Slack className="w-6 h-6 text-blue-500" />
            Slack Integration
            {teamInfo && (
              <span className="text-sm font-normal text-muted-foreground">
                - {teamInfo.name}
              </span>
            )}
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
