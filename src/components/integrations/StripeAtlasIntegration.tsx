import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Briefcase, ExternalLink, Shield, Globe, CreditCard } from 'lucide-react';

interface StripeAtlasIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StripeAtlasIntegration: React.FC<StripeAtlasIntegrationProps> = ({ isOpen, onClose }) => {
  const handleGetStarted = () => {
    window.open('https://stripe.com/atlas', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Briefcase className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Stripe Atlas
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Form a Delaware C-Corp with integrated Stripe payments
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/5 border border-border/50 text-center">
              <Globe className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Delaware C-Corp</span>
              <span className="text-xs text-muted-foreground">US incorporation</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/5 border border-border/50 text-center">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Stripe Payments</span>
              <span className="text-xs text-muted-foreground">Pre-integrated</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/5 border border-border/50 text-center">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Banking Ready</span>
              <span className="text-xs text-muted-foreground">SVB, Mercury & more</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">What's included:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                Delaware C-Corp formation with registered agent for one year
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                IRS EIN (Tax ID) filing and 83(b) election filing
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                Customizable legal documents and cap table tools
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                Partner perks worth over $100,000 in credits
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">One-time fee</p>
                <p className="text-sm text-muted-foreground">Complete incorporation package</p>
              </div>
              <p className="text-2xl font-bold text-violet-500">$500</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleGetStarted}
              className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
            >
              Get Started with Atlas
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
