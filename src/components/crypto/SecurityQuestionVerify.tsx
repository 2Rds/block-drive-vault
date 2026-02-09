import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2 } from 'lucide-react';
import { sha256 } from '@/services/crypto/cryptoUtils';
import { stringToBytes } from '@/services/crypto/cryptoUtils';

interface SecurityQuestionVerifyProps {
  question: string;
  onVerified: (answerHash: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function SecurityQuestionVerify({
  question,
  onVerified,
  isLoading = false,
  error: externalError = null,
}: SecurityQuestionVerifyProps) {
  const [answer, setAnswer] = useState('');
  const [isHashing, setIsHashing] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    setIsHashing(true);
    try {
      const normalized = answer.trim().toLowerCase();
      const hash = await sha256(stringToBytes(normalized));
      onVerified(hash);
    } finally {
      setIsHashing(false);
    }
  };

  const busy = isLoading || isHashing;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Unlock Your Encryption</h3>
          <p className="text-sm text-muted-foreground">
            Answer your security question to derive your encryption keys.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm font-medium text-foreground">{question}</p>
        </div>

        <div className="space-y-2">
          <Label>Your Answer</Label>
          <Input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer..."
            disabled={busy}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>
      </div>

      {externalError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{externalError}</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={busy || !answer.trim()}
        className="w-full"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Unlocking...
          </>
        ) : (
          'Unlock'
        )}
      </Button>
    </div>
  );
}
