
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { BaseAuthService } from '@/services/baseAuthService';

export const CollectionInitializer = () => {
  const handleInitializeCollection = () => {
    // Redirect to Base soulbound NFT mint instead of creating collection
    BaseAuthService.redirectToSoulboundNFTMint();
    toast.info('Redirected to Base soulbound NFT launchpad');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Initialize Base Authentication</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Set up Base L2 soulbound NFT authentication for BlockDrive access.
          </p>
          <Button 
            onClick={handleInitializeCollection}
            className="w-full"
          >
            Mint Base Soulbound NFT
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
