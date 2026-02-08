
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface RecentActivityProps {
  activities: { action: string; file: string; time: string; status: string }[];
}

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  return (
    <Card className="bg-card border border-border/50 rounded-xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
        <CardDescription className="text-muted-foreground">
          Your latest file operations and blockchain transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                <div className="flex items-center space-x-3">
                  <Upload className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-foreground font-medium">{activity.action}</p>
                    <p className="font-mono text-sm text-muted-foreground">{activity.file}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400">
                    {activity.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No recent activity. Start uploading files to see your activity here.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
