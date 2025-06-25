
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { blockdriveSlack, SlackChannel, SlackFile } from '@/services/blockdrive_slack';
import { toast } from 'sonner';
import { Slack, Upload, Download, RefreshCw } from 'lucide-react';

interface SlackIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackIntegration = ({ isOpen, onClose }: SlackIntegrationProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [slackFiles, setSlackFiles] = useState<SlackFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedChannel || !accessToken) {
      toast.error('Please select a file and channel');
      return;
    }

    try {
      setLoading(true);
      const result = await blockdriveSlack.uploadFileToSlack(
        accessToken,
        selectedFile,
        [selectedChannel],
        selectedFile.name
      );

      if (result.ok) {
        toast.success('File uploaded to Slack successfully!');
        await loadSlackFiles(accessToken);
        setSelectedFile(null);
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
            <Card className="p-6 bg-gray-800 border-gray-700">
              <div className="text-center space-y-4">
                <Slack className="w-16 h-16 text-blue-500 mx-auto" />
                <h3 className="text-xl font-semibold text-white">Connect to Slack</h3>
                <p className="text-gray-400">
                  Connect your Slack workspace to share files seamlessly between BlockDrive and Slack channels.
                </p>
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <p className="text-yellow-400 text-sm">
                    <strong>Setup Required:</strong> Make sure to add the following redirect URI to your Slack app settings:
                  </p>
                  <code className="block mt-2 p-2 bg-gray-800 rounded text-green-400 text-xs">
                    {window.location.origin + window.location.pathname}
                  </code>
                  <p className="text-yellow-400 text-xs mt-2">
                    Go to your Slack app settings → OAuth & Permissions → Redirect URLs
                  </p>
                </div>
                <Button 
                  onClick={connectToSlack}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? 'Connecting...' : 'Connect to Slack'}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Connection Status */}
              <Card className="p-4 bg-gray-800 border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-white">Connected to Slack</span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={disconnect}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    Disconnect
                  </Button>
                </div>
              </Card>

              {/* File Upload Section */}
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
                    onClick={handleFileUpload}
                    disabled={!selectedFile || !selectedChannel || loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload to Slack
                  </Button>
                </div>
              </Card>

              {/* Slack Files Section */}
              <Card className="p-6 bg-gray-800 border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Slack Files</h3>
                  <Button 
                    onClick={syncFiles}
                    disabled={loading}
                    variant="outline"
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Files
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {slackFiles.map((file) => (
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
                        onClick={() => handleFileDownload(file)}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {slackFiles.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No files found in your Slack workspace</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
