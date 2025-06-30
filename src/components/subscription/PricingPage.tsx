
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface PricingTier {
  name: string;
  price: string;
  priceId: string;
  description: string;
  features: string[];
  storage: string;
  bandwidth: string;
  seats: string;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Individual',
    price: '$9.99',
    priceId: 'price_individual', // Replace with your actual Stripe price ID
    description: 'Perfect for personal use and small projects',
    storage: '100 GB',
    bandwidth: '500 GB',
    seats: '1 user',
    features: [
      '100 GB secure storage',
      '500 GB bandwidth',
      'Blockchain authentication',
      'File encryption',
      'Basic support'
    ]
  },
  {
    name: 'Business',
    price: '$29.99',
    priceId: 'price_business', // Replace with your actual Stripe price ID
    description: 'Ideal for growing teams and businesses',
    storage: '1 TB',
    bandwidth: '2 TB',
    seats: '10 users',
    popular: true,
    features: [
      '1 TB secure storage',
      '2 TB bandwidth',
      'Up to 10 team members',
      'Advanced blockchain features',
      'Priority support',
      'Team collaboration tools'
    ]
  },
  {
    name: 'Enterprise',
    price: '$99.99',
    priceId: 'price_enterprise', // Replace with your actual Stripe price ID
    description: 'For large organizations with advanced needs',
    storage: '10 TB',
    bandwidth: '10 TB',
    seats: '100 users',
    features: [
      '10 TB secure storage',
      '10 TB bandwidth',
      'Up to 100 team members',
      'Custom blockchain solutions',
      '24/7 dedicated support',
      'Advanced analytics',
      'Custom integrations'
    ]
  }
];

export const PricingPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!user) {
      toast.error('Please log in to subscribe');
      return;
    }

    setLoading(tier.name);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tier.priceId,
          tier: tier.name
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(`Failed to start subscription: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your BlockDrive Plan
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Secure, decentralized storage with blockchain authentication. 
            Pick the plan that fits your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier) => (
            <Card 
              key={tier.name} 
              className={`relative bg-gray-800/40 border-gray-700/50 ${
                tier.popular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">{tier.name}</CardTitle>
                <div className="text-3xl font-bold text-white mb-2">
                  {tier.price}
                  <span className="text-sm font-normal text-gray-400">/month</span>
                </div>
                <CardDescription className="text-gray-300">
                  {tier.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-2 text-sm">
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

                <div className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleSubscribe(tier)}
                  disabled={loading === tier.name}
                  className={`w-full ${
                    tier.popular 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {loading === tier.name ? 'Processing...' : `Subscribe to ${tier.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            All plans include blockchain authentication, end-to-end encryption, and secure file storage.
            <br />
            Cancel anytime. No hidden fees.
          </p>
        </div>
      </div>
    </div>
  );
};
