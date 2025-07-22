
import { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    pricing: [
      {
        period: 'monthly',
        price: '$9',
        priceId: 'price_1RfquDCXWi8NqmFCLUCGHtkZ',
        paymentLink: 'price_1RfquDCXWi8NqmFCLUCGHtkZ'
      },
      {
        period: 'quarterly',
        price: '$24',
        priceId: 'price_1RitmxCXWi8NqmFCY0YKiefl',
        paymentLink: 'price_1RitmxCXWi8NqmFCY0YKiefl',
        savings: 'Save 11%'
      },
      {
        period: 'annual',
        price: '$89',
        priceId: 'price_1RitmxCXWi8NqmFCf3wDnP2E',
        paymentLink: 'price_1RitmxCXWi8NqmFCf3wDnP2E',
        savings: 'Save 17%'
      }
    ],
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
    pricing: [
      {
        period: 'monthly',
        price: '$29',
        priceId: 'price_1Rfr9KCXWi8NqmFCoglqEMRH',
        paymentLink: 'price_1Rfr9KCXWi8NqmFCoglqEMRH'
      },
      {
        period: 'quarterly',
        price: '$79',
        priceId: 'price_1RixAICXWi8NqmFCXmfOkywQ',
        paymentLink: 'price_1RixAICXWi8NqmFCXmfOkywQ',
        savings: 'Save 9%'
      },
      {
        period: 'annual',
        price: '$299',
        priceId: 'price_1RixBZCXWi8NqmFCVZNvXJSF',
        paymentLink: 'price_1RixBZCXWi8NqmFCVZNvXJSF',
        savings: 'Save 14%'
      }
    ],
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
    name: 'Growth',
    pricing: [
      {
        period: 'monthly',
        price: '$59',
        priceId: 'price_1RimjLCXWi8NqmFCerzhpbOF',
        paymentLink: 'price_1RimjLCXWi8NqmFCerzhpbOF'
      },
      {
        period: 'quarterly',
        price: '$159',
        priceId: 'price_1Riy8uCXWi8NqmFCAYMg9Tc9',
        paymentLink: 'price_1Riy8uCXWi8NqmFCAYMg9Tc9',
        savings: 'Save 10%'
      },
      {
        period: 'annual',
        price: '$599',
        priceId: 'price_1RiyDACXWi8NqmFCiLttoIg2',
        paymentLink: 'price_1RiyDACXWi8NqmFCiLttoIg2',
        savings: 'Save 16%'
      }
    ],
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
    name: 'Scale',
    pricing: [
      {
        period: 'monthly',
        price: '$99/month/seat',
        priceId: 'price_1RjjLjCXWi8NqmFCUSZpnelu',
        paymentLink: 'price_1RjjLjCXWi8NqmFCUSZpnelu'
      },
      {
        period: 'quarterly',
        price: '$267/quarter/seat',
        priceId: 'price_1RjjP4CXWi8NqmFCPqUeO9Hm',
        paymentLink: 'price_1RjjP4CXWi8NqmFCPqUeO9Hm',
        savings: 'Save 10%'
      },
      {
        period: 'annual',
        price: '$950/year/seat',
        priceId: 'price_1RjjQaCXWi8NqmFCqbNgZqIx',
        paymentLink: 'price_1RjjQaCXWi8NqmFCqbNgZqIx',
        savings: 'Save 20%'
      }
    ],
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
