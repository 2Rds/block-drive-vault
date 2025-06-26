
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

export const ENSSubdomainCreator = () => {
  const [subdomain, setSubdomain] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const { primaryWallet } = useDynamicContext();

  const checkSubdomainAvailability = async (subdomainName: string) => {
    if (!subdomainName || subdomainName.length < 3) {
      setIsAvailable(null);
      return;
    }

    try {
      // Simulate availability check - in production this would call your ENS resolver
      const available = !['test', 'admin', 'api', 'www'].includes(subdomainName.toLowerCase());
      setIsAvailable(available);
    } catch (error) {
      console.error('Error checking subdomain availability:', error);
      setIsAvailable(false);
    }
  };

  const createENSSubdomain = async () => {
    if (!primaryWallet || !subdomain || isAvailable === false) return;

    setIsCreating(true);
    try {
      // In production, this would call Dynamic's ENS subdomain creation function
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`ENS subdomain ${subdomain}.blockdrive.eth created successfully!`);
      
      // Store the subdomain association
      localStorage.setItem('ens-subdomain', `${subdomain}.blockdrive.eth`);
      
    } catch (error) {
      console.error('Error creating ENS subdomain:', error);
      toast.error('Failed to create ENS subdomain. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  React.useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (subdomain) {
        checkSubdomainAvailability(subdomain);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [subdomain]);

  if (!primaryWallet || primaryWallet.chain === 'SOL') {
    return null;
  }

  return (
    <Card className="bg-gray-800/40 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Globe className="w-5 h-5 text-blue-400" />
          <span>Create Your ENS Subdomain</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              placeholder="Enter subdomain name"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Will create: {subdomain || '[name]'}.blockdrive.eth
            </p>
          </div>
          <div className="flex items-center">
            {isAvailable === true && (
              <Check className="w-5 h-5 text-green-400" />
            )}
            {isAvailable === false && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>
        
        <Button
          onClick={createENSSubdomain}
          disabled={!subdomain || isAvailable !== true || isCreating}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isCreating ? 'Creating...' : 'Create ENS Subdomain'}
        </Button>
        
        {isAvailable === false && (
          <p className="text-xs text-red-400">
            This subdomain is not available. Please choose another.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
