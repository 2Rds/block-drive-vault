import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Link, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import { BaseRegistryService } from '@/services/baseRegistryService';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

export const BaseRegistryConnector = () => {
  const [registrarAddress, setRegistrarAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { primaryWallet } = useDynamicContext();

  const connectRegistrarToRegistry = async () => {
    if (!primaryWallet || !registrarAddress) {
      toast.error('Please connect wallet and enter registrar address');
      return;
    }

    if (!ethers.utils.isAddress(registrarAddress)) {
      toast.error('Please enter a valid registrar address');
      return;
    }

    setIsConnecting(true);
    try {
      const result = await BaseRegistryService.connectRegistrarToRegistry(
        registrarAddress,
        primaryWallet
      );

      if (result.success) {
        setIsConnected(true);
        toast.success('L2 Registrar successfully connected to L2 Registry!');
      } else {
        toast.error(result.error || 'Failed to connect registrar');
      }
    } catch (error) {
      console.error('Error connecting registrar:', error);
      toast.error('Failed to connect registrar to registry');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="bg-gray-800/40 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Globe className="w-5 h-5 text-blue-400" />
          <span>Connect L2 Registrar to Base Registry</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <h4 className="text-blue-300 font-medium mb-2">Registry Configuration</h4>
          <div className="space-y-2 text-sm">
            <p className="text-blue-200">
              <strong>Registry Address:</strong> 0xb40eb0c9edd1ccf5305dccf7da92291f8059d947
            </p>
            <p className="text-blue-200">
              <strong>Resolver Address:</strong> 0x253e86cb173de2e6ef8f160697f5b7621c135f8bcb248c31bca065da48b94e84
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-gray-300 text-sm">L2 Registrar Address</label>
          <Input
            placeholder="Enter your deployed L2 registrar address"
            value={registrarAddress}
            onChange={(e) => setRegistrarAddress(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        <Button
          onClick={connectRegistrarToRegistry}
          disabled={!registrarAddress || isConnecting || isConnected}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isConnecting && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          )}
          {isConnected ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Connected Successfully
            </>
          ) : (
            <>
              <Link className="w-4 h-4 mr-2" />
              Connect Registrar to Registry
            </>
          )}
        </Button>

        {isConnected && (
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-300 font-medium">Connection Complete!</p>
            </div>
            <p className="text-green-200 text-sm mt-1">
              Your L2 registrar is now connected to the Base registry. Users can now register blockdrive.eth subdomains.
            </p>
          </div>
        )}

        <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
          <h4 className="text-gray-300 font-medium mb-2">Next Steps</h4>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Deploy your L2 registrar contract</li>
            <li>• Enter the registrar address above</li>
            <li>• Click "Connect Registrar to Registry"</li>
            <li>• Users can now register blockdrive.eth subdomains on Base</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
