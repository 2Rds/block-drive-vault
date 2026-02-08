
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
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="text-center mb-16">
        {/* Overline */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700/50 bg-zinc-900/50 backdrop-blur-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-medium text-zinc-400 tracking-wider uppercase">
            Simple, transparent pricing
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight">
          One plan. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Infinite security.</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Every plan includes Programmed Incompleteness, blockchain authentication,
          and storage where breached data is worthless. Pick your scale.
        </p>
      </div>
    </>
  );
};
