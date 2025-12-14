import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, ExternalLink, Shield, Zap } from 'lucide-react';

interface OtoCoIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OtoCoIntegration: React.FC<OtoCoIntegrationProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-card border-border">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Building2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                OtoCo - Onchain Company Formation
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Instantly spin up an onchain LLC without leaving BlockDrive
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-border/50">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Instant Setup</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-border/50">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Legal Protection</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-border/50">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Onchain Registry</span>
            </div>
          </div>

          {/* OtoCo Widget iframe */}
          <div className="rounded-lg overflow-hidden border border-border/50 bg-background">
            <iframe
              title="OtoCo Company Formation"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              src="https://widget.otoco.io/?clientid=jod2djmttjoxz08tl6q3q&theme=2"
              width="100%"
              height="500"
              allowTransparency={true}
              frameBorder={0}
              style={{ 
                backgroundColor: 'transparent', 
                colorScheme: 'light dark',
                display: 'block'
              }}
            />
          </div>

          {/* Footer with external link */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Powered by OtoCo - Decentralized company formation
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => window.open('https://otoco.io', '_blank')}
            >
              Learn more
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
