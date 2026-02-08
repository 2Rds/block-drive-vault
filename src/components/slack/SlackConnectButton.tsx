
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slack } from 'lucide-react';

interface SlackConnectButtonProps {
  loading: boolean;
  onConnect: () => void;
}

export const SlackConnectButton = ({ loading, onConnect }: SlackConnectButtonProps) => {
  return (
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
          onClick={onConnect}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Connecting...' : 'Connect to Slack'}
        </Button>
      </div>
    </Card>
  );
};
