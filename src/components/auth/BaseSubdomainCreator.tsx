
import React, { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { BaseSubdomainService } from '@/services/baseSubdomainService';

interface BaseSubdomainCreatorProps {
  walletAddress: string;
  onSubdomainCreated?: (subdomain: string) => void;
}

export const BaseSubdomainCreator = ({ 
  walletAddress, 
  onSubdomainCreated 
}: BaseSubdomainCreatorProps) => {
  const [subdomainName, setSubdomainName] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const checkAvailability = async () => {
    if (!subdomainName.trim()) return;
    
    setIsChecking(true);
    try {
      const available = await BaseSubdomainService.checkSubdomainAvailability(subdomainName);
      setIsAvailable(available);
      
      if (available) {
        toast.success(`${subdomainName}.blockdrive.eth is available!`);
      } else {
        toast.error(`${subdomainName}.blockdrive.eth is not available`);
      }
    } catch (error) {
      toast.error('Failed to check availability');
    } finally {
      setIsChecking(false);
    }
  };

  const createSubdomain = async () => {
    if (!subdomainName.trim() || !isAvailable) return;
    
    setIsCreating(true);
    try {
      const result = await BaseSubdomainService.createBaseSubdomain(walletAddress, subdomainName);
      
      if (result.success && result.subdomain) {
        toast.success(`Base subdomain ${result.subdomain} created successfully!`);
        onSubdomainCreated?.(result.subdomain);
      } else {
        toast.error(result.error || 'Failed to create Base subdomain');
      }
    } catch (error) {
      toast.error('Failed to create Base subdomain');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Globe className="w-6 h-6 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Create Base Subdomain</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-sm mb-3">
            Create your Base L2 subdomain to complete 2FA setup
          </p>
          
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Enter subdomain name"
                value={subdomainName}
                onChange={(e) => {
                  setSubdomainName(e.target.value);
                  setIsAvailable(null);
                }}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Will create: {subdomainName || 'yourname'}.blockdrive.eth
              </p>
            </div>
            
            <Button
              onClick={checkAvailability}
              disabled={!subdomainName.trim() || isChecking}
              variant="outline"
              size="default"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Check'
              )}
            </Button>
          </div>
        </div>

        {isAvailable !== null && (
          <div className={`p-3 rounded-lg ${
            isAvailable 
              ? 'bg-green-900/20 border border-green-700/50' 
              : 'bg-red-900/20 border border-red-700/50'
          }`}>
            <p className={`text-sm ${isAvailable ? 'text-green-400' : 'text-red-400'}`}>
              {isAvailable 
                ? `✅ ${subdomainName}.blockdrive.eth is available!`
                : `❌ ${subdomainName}.blockdrive.eth is not available`
              }
            </p>
          </div>
        )}

        <Button
          onClick={createSubdomain}
          disabled={!isAvailable || isCreating}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Base Subdomain...
            </>
          ) : (
            'Create Base Subdomain'
          )}
        </Button>
      </div>
    </div>
  );
};
