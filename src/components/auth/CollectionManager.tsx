
import React from 'react';
import { CollectionInitializer } from '@/components/CollectionInitializer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export const CollectionManager = () => {
  return (
    <Card className="bg-gray-800/40 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>Collection Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Initialize the BlockDrive soulbound NFT collection for user authentication and subdomain access.
          </p>
          <CollectionInitializer />
        </div>
      </CardContent>
    </Card>
  );
};
