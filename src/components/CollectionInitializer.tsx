
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { MetaplexNFTService } from '@/services/metaplexNFTService';

export const CollectionInitializer = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [collectionAddress, setCollectionAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createCollection = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      console.log('Initializing BlockDrive NFT Collection...');
      
      const result = await MetaplexNFTService.initializeBlockDriveCollection();
      
      if (result.success && result.collection) {
        setCollectionAddress(result.signature || 'Unknown');
        toast.success('🎉 BlockDrive NFT Collection created successfully!');
        console.log('Collection Address:', result.signature);
      } else {
        setError(result.error || 'Failed to create collection');
        toast.error('Failed to create NFT collection');
      }
    } catch (error: any) {
      console.error('Collection creation error:', error);
      setError(error.message);
      toast.error('Failed to create NFT collection');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="bg-gray-800/40 border-gray-700 max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Zap className="w-5 h-5 text-purple-400" />
          <span>BlockDrive NFT Collection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!collectionAddress && !error && (
          <div className="text-center space-y-4">
            <p className="text-gray-300 text-sm">
              Create the official BlockDrive soulbound NFT collection on Solana
            </p>
            <Button
              onClick={createCollection}
              disabled={isCreating}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isCreating ? 'Creating Collection...' : 'Create NFT Collection'}
            </Button>
          </div>
        )}

        {collectionAddress && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">Collection Created!</span>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Collection Address:</p>
              <p className="text-white font-mono text-sm break-all">{collectionAddress}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(collectionAddress);
                toast.success('Collection address copied to clipboard');
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Copy Address
            </Button>
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-300 text-sm">{error}</p>
            <Button
              onClick={createCollection}
              disabled={isCreating}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Retry Creation
            </Button>
          </div>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-gray-400">
            Using BlockDrive logo: 
            <br />
            <span className="text-purple-300">pbs.twimg.com/profile_images/...</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
