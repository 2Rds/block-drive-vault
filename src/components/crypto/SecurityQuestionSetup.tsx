import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

const PRESET_QUESTIONS = [
  'What is the name of your first pet?',
  'What city were you born in?',
  'What was your childhood nickname?',
  'What is the name of your favorite teacher?',
  'What is the make of your first car?',
];

interface SecurityQuestionSetupProps {
  onComplete: () => void;
}

export function SecurityQuestionSetup({ onComplete }: SecurityQuestionSetupProps) {
  const { supabase } = useClerkAuth();
  const [question, setQuestion] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveQuestion = question === 'custom' ? customQuestion : question;

  const handleSubmit = async () => {
    if (!effectiveQuestion || !answer.trim()) {
      setError('Please select a question and provide an answer');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('security-question', {
        body: { action: 'setup', question: effectiveQuestion, answer: answer.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to set security question');

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set security question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Set Up Security Question</h3>
          <p className="text-sm text-muted-foreground">
            Your answer unlocks your encryption keys each session.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Security Question</Label>
          <Select value={question} onValueChange={setQuestion}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a question..." />
            </SelectTrigger>
            <SelectContent>
              {PRESET_QUESTIONS.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
              <SelectItem value="custom">Write my own question...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {question === 'custom' && (
          <div className="space-y-2">
            <Label>Custom Question</Label>
            <Input
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Enter your custom security question..."
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Answer</Label>
          <Input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer (case-insensitive)"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <p className="text-xs text-muted-foreground">
            Remember this answer exactly — you'll need it each time you open BlockDrive.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !effectiveQuestion || !answer.trim()}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Set Security Question'
        )}
      </Button>
    </div>
  );
}
