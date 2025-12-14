import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scale, ExternalLink, FileText, Users, Rocket } from 'lucide-react';

interface ClerkyIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClerkyIntegration: React.FC<ClerkyIntegrationProps> = ({ isOpen, onClose }) => {
  const handleGetStarted = () => {
    window.open('https://www.clerky.com', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Scale className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Clerky
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Legal paperwork for startups, built by lawyers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/5 border border-border/50 text-center">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Legal Docs</span>
              <span className="text-xs text-muted-foreground">VC-standard</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/5 border border-border/50 text-center">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Hiring</span>
              <span className="text-xs text-muted-foreground">Equity & contracts</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/5 border border-border/50 text-center">
              <Rocket className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Fundraising</span>
              <span className="text-xs text-muted-foreground">SAFE & Series A</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Services available:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                Delaware incorporation with standard startup documents
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                Employee and contractor agreements with equity
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                SAFE notes and convertible instruments for fundraising
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                Series A preferred stock financing documents
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                Board consents, resolutions, and corporate housekeeping
              </li>
            </ul>
          </div>

          {/* Trust badge */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-foreground">
              <span className="font-medium">Trusted by thousands of startups</span> — 
              Clerky's legal documents are used by Y Combinator companies and reviewed by top VC law firms.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleGetStarted}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
            >
              Get Started with Clerky
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
