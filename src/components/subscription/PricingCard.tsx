
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Star, Calendar, ArrowRight, Shield, Users, Building2 } from 'lucide-react';
import { PricingTier, BillingPeriod, PricingOption } from '@/types/pricing';

interface PricingCardProps {
  tier: PricingTier;
  selectedPeriod: BillingPeriod;
  loading: string | null;
  onSubscribe: (tier: PricingTier, option: PricingOption) => void;
}

const TIER_ACCENTS: Record<string, { border: string; glow: string; icon: React.ReactNode; badge: string; button: string }> = {
  Pro: {
    border: 'border-zinc-700/60 hover:border-blue-500/40',
    glow: '',
    icon: <Shield className="w-5 h-5 text-blue-400" />,
    badge: '',
    button: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600',
  },
  Scale: {
    border: 'border-blue-500/40 hover:border-blue-400/60',
    glow: 'shadow-[0_0_60px_-12px_rgba(59,130,246,0.15)]',
    icon: <Users className="w-5 h-5 text-blue-400" />,
    badge: 'bg-blue-500 text-white',
    button: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20',
  },
  Enterprise: {
    border: 'border-zinc-700/60 hover:border-purple-500/40',
    glow: '',
    icon: <Building2 className="w-5 h-5 text-purple-400" />,
    badge: '',
    button: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600',
  },
};

export const PricingCard: React.FC<PricingCardProps> = ({ tier, selectedPeriod, loading, onSubscribe }) => {
  const currentOption = tier.pricing.find(option => option.period === selectedPeriod) || tier.pricing[0];
  const accent = TIER_ACCENTS[tier.name] || TIER_ACCENTS.Pro;

  const displayFeatures = tier.features.filter(f => f !== 'ADDITIONAL_SEATS_DYNAMIC');

  const handleButtonClick = () => {
    onSubscribe(tier, currentOption);
  };

  const getButtonText = () => {
    if (loading === tier.name) return 'Processing...';
    if (tier.isEnterprise) return 'Contact Sales';
    if (tier.hasTrial) return 'Start Free Trial';
    return `Get ${tier.name}`;
  };

  const getButtonIcon = () => {
    if (tier.isEnterprise) return <Calendar className="w-4 h-4 mr-2" />;
    return <ArrowRight className="w-4 h-4 ml-2" />;
  };

  const getPriceDisplay = () => {
    if (tier.isEnterprise) return { amount: 'Custom', suffix: '' };
    const raw = currentOption.price.replace('$', '');
    if (selectedPeriod === 'quarterly') return { amount: `$${raw}`, suffix: '/quarter' };
    if (selectedPeriod === 'annual') return { amount: `$${raw}`, suffix: '/year' };
    return { amount: `$${raw}`, suffix: tier.name === 'Scale' ? '/seat/mo' : '/month' };
  };

  const price = getPriceDisplay();

  return (
    <div
      className={`
        relative group rounded-2xl border bg-zinc-900/80 backdrop-blur-sm
        transition-all duration-300 flex flex-col h-full
        ${accent.border} ${accent.glow}
      `}
    >
      {/* Popular badge */}
      {tier.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <div className={`flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold ${accent.badge}`}>
            <Star className="w-3 h-3" />
            Most Popular
          </div>
        </div>
      )}

      <div className="p-8 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              {accent.icon}
            </div>
            <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-bold text-white tracking-tight">{price.amount}</span>
            {price.suffix && (
              <span className="text-sm text-zinc-500 font-medium">{price.suffix}</span>
            )}
          </div>

          {/* Savings badge */}
          {currentOption.savings && (
            <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-medium mb-2">
              {currentOption.savings}
            </div>
          )}

          {/* Trial badge */}
          {tier.hasTrial && (
            <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium mb-2">
              7-day free trial
            </div>
          )}

          <p className="text-sm text-zinc-500 leading-relaxed mt-2">{tier.description}</p>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-3 gap-3 mb-6 py-4 border-y border-zinc-800">
          <div className="text-center">
            <div className="text-sm font-semibold text-white">{tier.storage}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Storage</div>
          </div>
          <div className="text-center border-x border-zinc-800">
            <div className="text-sm font-semibold text-white">{tier.bandwidth}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Bandwidth</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">{tier.seats}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Team Size</div>
          </div>
        </div>

        {/* Features list */}
        <div className="flex-1 space-y-3 mb-8">
          {displayFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 text-blue-400" />
              </div>
              <span className="text-sm text-zinc-400 leading-tight">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleButtonClick}
          disabled={loading === tier.name}
          className={`w-full py-3 text-sm font-medium rounded-xl transition-all duration-200 ${accent.button}`}
        >
          {tier.isEnterprise ? getButtonIcon() : null}
          {getButtonText()}
          {!tier.isEnterprise ? getButtonIcon() : null}
        </Button>
      </div>
    </div>
  );
};
