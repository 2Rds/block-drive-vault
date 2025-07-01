
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PricingHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-white mb-4">
          Choose Your BlockDrive Plan
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Secure, decentralized storage with blockchain authentication. 
          Pick the plan that fits your needs.
        </p>
      </div>
    </>
  );
};
