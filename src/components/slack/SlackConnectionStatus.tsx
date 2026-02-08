
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SlackConnectionStatusProps {
  isConnected: boolean;
  onDisconnect: () => void;
}

export const SlackConnectionStatus = ({ isConnected, onDisconnect }: SlackConnectionStatusProps) => {
  if (!isConnected) return null;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-foreground">Connected to Slack</span>
        </div>
        <Button
          variant="outline"
          onClick={onDisconnect}
          className="bg-muted border-border text-foreground hover:bg-muted/80"
        >
          Disconnect
        </Button>
      </div>
    </Card>
  );
};
