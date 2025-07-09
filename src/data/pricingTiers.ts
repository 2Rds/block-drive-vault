

import { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    pricing: [
      {
        period: 'monthly',
        price: '$9',
        priceId: 'price_1RfquDCXWi8NqmFCLUCGHtkZ',
        paymentLink: 'https://buy.stripe.com/9B6aEW3a59YdbgXgn42VG00'
      },
      {
        period: 'quarterly',
        price: '$24',
        priceId: 'price_1RitmxCXWi8NqmFCY0YKiefl',
        buyButtonId: 'buy_btn_1Riuf1CXWi8NqmFCMGCzk4f0',
        savings: 'Save 11%'
      },
      {
        period: 'annual',
        price: '$89',
        priceId: 'price_1RitmxCXWi8NqmFCf3wDnP2E',
        buyButtonId: 'buy_btn_1RiuhICXWi8NqmFCJXt4f0SC',
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
        paymentLink: 'https://buy.stripe.com/dRmdR8dOJ3zP98Pgn42VG01'
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
        priceId: 'price_1RfrEICXWi8NqmFChG0fYrRy',
        paymentLink: 'https://buy.stripe.com/7sYdR86mh1rH98P3Ai2VG02'
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
        priceId: 'price_1RfrzdCXWi8NqmFCzAJZnHjF',
        paymentLink: 'https://buy.stripe.com/aFa4gyaCxc6l98Pc6O2VG03'
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

