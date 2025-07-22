import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface WalletEmailLinkerProps {
  onSuccess?: () => void;
}

export const WalletEmailLinker = ({ onSuccess }: WalletEmailLinkerProps) => {
  const { user, walletData } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLinkWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !walletData?.wallet_address || !user) {
      toast.error('Missing required information');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Linking wallet to email:', {
        email,
        wallet_address: walletData.wallet_address,
        blockchain_type: walletData.blockchain_type,
        userId: user.id
      });

      const { data, error } = await supabase.functions.invoke('link-wallet-to-email', {
        body: {
          email,
          wallet_address: walletData.wallet_address,
          blockchain_type: walletData.blockchain_type || 'ethereum'
        },
        headers: {
          Authorization: `Bearer ${user.id}`
        }
      });

      if (error) {
        console.error('Error linking wallet:', error);
        toast.error('Failed to link wallet to email');
        return;
      }

      if (data?.success) {
        toast.success('Wallet successfully linked to your email!');
        onSuccess?.();
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }

    } catch (error) {
      console.error('Error linking wallet:', error);
      toast.error('Failed to link wallet to email');
    } finally {
      setLoading(false);
    }
  };

  if (!walletData?.wallet_address) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Link Wallet to Email</CardTitle>
        <CardDescription>
          Link your wallet to the email address you used for your Stripe subscription to access your file upload features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLinkWallet} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Your Wallet Address</label>
            <Input 
              value={walletData.wallet_address} 
              disabled 
              className="text-sm text-muted-foreground"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              placeholder="Enter the email you used for Stripe"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              This should be the same email you used when purchasing your subscription through Stripe.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !email}
          >
            {loading ? 'Linking...' : 'Link Wallet to Email'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};