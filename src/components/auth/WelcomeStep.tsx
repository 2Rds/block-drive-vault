
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

interface WelcomeStepProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
}

export const WelcomeStep = ({ displayName, onDisplayNameChange }: WelcomeStepProps) => {
  return (
    <>
      <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-white text-xl">Welcome to BlockDrive Wallet</h2>
      <p className="text-gray-400 text-sm mt-2">
        We need a bit of information to get started
      </p>
      
      <div className="space-y-2 mt-6">
        <Label htmlFor="displayName" className="text-gray-300">
          Display Name (Optional)
        </Label>
        <Input
          id="displayName"
          placeholder="Enter your display name"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
        />
      </div>
    </>
  );
};
