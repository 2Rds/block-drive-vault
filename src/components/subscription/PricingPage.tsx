
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16">
      <div className="container mx-auto px-4">
        <PricingHeader />

        {/* Billing period selector */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-1">
            {billingPeriods.map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period.value)}
                className={`${
                  selectedPeriod === period.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
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
