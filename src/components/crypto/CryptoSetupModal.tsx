import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Key, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';

interface CryptoSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function CryptoSetupModal({ isOpen, onClose, onComplete }: CryptoSetupModalProps) {
  const { state, initializeKeys } = useWalletCrypto();
  const [error, setError] = useState<string | null>(null);
  const [deriving, setDeriving] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  // Short-circuit: if keys are already initialized, immediately complete
  useEffect(() => {
    if (!isOpen) return;
    if (state.isInitialized) {
      onComplete();
    }
  }, [isOpen, state.isInitialized, onComplete]);

  // Reset attempt flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasAttempted(false);
      setError(null);
    }
  }, [isOpen]);

  const deriveKeys = useCallback(async () => {
    setDeriving(true);
    setError(null);

    const result = await initializeKeys();
    if (result.success) {
      onComplete();
    } else {
      setError(result.error || 'Failed to derive encryption keys. Please try again.');
    }
    setDeriving(false);
  }, [initializeKeys, onComplete]);

  // Auto-derive once when modal opens (if keys aren't ready)
  useEffect(() => {
    if (!isOpen) return;
    if (state.isInitialized) return;
    if (hasAttempted) return;
    setHasAttempted(true);
    deriveKeys();
  }, [isOpen, state.isInitialized, hasAttempted, deriveKeys]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Key className="w-5 h-5 text-primary" />
            Unlock Your Encryption
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Your wallet signature derives your encryption keys. Keys never leave your device.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {deriving && !error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Deriving encryption keys...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground text-center">{error}</p>
              <Button variant="outline" onClick={deriveKeys}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">How it works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Your wallet signs a message to derive encryption keys</li>
            <li>Keys are derived client-side and never transmitted</li>
            <li>Files are encrypted with AES-256-GCM before upload</li>
            <li>Only you can decrypt your files</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
