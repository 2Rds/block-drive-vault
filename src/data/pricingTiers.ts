
import { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$9',
    priceId: 'price_1RfquDCXWi8NqmFCLUCGHtkZ',
    description: 'Perfect for personal use with 7-day free trial',
    storage: '50 GB',
    bandwidth: '50 GB',
    seats: '1 user',
    hasTrial: true,
    features: [
      '50 GB secure storage',
      '50 GB bandwidth',
      'Blockchain authentication',
      'File encryption',
      'Basic support',
      '7-day free trial'
    ]
  },
  {
    name: 'Pro',
    price: '$29',
    priceId: 'price_1Rfr9KCXWi8NqmFCoglqEMRH',
    description: 'Enhanced storage for growing needs',
    storage: '150 GB',
    bandwidth: '150 GB',
    seats: '1 user',
    features: [
      '150 GB secure storage',
      '150 GB bandwidth',
      'Advanced blockchain features',
      'Priority support',
      'Enhanced file encryption',
      'Advanced sharing options'
    ]
  },
  {
    name: 'Pro Plus',
    price: '$59',
    priceId: 'price_1RfrEICXWi8NqmFChG0fYrRy',
    description: 'Ideal for small teams and collaboration',
    storage: '300 GB',
    bandwidth: '300 GB',
    seats: '3 users',
    popular: true,
    features: [
      '300 GB secure storage',
      '300 GB bandwidth',
      'Up to 3 team members',
      'Team collaboration tools',
      'Advanced blockchain features',
      'Priority support',
      'Shared workspaces'
    ]
  },
  {
    name: 'Business',
    price: '$99',
    priceId: 'price_1RfrzdCXWi8NqmFCzAJZnHjF',
    description: 'Scalable solution for growing businesses',
    storage: '500 GB per seat',
    bandwidth: '500 GB per seat',
    seats: 'Unlimited users',
    features: [
      '500 GB secure storage per seat',
      '500 GB bandwidth per seat',
      'Unlimited team members',
      'Advanced analytics',
      'Custom blockchain solutions',
      '24/7 priority support',
      'Advanced integrations',
      'Custom branding'
    ]
  }
];
