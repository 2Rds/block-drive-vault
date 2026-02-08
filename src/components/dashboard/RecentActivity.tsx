
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface RecentActivityProps {
  activities: { action: string; file: string; time: string; status: string }[];
}

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  return (
    <Card className="bg-gray-800/40 border-gray-700/50">
      <CardHeader>
        <CardTitle className="text-white">Recent Activity</CardTitle>
        <CardDescription className="text-gray-400">
          Your latest file operations and blockchain transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                <div className="flex items-center space-x-3">
                  <Upload className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-gray-400 text-sm">{activity.file}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">{activity.time}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400">
                    {activity.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              No recent activity. Start uploading files to see your activity here.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
