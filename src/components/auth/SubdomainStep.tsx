
import React from 'react';
import { Globe } from 'lucide-react';
import { SubdomainInput } from './SubdomainInput';

interface SubdomainStepProps {
  subdomainName: string;
  onSubdomainChange: (value: string) => void;
  isSubdomainAvailable: boolean | null;
}

export const SubdomainStep = ({ 
  subdomainName, 
  onSubdomainChange, 
  isSubdomainAvailable 
}: SubdomainStepProps) => {
  return (
    <>
      <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
        <Globe className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-white text-xl">Create Your BlockDrive Subdomain</h2>
      <p className="text-gray-400 text-sm mt-2">
        Create your personalized BlockDrive subdomain for full 2FA access
      </p>
      
      <div className="space-y-4 mt-6">
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <h4 className="text-blue-300 font-medium mb-2">Subdomain Required for All Users</h4>
          <p className="text-blue-200 text-sm">
            Both Ethereum and Solana users need to create a BlockDrive subdomain as the second factor of our 2FA system. 
            This works alongside your NFT authentication for maximum security.
          </p>
        </div>
        
        <SubdomainInput
          subdomainName={subdomainName}
          onSubdomainChange={onSubdomainChange}
          isSubdomainAvailable={isSubdomainAvailable}
        />
      </div>
    </>
  );
};
