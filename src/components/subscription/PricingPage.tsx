
import React, { useState } from 'react';
import { pricingTiers } from '@/data/pricingTiers';
import { PricingHeader } from './PricingHeader';
import { PricingCard } from './PricingCard';
import { PricingFooter } from './PricingFooter';
import { usePricingSubscription } from '@/hooks/usePricingSubscription';
import { BillingPeriod } from '@/types/pricing';
import { Button } from '@/components/ui/button';

export const PricingPage = () => {
  const { loading, handleSubscribe } = usePricingSubscription();
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('monthly');

  const billingPeriods: { value: BillingPeriod; label: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annual', label: 'Annual' }
  ];

  return (
    <div className="min-h-screen bg-[hsl(230_15%_6%)] py-16">
      <div className="container mx-auto px-4">
        <PricingHeader />

        {/* Billing period selector */}
        <div className="flex justify-center mb-12">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl w-full mx-auto">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.name}
                tier={tier}
                selectedPeriod={selectedPeriod}
                loading={loading}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>
        </div>

        <PricingFooter />
      </div>
    </div>
  );
};
