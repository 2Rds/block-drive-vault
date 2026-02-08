
import { PricingTier } from '@/types/pricing';

export const pricingTiers: PricingTier[] = [
  {
    name: 'Pro',
    pricing: [
      {
        period: 'monthly',
        price: '$15',
        priceId: 'price_1SxJG0CXWi8NqmFCwwspKiz5',
        paymentLink: 'price_1SxJG0CXWi8NqmFCwwspKiz5'
      },
      {
        period: 'quarterly',
        price: '$40',
        priceId: 'price_1SxJG0CXWi8NqmFCBCgGULcp',
        paymentLink: 'price_1SxJG0CXWi8NqmFCBCgGULcp',
        savings: 'Save 11%'
      },
      {
        period: 'annual',
        price: '$149',
        priceId: 'price_1SxJG0CXWi8NqmFCT5dNX0or',
        paymentLink: 'price_1SxJG0CXWi8NqmFCT5dNX0or',
        savings: 'Save 17%'
      }
    ],
    description: 'Everything you need for personal use with 7-day free trial',
    storage: '1 TB',
    bandwidth: '1 TB',
    seats: '1 user',
    hasTrial: true,
    features: [
      '1 TB secure storage',
      '1 TB bandwidth',
      '$10/month per additional TB',
      'Blockchain authentication',
      'File encryption & ZK proofs',
      'Instant revoke sharing (internal)',
      '7-day free trial'
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
    description: 'Per-seat pricing for teams (2–99 seats)',
    storage: '2 TB',
    bandwidth: '2 TB',
    seats: '2–99 users',
    popular: true,
    features: [
      '2 TB storage per seat',
      '2 TB bandwidth per seat',
      '$10/seat/month per additional TB',
      '2 seat minimum, up to 99 seats',
      'Team collaboration tools',
      'Clerk Organizations + SSO',
      '24/7 priority support',
      'Advanced integrations'
    ]
  },
  {
    name: 'Enterprise',
    pricing: [
      {
        period: 'monthly',
        price: 'Custom',
        priceId: '',
        paymentLink: ''
      }
    ],
    description: 'Custom solutions for 100+ seat organizations',
    storage: 'Custom',
    bandwidth: 'Custom',
    seats: '100+ users',
    isEnterprise: true,
    features: [
      'Everything in Scale',
      'Custom storage allocation',
      'SSO & SAML authentication',
      'Whitelisted solutions',
      'Custom branding',
      'Dedicated account manager',
      'Priority 24/7 support',
      'SLA guarantees',
      'On-premise options'
    ]
  }
];
