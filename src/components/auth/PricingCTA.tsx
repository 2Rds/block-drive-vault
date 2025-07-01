
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PricingButton } from '@/components/PricingButton';
import { Check } from 'lucide-react';

export const PricingCTA: React.FC = () => {
  return (
    <Card className="bg-gray-800/40 border-gray-700/50 mt-8">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-white">Choose Your Plan</CardTitle>
        <CardDescription className="text-gray-300">
          Start with our free trial or explore our premium features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-white font-medium">Free Trial Includes:</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Basic secure storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Blockchain authentication
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                File encryption
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-white font-medium">Premium Features:</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Unlimited storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Team collaboration
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Priority support
              </li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-center pt-4">
          <PricingButton size="lg">
            View All Plans & Pricing
          </PricingButton>
        </div>
      </CardContent>
    </Card>
  );
};
