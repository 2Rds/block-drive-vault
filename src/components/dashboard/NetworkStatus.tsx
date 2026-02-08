import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const NetworkStatus = () => {
  return (
    <Card className="bg-card border border-border/50 rounded-xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Network Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="font-mono text-sm text-foreground">All Systems Operational</span>
        </div>
      </CardContent>
    </Card>
  );
};
