
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BoxConnectionStatusProps {
  isConnected: boolean;
  onDisconnect: () => void;
}

export const BoxConnectionStatus = ({ isConnected, onDisconnect }: BoxConnectionStatusProps) => {
  if (!isConnected) return null;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-foreground">Connected to Box</span>
        </div>
        <Button 
          variant="outline" 
          onClick={onDisconnect}
          className="bg-card border-border text-foreground hover:bg-muted"
        >
          Disconnect
        </Button>
      </div>
    </Card>
  );
};
