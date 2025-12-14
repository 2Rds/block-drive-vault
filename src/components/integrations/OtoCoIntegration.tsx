import React, { useEffect, useRef } from 'react';
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
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !scriptLoadedRef.current) {
      // Remove any existing script
      const existingScript = document.getElementById('ctaOtoCo');
      if (existingScript) {
        existingScript.remove();
      }

      // Create and load the OtoCo script
      const script = document.createElement('script');
      script.id = 'ctaOtoCo';
      script.src = 'https://widget.otoco.io/cta-button.js';
      script.setAttribute('clientid', 'jod2djmttjoxz08tl6q3q');
      script.setAttribute('theme', '2');
      script.setAttribute('buttontype', 'small');
      script.async = true;

      if (widgetContainerRef.current) {
        widgetContainerRef.current.appendChild(script);
        scriptLoadedRef.current = true;
      }
    }

    return () => {
      if (!isOpen) {
        scriptLoadedRef.current = false;
      }
    };
  }, [isOpen]);

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

          {/* OtoCo Widget container */}
          <div className="rounded-lg overflow-hidden border border-border/50 bg-background p-6 min-h-[200px] flex items-center justify-center">
            <div ref={widgetContainerRef} id="OtoCoWidget">
              <img 
                src="https://widget.otoco.io/buttons/button-small.png" 
                alt="OtoCo Widget - Click to form your company" 
                width="147" 
                height="49"
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
            </div>
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