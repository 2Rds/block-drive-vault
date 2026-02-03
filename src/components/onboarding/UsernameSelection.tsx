/**
 * Username Selection Component
 *
 * Allows users to select their BlockDrive username during onboarding.
 * Mints a compressed NFT on Solana representing {username}.blockdrive.sol
 */

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUsernameNFT } from '@/hooks/useUsernameNFT';
import { CheckCircle2, XCircle, Loader2, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UsernameSelectionProps {
  onComplete?: (username: string, fullDomain: string) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function UsernameSelection({ onComplete, onSkip, showSkip = false }: UsernameSelectionProps) {
  const {
    hasUsernameNFT,
    username: existingUsername,
    fullDomain: existingDomain,
    isMinting,
    checkAvailability,
    mintUsername,
  } = useUsernameNFT();

  const [inputValue, setInputValue] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    checked: boolean;
    available: boolean;
    error?: string;
  }>({ checked: false, available: false });

  // Debounced availability check
  useEffect(() => {
    if (!inputValue || inputValue.length < 3) {
      setAvailability({ checked: false, available: false });
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      const result = await checkAvailability(inputValue);
      setAvailability({
        checked: true,
        available: result.available,
        error: result.error,
      });
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, checkAvailability]);

  const handleMint = useCallback(async () => {
    if (!availability.available || !inputValue) return;

    const result = await mintUsername(inputValue);

    if (result.success) {
      toast.success(`Successfully claimed ${inputValue}.blockdrive.sol!`);
      if (onComplete) {
        onComplete(inputValue, `${inputValue}.blockdrive.sol`);
      }
    } else {
      toast.error(result.error || 'Failed to mint username NFT');
    }
  }, [availability.available, inputValue, mintUsername, onComplete]);

  // If user already has a username NFT, show it
  if (hasUsernameNFT && existingUsername) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-card border border-border rounded-xl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Username Claimed!</h2>
          <p className="text-muted-foreground">
            You've already claimed your BlockDrive username
          </p>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-lg font-mono font-semibold text-primary">
              {existingDomain}
            </p>
          </div>
          {onComplete && (
            <Button onClick={() => onComplete(existingUsername, existingDomain!)} className="w-full">
              Continue
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-card border border-border rounded-xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Choose Your Username</h2>
          <p className="text-muted-foreground text-sm">
            Claim your unique BlockDrive identity as an NFT on Solana
          </p>
        </div>

        {/* Username Input */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="pr-10"
              maxLength={20}
              disabled={isMinting}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isChecking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              {!isChecking && availability.checked && availability.available && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              {!isChecking && availability.checked && !availability.available && (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
          </div>

          {/* Preview Domain */}
          {inputValue && inputValue.length >= 3 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Your domain: </span>
              <span className="font-mono font-medium text-primary">
                {inputValue}.blockdrive.sol
              </span>
            </div>
          )}

          {/* Availability Status */}
          {availability.checked && (
            <p className={`text-sm ${availability.available ? 'text-green-500' : 'text-destructive'}`}>
              {availability.available
                ? '✓ Username is available!'
                : availability.error || 'Username is not available'}
            </p>
          )}

          {/* Requirements */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• 3-20 characters</p>
            <p>• Letters, numbers, and underscores only</p>
          </div>
        </div>

        {/* NFT Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4 text-primary" />
            <span>Your Username NFT</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Compressed NFT on Solana (low cost)</li>
            <li>• Proves ownership of your BlockDrive identity</li>
            <li>• Can be transferred or sold</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleMint}
            disabled={!availability.available || isMinting || isChecking}
            className="w-full"
          >
            {isMinting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Minting NFT...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Claim Username
              </>
            )}
          </Button>

          {showSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip} className="w-full" disabled={isMinting}>
              Skip for now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsernameSelection;
