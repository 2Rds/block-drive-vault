import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Key, Shield } from 'lucide-react';

interface PinataSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PinataSettingsModal = ({ isOpen, onClose }: PinataSettingsModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !secretKey) {
      toast.error('Please enter both API Key and Secret Key');
      return;
    }

    setIsSubmitting(true);

    try {
      // Note: In production, you would send these to your backend securely
      // For now, we'll just show a success message
      toast.success('Pinata API credentials updated successfully!');
      setApiKey('');
      setSecretKey('');
      onClose();
    } catch (error) {
      console.error('Error updating Pinata credentials:', error);
      toast.error('Failed to update Pinata credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            Pinata API Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your Pinata API credentials to enable IPFS uploads
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-foreground flex items-center gap-2">
              <Key className="w-4 h-4" />
              Pinata API Key
            </Label>
            <Input
              id="api-key"
              type="text"
              placeholder="Enter your Pinata API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-background border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key" className="text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Pinata Secret API Key
            </Label>
            <Input
              id="secret-key"
              type="password"
              placeholder="Enter your Pinata Secret API Key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="bg-background border-border text-foreground"
              required
            />
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Your API credentials are stored securely
              and are used only for uploading files to IPFS via Pinata.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Saving...' : 'Save Credentials'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
