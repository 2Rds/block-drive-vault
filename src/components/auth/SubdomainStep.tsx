
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
      <h2 className="text-white text-xl">Create Your ENS Subdomain</h2>
      <p className="text-gray-400 text-sm mt-2">
        Create your personalized blockdrive.eth subdomain
      </p>
      
      <div className="space-y-4 mt-6">
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <h4 className="text-blue-300 font-medium mb-2">ENS Subdomain Required</h4>
          <p className="text-blue-200 text-sm">
            Ethereum users need to create a blockdrive.eth subdomain to complete their setup and access all features.
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
