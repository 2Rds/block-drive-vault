// Stub - EmailWalletMatcher deprecated with Clerk auth
import React from 'react';

interface EmailWalletMatcherProps {
  onSuccess?: () => void;
}

export const EmailWalletMatcher = ({ onSuccess }: EmailWalletMatcherProps) => {
  // This component is deprecated with Clerk authentication
  return null;
};

  const linkWalletToEmail = async (email: string) => {
    if (!walletData?.wallet_address || !user) {
      toast.error('Wallet not connected');
      return;
    }

    setLinking(true);
    
    try {
      const { error } = await supabase.functions.invoke('link-wallet-to-email', {
        body: {
          email,
          wallet_address: walletData.wallet_address,
          blockchain_type: walletData.blockchain_type || 'ethereum',
          fullName: user.user_metadata?.full_name,
          username: user.user_metadata?.username
        },
        headers: {
          Authorization: `Bearer ${user.id}`
        }
      });

      if (error) {
        toast.error('Failed to link wallet to email');
        return;
      }

      toast.success('Successfully linked wallet to email registration!');
      onSuccess?.();

    } catch (error) {
      console.error('Error linking wallet:', error);
      toast.error('Failed to link wallet to email');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3">Finding your registration...</span>
        </CardContent>
      </Card>
    );
  }

  if (emailRegistrations.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            No Available Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            No email registrations found that can be linked to your wallet. 
            Please register first with your email through our pricing page.
          </p>
          <Button onClick={() => window.open('/pricing', '_blank')}>
            Register Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="w-5 h-5 mr-2" />
          Link Your Wallet to Email Registration
        </CardTitle>
        <p className="text-muted-foreground">
          We found {emailRegistrations.length} email registration{emailRegistrations.length !== 1 ? 's' : ''} that can be linked to your wallet.
          Choose the one that matches your Stripe purchase.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center text-sm text-muted-foreground">
            <Wallet className="w-4 h-4 mr-2" />
            Your Wallet: <code className="ml-2 px-2 py-1 bg-background rounded">
              {walletData?.wallet_address?.slice(0, 6)}...{walletData?.wallet_address?.slice(-4)}
            </code>
          </div>
        </div>

        {emailRegistrations.map((registration) => (
          <div key={registration.email} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{registration.email}</span>
                  <Badge variant="secondary">
                    {registration.subscription_tier}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Registered: {new Date(registration.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                onClick={() => linkWalletToEmail(registration.email)}
                disabled={linking}
                className="ml-4"
              >
                {linking ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Link
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}

        <div className="text-center text-sm text-muted-foreground">
          Don't see your email? Make sure you've completed your Stripe registration first.
        </div>
      </CardContent>
    </Card>
  );
};