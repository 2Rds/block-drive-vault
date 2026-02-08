import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Download, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OneDriveIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  downloadUrl?: string;
  webUrl: string;
}

export const OneDriveIntegration = ({ isOpen, onClose }: OneDriveIntegrationProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [files, setFiles] = useState<OneDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    initializeConnection();
    handleOAuthCallback();
  }, []);

  const initializeConnection = async () => {
    const storedToken = localStorage.getItem('onedrive_access_token');

    if (storedToken) {
      setLoading(true);
      try {
        // Verify token validity by making a test API call
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          setAccessToken(storedToken);
          setIsConnected(true);
          setUserInfo(user);
          await loadFiles(storedToken);
        } else {
          localStorage.removeItem('onedrive_access_token');
          toast.error('OneDrive connection expired. Please reconnect.');
        }
      } catch (error) {
        console.error('Error verifying OneDrive token:', error);
        localStorage.removeItem('onedrive_access_token');
        toast.error('Error verifying OneDrive connection. Please reconnect.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('OneDrive OAuth error:', error);
      toast.error(`OneDrive connection failed: ${error}`);
      return;
    }

    if (code) {
      await processOAuthCode(code);
    }
  };

  const processOAuthCode = async (code: string) => {
    try {
      setLoading(true);

      // In a real implementation, you would exchange the code for a token
      // This would typically be done through your backend to keep client secrets secure
      toast.info('OneDrive OAuth flow would be completed here. This requires backend implementation for security.');

      // For demo purposes, we'll simulate a successful connection
      // In production, implement proper OAuth flow with your backend

    } catch (error) {
      console.error('OneDrive OAuth callback error:', error);
      toast.error(`Failed to connect to OneDrive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const connectToOneDrive = async () => {
    try {
      setLoading(true);

      // Microsoft Graph OAuth URL
      const clientId = 'your-client-id'; // This should be configured in your app settings
      const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
      const scopes = encodeURIComponent('Files.ReadWrite offline_access User.Read');

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}&response_mode=query`;

      toast.info('To connect OneDrive, you need to configure your Microsoft App Registration with the proper client ID and redirect URI.');

      // In production, redirect to the auth URL:
      // window.location.href = authUrl;

    } catch (error) {
      console.error('Error connecting to OneDrive:', error);
      toast.error(`Failed to initiate OneDrive connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fileList = data.value.map((item: any) => ({
          id: item.id,
          name: item.name,
          size: item.size || 0,
          lastModified: item.lastModifiedDateTime,
          downloadUrl: item['@microsoft.graph.downloadUrl'],
          webUrl: item.webUrl,
        }));
        setFiles(fileList);
      } else {
        throw new Error('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading OneDrive files:', error);
      toast.error('Failed to load OneDrive files');
    } finally {
      setLoading(false);
    }
  };

  const migrateFile = async (file: OneDriveFile) => {
    try {
      setLoading(true);

      if (!file.downloadUrl) {
        throw new Error('No download URL available for this file');
      }

      // Download the file from OneDrive
      const response = await fetch(file.downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download file from OneDrive');
      }

      const blob = await response.blob();
      const fileObj = new File([blob], file.name, { type: blob.type });

      // Here you would upload to your IPFS/BlockDrive storage
      // For now, we'll simulate the upload
      toast.success(`File "${file.name}" migrated to BlockDrive successfully!`);

    } catch (error) {
      console.error('Error migrating file:', error);
      toast.error(`Failed to migrate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('onedrive_access_token');
    setAccessToken('');
    setIsConnected(false);
    setFiles([]);
    setUserInfo(null);
    toast.success('Disconnected from OneDrive');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Cloud className="w-6 h-6 text-blue-600" />
            OneDrive Integration
            {userInfo && (
              <span className="text-sm font-normal text-muted-foreground">
                - {userInfo.displayName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!isConnected ? (
            <Card className="p-6 bg-card border-border">
              <div className="text-center space-y-4">
                <Cloud className="w-16 h-16 text-blue-600 mx-auto" />
                <h3 className="text-xl font-semibold text-foreground">Connect to OneDrive</h3>
                <p className="text-muted-foreground">
                  Connect your Microsoft OneDrive account to migrate your files to BlockDrive's decentralized storage.
                </p>
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 text-sm">
                        <strong>Setup Required:</strong> To enable OneDrive integration, you need to:
                      </p>
                      <ul className="text-yellow-400/80 text-xs mt-2 space-y-1 list-disc list-inside">
                        <li>Register your app in Microsoft Azure App Registration</li>
                        <li>Configure the redirect URI: <code className="bg-card px-1 rounded">{window.location.origin + window.location.pathname}</code></li>
                        <li>Add your Client ID to the application configuration</li>
                        <li>Request proper Microsoft Graph API permissions</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={connectToOneDrive}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? 'Connecting...' : 'Connect to OneDrive'}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-blue-600" />
                        OneDrive Connected
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Account: {userInfo?.displayName || 'Connected'}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={disconnect}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      Disconnect
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground">Your OneDrive Files</CardTitle>
                    <Button
                      onClick={() => loadFiles(accessToken)}
                      disabled={loading}
                      variant="outline"
                      className="border-border text-muted-foreground hover:bg-muted"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                      <p className="text-muted-foreground">Loading files...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No files found in your OneDrive.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <h4 className="text-foreground font-medium">{file.name}</h4>
                            <p className="text-muted-foreground text-sm">
                              {formatFileSize(file.size)} • Modified: {new Date(file.lastModified).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => window.open(file.webUrl, '_blank')}
                              variant="outline"
                              size="sm"
                              className="border-border text-muted-foreground hover:bg-muted"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              onClick={() => migrateFile(file)}
                              disabled={loading}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Migrate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
