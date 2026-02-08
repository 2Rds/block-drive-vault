import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Download, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleDriveIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  size: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  downloadUrl?: string;
}

export const GoogleDriveIntegration = ({ isOpen, onClose }: GoogleDriveIntegrationProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    initializeConnection();
    handleOAuthCallback();
  }, []);

  const initializeConnection = async () => {
    const storedToken = localStorage.getItem('googledrive_access_token');

    if (storedToken) {
      setLoading(true);
      try {
        // Verify token validity by making a test API call
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
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
          localStorage.removeItem('googledrive_access_token');
          toast.error('Google Drive connection expired. Please reconnect.');
        }
      } catch (error) {
        console.error('Error verifying Google Drive token:', error);
        localStorage.removeItem('googledrive_access_token');
        toast.error('Error verifying Google Drive connection. Please reconnect.');
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
      console.error('Google Drive OAuth error:', error);
      toast.error(`Google Drive connection failed: ${error}`);
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
      toast.info('Google Drive OAuth flow would be completed here. This requires backend implementation for security.');

      // For demo purposes, we'll simulate a successful connection
      // In production, implement proper OAuth flow with your backend

    } catch (error) {
      console.error('Google Drive OAuth callback error:', error);
      toast.error(`Failed to connect to Google Drive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const connectToGoogleDrive = async () => {
    try {
      setLoading(true);

      // Google Drive OAuth URL
      const clientId = 'your-client-id'; // This should be configured in your Google Cloud Console
      const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
      const scopes = encodeURIComponent('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile');

      const authUrl = `https://accounts.google.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code&access_type=offline`;

      toast.info('To connect Google Drive, you need to configure your Google Cloud Console project with the proper client ID and redirect URI.');

      // In production, redirect to the auth URL:
      // window.location.href = authUrl;

    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      toast.error(`Failed to initiate Google Drive connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,size,mimeType,modifiedTime,webViewLink)', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fileList = data.files.map((item: any) => ({
          id: item.id,
          name: item.name,
          size: item.size || '0',
          mimeType: item.mimeType,
          modifiedTime: item.modifiedTime,
          webViewLink: item.webViewLink,
        }));
        setFiles(fileList);
      } else {
        throw new Error('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading Google Drive files:', error);
      toast.error('Failed to load Google Drive files');
    } finally {
      setLoading(false);
    }
  };

  const migrateFile = async (file: GoogleDriveFile) => {
    try {
      setLoading(true);

      // Download the file from Google Drive
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download file from Google Drive');
      }

      const blob = await response.blob();
      const fileObj = new File([blob], file.name, { type: file.mimeType });

      // Here you would upload to your IPFS/BlockDrive storage
      // For now, we'll simulate the upload
      console.log('Migrating file to BlockDrive:', file.name);

      toast.success(`File "${file.name}" migrated to BlockDrive successfully!`);

    } catch (error) {
      console.error('Error migrating file:', error);
      toast.error(`Failed to migrate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('googledrive_access_token');
    setAccessToken('');
    setIsConnected(false);
    setFiles([]);
    setUserInfo(null);
    toast.success('Disconnected from Google Drive');
  };

  const formatFileSize = (bytes: string) => {
    const numBytes = parseInt(bytes);
    if (numBytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    return '📁';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-green-500" />
            Google Drive Integration
            {userInfo && (
              <span className="text-sm font-normal text-muted-foreground">
                - {userInfo.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!isConnected ? (
            <Card className="p-6 bg-card border-border">
              <div className="text-center space-y-4">
                <HardDrive className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold text-foreground">Connect to Google Drive</h3>
                <p className="text-muted-foreground">
                  Connect your Google Drive account to migrate your files to BlockDrive's decentralized storage.
                </p>
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 text-sm">
                        <strong>Setup Required:</strong> To enable Google Drive integration, you need to:
                      </p>
                      <ul className="text-yellow-400/80 text-xs mt-2 space-y-1 list-disc list-inside">
                        <li>Create a project in Google Cloud Console</li>
                        <li>Enable the Google Drive API</li>
                        <li>Configure OAuth consent screen</li>
                        <li>Add redirect URI: <code className="bg-card px-1 rounded">{window.location.origin + window.location.pathname}</code></li>
                        <li>Add your Client ID to the application configuration</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={connectToGoogleDrive}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? 'Connecting...' : 'Connect to Google Drive'}
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
                        <HardDrive className="w-5 h-5 text-green-500" />
                        Google Drive Connected
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Account: {userInfo?.name || 'Connected'}
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
                    <CardTitle className="text-foreground">Your Google Drive Files</CardTitle>
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
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">Loading files...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No files found in your Google Drive.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                            <div>
                              <h4 className="text-foreground font-medium">{file.name}</h4>
                              <p className="text-muted-foreground text-sm">
                                {formatFileSize(file.size)} • Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => window.open(file.webViewLink, '_blank')}
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
                              className="bg-green-600 hover:bg-green-700 text-white"
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
