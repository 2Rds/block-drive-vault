
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Box } from 'lucide-react';

interface BoxConnectButtonProps {
  loading: boolean;
  onConnect: () => void;
}

export const BoxConnectButton = ({ loading, onConnect }: BoxConnectButtonProps) => {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="text-center space-y-4">
        <Box className="w-16 h-16 text-blue-600 mx-auto" />
        <h3 className="text-xl font-semibold text-foreground">Connect to Box</h3>
        <p className="text-muted-foreground">
          Connect your Box account to easily migrate files to BlockDrive and access your cloud storage.
        </p>
        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-4">
          <p className="text-yellow-400 text-sm">
            <strong>Setup Required:</strong> To connect Box, you'll need to configure OAuth credentials in your Box developer console.
          </p>
          <p className="text-yellow-400 text-xs mt-2">
            Visit Box Developer Console → Create App → OAuth 2.0 (Server Authentication)
          </p>
        </div>
        <Button 
          onClick={onConnect}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Connecting...' : 'Connect to Box'}
        </Button>
      </div>
    </Card>
  );
};
