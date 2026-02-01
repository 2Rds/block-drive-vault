import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { pricingTiers as staticPricingTiers } from '@/data/pricingTiers';
import { PricingHeader } from './PricingHeader';
import { PricingCard } from './PricingCard';
import { PricingFooter } from './PricingFooter';
import { PaymentMethodToggle, PaymentMethod } from './PaymentMethodToggle';
import { CryptoCheckoutModal } from './CryptoCheckoutModal';
import { usePricingSubscription, getTierPrice } from '@/hooks/usePricingSubscription';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';
import { useStripePricing } from '@/hooks/useStripePricing';
import { BillingPeriod, PricingTier, PricingOption } from '@/types/pricing';
import { Button } from '@/components/ui/button';

export const PricingPage = () => {
  const { loading, handleSubscribe, handleSubscribeCrypto } = usePricingSubscription();
  const { walletAddress, isInitialized: walletConnected, getUsdcBalance } = useCrossmintWallet();

  // Use dynamic pricing from Stripe Sync Engine with fallback to static
  const { pricingTiers: dynamicTiers, isLoading: pricingLoading } = useStripePricing();

  // Use dynamic pricing if available, otherwise fall back to static
  const pricingTiers = useMemo(() => {
    if (dynamicTiers && dynamicTiers.length > 0) {
      console.log('[PricingPage] Using dynamic pricing from Stripe Sync Engine');
      return dynamicTiers;
    }
    console.log('[PricingPage] Using static pricing fallback');
    return staticPricingTiers;
  }, [dynamicTiers]);

  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('fiat');
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Crypto checkout modal state
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [selectedOption, setSelectedOption] = useState<PricingOption | null>(null);

  const billingPeriods: { value: BillingPeriod; label: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annual', label: 'Annual' }
  ];

  // Fetch wallet balance when wallet is connected
  useEffect(() => {
    if (walletConnected && walletAddress) {
      refreshWalletBalance();
    }
  }, [walletConnected, walletAddress]);

  const refreshWalletBalance = useCallback(async () => {
    if (!walletConnected) return;
    try {
      const balance = await getUsdcBalance();
      setWalletBalance(balance);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    }
  }, [walletConnected, getUsdcBalance]);

  // Handle subscription based on payment method
  const handleTierSubscribe = useCallback(async (tier: PricingTier, option: PricingOption) => {
    if (paymentMethod === 'fiat') {
      // Direct Stripe checkout
      await handleSubscribe(tier, option);
    } else {
      // Open crypto checkout modal
      setSelectedTier(tier);
      setSelectedOption(option);
      setCryptoModalOpen(true);
    }
  }, [paymentMethod, handleSubscribe]);

  // Process crypto payment from modal
  const handleCryptoPayment = useCallback(async () => {
    if (!selectedTier || !selectedOption) return;

    const result = await handleSubscribeCrypto(selectedTier, selectedOption);

    // If successful, modal will show success state
    // If insufficient balance, modal shows funding instructions
    if (result?.success) {
      setCryptoModalOpen(false);
    }
  }, [selectedTier, selectedOption, handleSubscribeCrypto]);

  // Calculate required amount for selected tier
  const getRequiredAmount = useCallback(() => {
    if (!selectedTier) return 0;
    return getTierPrice(selectedTier.name, selectedPeriod);
  }, [selectedTier, selectedPeriod]);

  return (
    <div className="min-h-screen bg-[hsl(230_15%_6%)] py-16">
      <div className="container mx-auto px-4">
        <PricingHeader />

        {/* Payment method and billing period selectors */}
        <div className="flex flex-col items-center gap-6 mb-12">
          {/* Payment Method Toggle */}
          <div className="w-full max-w-md">
            <PaymentMethodToggle
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              walletConnected={walletConnected}
              walletBalance={walletBalance}
            />
          </div>

          {/* Billing period selector */}
          <div className="bg-[hsl(230_12%_10%)] border border-[hsl(230_10%_18%)] rounded-xl p-1">
            {billingPeriods.map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period.value)}
                className={`${
                  selectedPeriod === period.value
                    ? 'bg-gradient-to-r from-[hsl(166_76%_46%)] to-[hsl(166_76%_42%)] text-white shadow-[0_0_16px_hsl(166_76%_46%/0.2)]'
                    : 'text-gray-300 hover:text-white hover:bg-[hsl(230_10%_15%)]'
                }`}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Centered pricing tiers grid */}
        <div className="flex justify-center mb-16">
          {pricingLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(166_76%_46%)]" />
              <span className="ml-3 text-gray-400">Loading pricing...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl w-full mx-auto">
              {pricingTiers.map((tier) => (
                <PricingCard
                  key={tier.name}
                  tier={tier}
                  selectedPeriod={selectedPeriod}
                  loading={loading}
                  onSubscribe={handleTierSubscribe}
                />
              ))}
            </div>
          )}
        </div>

        <PricingFooter />

        {/* Crypto Checkout Modal */}
        {selectedTier && selectedOption && (
          <CryptoCheckoutModal
            open={cryptoModalOpen}
            onClose={() => setCryptoModalOpen(false)}
            tier={selectedTier}
            billingPeriod={selectedPeriod}
            walletAddress={walletAddress || undefined}
            walletBalance={walletBalance}
            requiredAmount={getRequiredAmount()}
            onProceed={handleCryptoPayment}
            onRefreshBalance={refreshWalletBalance}
          />
        )}
      </div>
    </div>
  );
};
