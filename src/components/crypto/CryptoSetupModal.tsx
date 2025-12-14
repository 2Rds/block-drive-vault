/**
 * Crypto Setup Modal
 * 
 * Modal component for guiding users through the 3-signature setup process
 * to derive their encryption keys.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, Key, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { SecurityLevel, SECURITY_LEVEL_MESSAGES } from '@/types/blockdriveCrypto';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';
import { cn } from '@/lib/utils';

interface CryptoSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const LEVEL_INFO = {
  [SecurityLevel.STANDARD]: {
    icon: Shield,
    title: 'Standard Protection',
    description: 'For general files and documents',
    color: 'text-blue-500'
  },
  [SecurityLevel.SENSITIVE]: {
    icon: Lock,
    title: 'Sensitive Data Protection',
    description: 'For confidential information',
    color: 'text-amber-500'
  },
  [SecurityLevel.MAXIMUM]: {
    icon: Key,
    title: 'Maximum Security',
    description: 'For highly sensitive data',
    color: 'text-red-500'
  }
};

export function CryptoSetupModal({ isOpen, onClose, onComplete }: CryptoSetupModalProps) {
  const { state, initializeKeys, hasKey } = useWalletCrypto();

  const handleStartSetup = async () => {
    const success = await initializeKeys();
    if (success) {
      onComplete();
    }
  };

  const getProgress = (): number => {
    let completed = 0;
    if (hasKey(SecurityLevel.STANDARD)) completed++;
    if (hasKey(SecurityLevel.SENSITIVE)) completed++;
    if (hasKey(SecurityLevel.MAXIMUM)) completed++;
    return (completed / 3) * 100;
  };

  const levels = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Key className="w-5 h-5 text-primary" />
            Set Up Your Encryption Keys
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign 3 messages to generate your personal encryption keys. These keys never leave your device.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Progress */}
          {state.isInitializing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground">{Math.round(getProgress())}%</span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>
          )}

          {/* Security Levels */}
          <div className="space-y-3">
            {levels.map((level) => {
              const info = LEVEL_INFO[level];
              const Icon = info.icon;
              const isActive = state.currentLevel === level;
              const isComplete = hasKey(level);

              return (
                <div
                  key={level}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-all",
                    isActive && "border-primary bg-primary/5",
                    isComplete && "border-green-500/50 bg-green-500/5",
                    !isActive && !isComplete && "border-border bg-background/50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-full",
                    isComplete ? "bg-green-500/20" : "bg-muted"
                  )}>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <Icon className={cn("w-5 h-5", info.color)} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{info.title}</h4>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>

                  {isActive && (
                    <span className="text-xs text-primary font-medium">
                      Sign in wallet...
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {state.error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">How it works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Your wallet signature is used to derive encryption keys</li>
              <li>• Keys are generated client-side and never transmitted</li>
              <li>• The same wallet always generates the same keys</li>
              <li>• Only you can decrypt your files</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={state.isInitializing}>
            Cancel
          </Button>
          <Button 
            onClick={handleStartSetup} 
            disabled={state.isInitializing || state.isInitialized}
            className="bg-primary hover:bg-primary/90"
          >
            {state.isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : state.isInitialized ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Start Setup
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
