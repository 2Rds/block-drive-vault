
import { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    name: 'Pro',
    pricing: [
      {
        period: 'monthly',
        price: '$9',
        priceId: 'price_1SxJG0CXWi8NqmFCwwspKiz5',
        paymentLink: 'price_1SxJG0CXWi8NqmFCwwspKiz5'
      },
      {
        period: 'quarterly',
        price: '$24',
        priceId: 'price_1SxJG0CXWi8NqmFCBCgGULcp',
        paymentLink: 'price_1SxJG0CXWi8NqmFCBCgGULcp',
        savings: 'Save 11%'
      },
      {
        period: 'annual',
        price: '$89',
        priceId: 'price_1SxJG0CXWi8NqmFCT5dNX0or',
        paymentLink: 'price_1SxJG0CXWi8NqmFCT5dNX0or',
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
        priceId: 'price_1SxJG1CXWi8NqmFCP3CJ1SSA',
        paymentLink: 'price_1SxJG1CXWi8NqmFCP3CJ1SSA'
      },
      {
        period: 'quarterly',
        price: '$134',
        priceId: 'price_1SxJG1CXWi8NqmFCYgrLZOwT',
        paymentLink: 'price_1SxJG1CXWi8NqmFCYgrLZOwT',
        savings: 'Save 9%'
      },
      {
        period: 'annual',
        price: '$499',
        priceId: 'price_1SxJG1CXWi8NqmFCLaDwUoUY',
        paymentLink: 'price_1SxJG1CXWi8NqmFCLaDwUoUY',
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
        priceId: 'price_1SxJG2CXWi8NqmFCKYtf8mRC',
        paymentLink: 'price_1SxJG2CXWi8NqmFCKYtf8mRC'
      },
      {
        period: 'quarterly',
        price: '$79',
        priceId: 'price_1SxJG2CXWi8NqmFCCWJLv7Ed',
        paymentLink: 'price_1SxJG2CXWi8NqmFCCWJLv7Ed',
        savings: 'Save 9%'
      },
      {
        period: 'annual',
        price: '$299',
        priceId: 'price_1SxJG2CXWi8NqmFCk7yinOnh',
        paymentLink: 'price_1SxJG2CXWi8NqmFCk7yinOnh',
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
