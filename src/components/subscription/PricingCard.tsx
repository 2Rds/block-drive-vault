
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Calendar } from 'lucide-react';
import { PricingTier, BillingPeriod, PricingOption } from '@/types/pricing';

interface PricingCardProps {
  tier: PricingTier;
  selectedPeriod: BillingPeriod;
  loading: string | null;
  onSubscribe: (tier: PricingTier, option: PricingOption) => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({ tier, selectedPeriod, loading, onSubscribe }) => {
  // Find the pricing option for the selected period
  const currentOption = tier.pricing.find(option => option.period === selectedPeriod) || tier.pricing[0];
  
  // Get dynamic additional seats feature based on period for Scale tier
  const getAdditionalSeatsFeature = () => {
    if (tier.name !== 'Scale') return null;
    
    switch (selectedPeriod) {
      case 'monthly':
        return 'Additional seats: $39/month (+400GB per seat)';
      case 'quarterly':
        return 'Additional seats: $109/quarter (+400GB per seat, prorated to match billing cycle)';
      case 'annual':
        return 'Additional seats: $399/year (+400GB per seat, prorated to match billing cycle)';
      default:
        return 'Additional seats: $39/month (+400GB per seat)';
    }
  };
  
  // Replace dynamic placeholders with period-specific content
  const displayFeatures = tier.features.map(feature => {
    if (feature === 'ADDITIONAL_SEATS_DYNAMIC') {
      return getAdditionalSeatsFeature();
    }
    return feature;
  }).filter(Boolean) as string[];
  
  const handleButtonClick = () => {
    onSubscribe(tier, currentOption);
  };
  
  const getButtonText = (tier: PricingTier, option: PricingOption) => {
    if (loading === tier.name) return 'Processing...';
    if (tier.isEnterprise) return 'Book a Meeting';
    if (tier.hasTrial) return 'Start Free Trial';
    return `Subscribe to ${tier.name}`;
  };

  const getButtonIcon = (tier: PricingTier) => {
    if (tier.isEnterprise) return <Calendar className="w-4 h-4 mr-2" />;
    return null;
  };

  const getPriceDisplay = (option: PricingOption) => {
    if (tier.isEnterprise) return option.price;
    if (option.period === 'quarterly') return `${option.price}/quarter`;
    if (option.period === 'annual') return `${option.price}/year`;
    return `${option.price}/month`;
  };

  return (
    <Card 
      className={`relative bg-gray-800/40 border-gray-700/50 flex flex-col h-full ${
        tier.popular ? 'ring-2 ring-blue-500' : ''
      } ${tier.isEnterprise ? 'ring-2 ring-purple-500' : ''}`}
    >
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-600 text-white flex items-center gap-1">
            <Star className="w-3 h-3" />
            Most Popular
          </Badge>
        </div>
      )}
      
      {tier.isEnterprise && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-purple-600 text-white flex items-center gap-1">
            <Star className="w-3 h-3" />
            Enterprise
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-white mb-2">{tier.name}</CardTitle>
        <div className="mb-3">
          <span className="text-4xl font-bold text-white">{currentOption.price}</span>
          <span className="text-gray-400 text-sm">
            {currentOption.period === 'quarterly' ? '/quarter' : currentOption.period === 'annual' ? '/year' : '/month'}
          </span>
          {currentOption.savings && (
            <div className="text-sm text-green-400 font-medium mt-1">
              {currentOption.savings}
            </div>
          )}
        </div>
        {tier.hasTrial && (
          <div className="text-sm text-green-400 font-medium mb-2">
            7-day free trial
          </div>
        )}
        <CardDescription className="text-gray-300 text-sm min-h-[40px]">
          {tier.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 space-y-6">
        {/* Storage/Bandwidth/Seats grid */}
        <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Storage</span>
            <span className="text-white font-semibold">{tier.storage}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Bandwidth</span>
            <span className="text-white font-semibold">{tier.bandwidth}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Team Size</span>
            <span className="text-white font-semibold">{tier.seats}</span>
          </div>
        </div>

        {/* Features list */}
        <div className="flex-1 space-y-3">
          {displayFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300 text-sm leading-tight">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleButtonClick}
          disabled={loading === tier.name}
          className={`w-full py-3 text-base font-medium mt-auto ${
            tier.popular 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : tier.isEnterprise
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {getButtonIcon(tier)}
          {getButtonText(tier, currentOption)}
        </Button>
      </CardContent>
    </Card>
  );
};
