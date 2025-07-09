
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
    if (tier.name === 'Scale') return option.price; // Already includes /month/seat
    if (option.period === 'quarterly') return `${option.price}/quarter`;
    if (option.period === 'annual') return `${option.price}/year`;
    return `${option.price}/month`;
  };

  return (
    <Card 
      className={`relative bg-gray-800/40 border-gray-700/50 ${
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
      
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-white">{tier.name}</CardTitle>
        <div className="text-2xl font-bold text-white mb-2">
          {getPriceDisplay(currentOption)}
          {currentOption.savings && (
            <div className="text-sm text-green-400 font-medium mt-1">
              {currentOption.savings}
            </div>
          )}
        </div>
        {tier.hasTrial && (
          <div className="text-sm text-green-400 font-medium">
            7-day free trial
          </div>
        )}
        <CardDescription className="text-gray-300 text-sm">
          {tier.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Storage:</span>
            <span className="text-white font-medium">{tier.storage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Bandwidth:</span>
            <span className="text-white font-medium">{tier.bandwidth}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Team Size:</span>
            <span className="text-white font-medium">{tier.seats}</span>
          </div>
        </div>

        <div className="space-y-2">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300 text-xs">{feature}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={handleButtonClick}
          disabled={loading === tier.name}
          className={`w-full text-sm ${
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
