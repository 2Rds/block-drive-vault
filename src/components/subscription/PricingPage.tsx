import React, { useState, useCallback, useEffect } from 'react';
import { pricingTiers as staticPricingTiers } from '@/data/pricingTiers';
import { PricingHeader } from './PricingHeader';
import { PricingCard } from './PricingCard';
import { PricingFooter } from './PricingFooter';
import { PaymentMethodToggle, PaymentMethod } from './PaymentMethodToggle';
import { CryptoCheckoutModal } from './CryptoCheckoutModal';
import { usePricingSubscription, getTierPrice } from '@/hooks/usePricingSubscription';
import { useDynamicWallet } from '@/hooks/useDynamicWallet';
// import { useStripePricing } from '@/hooks/useStripePricing'; // TODO: Re-enable when sync is configured
import { BillingPeriod, PricingTier, PricingOption } from '@/types/pricing';
import { Button } from '@/components/ui/button';
import { GradientOrbs } from '@/components/effects/GradientOrb';
import { GridPattern } from '@/components/effects/GridPattern';

export const PricingPage = () => {
  const { loading, handleSubscribe, handleSubscribeCrypto } = usePricingSubscription();
  const { walletAddress, isInitialized: walletConnected, getUsdcBalance } = useDynamicWallet();

  // TODO: Re-enable dynamic pricing once Stripe Sync Engine is properly configured
  // const { pricingTiers: dynamicTiers, isLoading: pricingLoading } = useStripePricing();

  // Use static pricing (Stripe products were just created, sync not yet configured)
  const pricingTiers = staticPricingTiers;
  const pricingLoading = false;

  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('fiat');
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Crypto checkout modal state
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [selectedOption, setSelectedOption] = useState<PricingOption | null>(null);

  const billingPeriods: { value: BillingPeriod; label: string; discount?: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly', discount: 'Save 11%' },
    { value: 'annual', label: 'Annual', discount: 'Save 17%' },
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
      await handleSubscribe(tier, option);
    } else {
      setSelectedTier(tier);
      setSelectedOption(option);
      setCryptoModalOpen(true);
    }
  }, [paymentMethod, handleSubscribe]);

  // Process crypto payment from modal
  const handleCryptoPayment = useCallback(async () => {
    if (!selectedTier || !selectedOption) return;

    const result = await handleSubscribeCrypto(selectedTier, selectedOption);

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
    <div className="min-h-screen bg-[#0a0a0b] py-16 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <GradientOrbs />
        <GridPattern fadeEdges />
        {/* Subtle radial glow behind cards */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <PricingHeader />

        {/* Controls row: Payment method + billing period */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-14">
          {/* Payment Method Toggle */}
          <div className="w-full max-w-xs">
            <PaymentMethodToggle
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              walletConnected={walletConnected}
              walletBalance={walletBalance}
            />
          </div>

          {/* Billing period selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-sm">
            {billingPeriods.map((period) => (
              <button
                key={period.value}
                aria-pressed={selectedPeriod === period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${selectedPeriod === period.value
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
              >
                {period.label}
                {period.discount && selectedPeriod === period.value && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] text-green-400 font-semibold">
                    {period.discount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing cards */}
        <div className="flex justify-center mb-20">
          {pricingLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
              <span className="ml-3 text-zinc-500 text-sm">Loading plans...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
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
