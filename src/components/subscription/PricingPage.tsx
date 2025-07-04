
import React from 'react';
import { pricingTiers } from '@/data/pricingTiers';
import { PricingHeader } from './PricingHeader';
import { PricingCard } from './PricingCard';
import { PricingFooter } from './PricingFooter';
import { usePricingSubscription } from '@/hooks/usePricingSubscription';

export const PricingPage = () => {
  const { loading, handleSubscribe } = usePricingSubscription();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16">
      <div className="container mx-auto px-4">
        <PricingHeader />

        {/* Centered pricing tiers grid */}
        <div className="flex justify-center mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl w-full">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.name}
                tier={tier}
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
