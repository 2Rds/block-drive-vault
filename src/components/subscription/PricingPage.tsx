
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, ArrowLeft, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface PricingTier {
  name: string;
  price: string;
  priceId?: string;
  description: string;
  features: string[];
  storage: string;
  bandwidth: string;
  seats: string;
  popular?: boolean;
  isEnterprise?: boolean;
  hasTrial?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$9.99',
    priceId: 'price_1RfquDCXWi8NqmFCLUCGHtkZ',
    description: 'Perfect for personal use with 7-day free trial',
    storage: '50 GB',
    bandwidth: '100 GB',
    seats: '1 user',
    hasTrial: true,
    features: [
      '50 GB secure storage',
      '100 GB bandwidth',
      'Blockchain authentication',
      'File encryption',
      'Basic support',
      '7-day free trial'
    ]
  },
  {
    name: 'Pro',
    price: '$19.99',
    priceId: 'price_1Rfr9KCXWi8NqmFCoglqEMRH',
    description: 'Enhanced storage for growing needs',
    storage: '150 GB',
    bandwidth: '300 GB',
    seats: '1 user',
    features: [
      '150 GB secure storage',
      '300 GB bandwidth',
      'Advanced blockchain features',
      'Priority support',
      'Enhanced file encryption',
      'Advanced sharing options'
    ]
  },
  {
    name: 'Pro Plus',
    price: '$39.99',
    priceId: 'price_1RfrEICXWi8NqmFChG0fYrRy',
    description: 'Ideal for small teams and collaboration',
    storage: '300 GB',
    bandwidth: '600 GB',
    seats: '3 users',
    popular: true,
    features: [
      '300 GB secure storage',
      '600 GB bandwidth',
      'Up to 3 team members',
      'Team collaboration tools',
      'Advanced blockchain features',
      'Priority support',
      'Shared workspaces'
    ]
  },
  {
    name: 'Business',
    price: '$79.99',
    priceId: 'price_1RfrzdCXWi8NqmFCzAJZnHjF',
    description: 'Scalable solution for growing businesses',
    storage: '500 GB per seat',
    bandwidth: '1 TB',
    seats: 'Unlimited users',
    features: [
      '500 GB secure storage per seat',
      '1 TB bandwidth',
      'Unlimited team members',
      'Advanced analytics',
      'Custom blockchain solutions',
      '24/7 priority support',
      'Advanced integrations',
      'Custom branding'
    ]
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Tailored solutions for large organizations',
    storage: 'Unlimited',
    bandwidth: 'Unlimited',
    seats: 'Unlimited users',
    isEnterprise: true,
    features: [
      'Unlimited secure storage',
      'Unlimited bandwidth',
      'Unlimited team members',
      'Dedicated account manager',
      'Custom blockchain infrastructure',
      'White-label solutions',
      'Advanced compliance features',
      'SLA guarantees',
      'On-premise deployment options'
    ]
  }
];

export const PricingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (tier.isEnterprise) {
      // Handle enterprise contact
      window.open('mailto:sales@blockdrive.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    setLoading(tier.name);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tier.priceId,
          tier: tier.name,
          hasTrial: tier.hasTrial
        }
      });

      if (error) throw error;

      // Open Stripe checkout in the same tab
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(`Failed to start subscription: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const getButtonText = (tier: PricingTier) => {
    if (loading === tier.name) return 'Processing...';
    if (tier.isEnterprise) return 'Book a Meeting';
    if (tier.hasTrial) return 'Start Free Trial';
    return `Subscribe to ${tier.name}`;
  };

  const getButtonIcon = (tier: PricingTier) => {
    if (tier.isEnterprise) return <Calendar className="w-4 h-4 mr-2" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your BlockDrive Plan
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Secure, decentralized storage with blockchain authentication. 
            Pick the plan that fits your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {pricingTiers.map((tier) => (
            <Card 
              key={tier.name} 
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
                  {tier.price}
                  {!tier.isEnterprise && (
                    <span className="text-sm font-normal text-gray-400">/month</span>
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
                  onClick={() => handleSubscribe(tier)}
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
                  {getButtonText(tier)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            All plans include blockchain authentication, end-to-end encryption, and secure file storage.
            <br />
            {!pricingTiers.some(t => t.isEnterprise) ? 'Cancel anytime. No hidden fees.' : 'Cancel anytime. No hidden fees. Enterprise plans include custom SLAs.'}
          </p>
          <p className="text-gray-500 text-xs mt-2">
            * Free trial requires payment information. You'll be charged automatically after the trial period ends.
          </p>
        </div>
      </div>
    </div>
  );
};
