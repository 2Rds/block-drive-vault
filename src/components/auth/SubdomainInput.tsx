
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface SubdomainInputProps {
  subdomainName: string;
  onSubdomainChange: (value: string) => void;
  isSubdomainAvailable: boolean | null;
}

export const SubdomainInput = ({ 
  subdomainName, 
  onSubdomainChange, 
  isSubdomainAvailable 
}: SubdomainInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="subdomainName" className="text-gray-300">
        Choose Your Subdomain
      </Label>
      <div className="flex items-center space-x-2">
        <Input
          id="subdomainName"
          placeholder="Enter subdomain name"
          value={subdomainName}
          onChange={(e) => onSubdomainChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
        />
        <div className="flex items-center">
          {isSubdomainAvailable === true && (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
          {isSubdomainAvailable === false && (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Will create: {subdomainName || '[name]'}.blockdrive.eth
      </p>
      {isSubdomainAvailable === false && (
        <p className="text-xs text-red-400">
          This subdomain is not available. Please choose another.
        </p>
      )}
    </div>
  );
};
