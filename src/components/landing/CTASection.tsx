import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DynamicConnectButton } from '@/components/auth/DynamicConnectButton';

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 mb-8">
          <Zap className="h-4 w-4 text-primary mr-2" />
          <span className="text-sm font-medium text-primary">Start Building Today</span>
        </div>

        <h2 className="text-5xl font-bold text-foreground mb-6">
          Ready to revolutionize your 
          <br />
          <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            data management?
          </span>
        </h2>

        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Join thousands of developers already building the future with BlockDrive. 
          Start with a 7-day free trial and scale as you grow.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <div className="flex justify-center">
            <DynamicConnectButton onConnectClick={() => {}} />
          </div>
          <Button 
            variant="outline" 
            size="lg" 
            className="text-lg px-10 py-6"
            onClick={() => navigate('/pricing')}
          >
            View Pricing Plans
          </Button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          7-day free trial available • No commitment • Cancel anytime
        </div>
      </div>
    </section>
  );
};