
import { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    name: 'Pro',
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
    storage: '200 GB',
    bandwidth: '200 GB',
    seats: '1 user',
    hasTrial: true,
    features: [
      '200 GB secure storage',
      '200 GB bandwidth',
      'Blockchain authentication',
      'File encryption',
      'Basic support',
      '7-day free trial'
    ]
  },
  {
    name: 'Power',
    pricing: [
      {
        period: 'monthly',
        price: '$49',
        priceId: 'price_1Rfr9KCXWi8NqmFCoglqEMRH',
        paymentLink: 'price_1Rfr9KCXWi8NqmFCoglqEMRH'
      },
      {
        period: 'quarterly',
        price: '$134',
        priceId: 'price_1RixAICXWi8NqmFCXmfOkywQ',
        paymentLink: 'price_1RixAICXWi8NqmFCXmfOkywQ',
        savings: 'Save 9%'
      },
      {
        period: 'annual',
        price: '$499',
        priceId: 'price_1RixBZCXWi8NqmFCVZNvXJSF',
        paymentLink: 'price_1RixBZCXWi8NqmFCVZNvXJSF',
        savings: 'Save 15%'
      }
    ],
    description: 'Enhanced storage for power users',
    storage: '2 TB',
    bandwidth: '2 TB',
    seats: '1 user',
    features: [
      '2 TB secure storage',
      '2 TB bandwidth',
      'Advanced blockchain features',
      'Priority support',
      'Enhanced file encryption',
      'Advanced sharing options'
    ]
  },
  {
    name: 'Scale',
    pricing: [
      {
        period: 'monthly',
        price: '$29',
        priceId: 'price_1RjjLjCXWi8NqmFCUSZpnelu',
        paymentLink: 'price_1RjjLjCXWi8NqmFCUSZpnelu'
      },
      {
        period: 'quarterly',
        price: '$79',
        priceId: 'price_1RjjP4CXWi8NqmFCPqUeO9Hm',
        paymentLink: 'price_1RjjP4CXWi8NqmFCPqUeO9Hm',
        savings: 'Save 9%'
      },
      {
        period: 'annual',
        price: '$299',
        priceId: 'price_1RjjQaCXWi8NqmFCqbNgZqIx',
        paymentLink: 'price_1RjjQaCXWi8NqmFCqbNgZqIx',
        savings: 'Save 14%'
      }
    ],
    description: 'Per-seat pricing for teams (2 seat minimum)',
    storage: '1 TB',
    bandwidth: '1 TB',
    seats: '2+ users',
    popular: true,
    features: [
      '1 TB storage per seat',
      '1 TB bandwidth per seat',
      '2 seat minimum required',
      'Team collaboration tools',
      'Advanced blockchain features',
      '24/7 priority support',
      'Advanced integrations'
    ]
  }
];
