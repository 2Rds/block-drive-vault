
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
        paymentLink: 'https://pay.blockdrive.co/b/fZu5kC9yt9Yd84L9YG2VG0c'
      },
      {
        period: 'quarterly',
        price: '$79',
        priceId: 'price_1RixAICXWi8NqmFCXmfOkywQ',
        paymentLink: 'https://pay.blockdrive.co/b/3cI7sK2615HXgBhfj02VG0e',
        savings: 'Save 9%'
      },
      {
        period: 'annual',
        price: '$299',
        priceId: 'price_1RixBZCXWi8NqmFCVZNvXJSF',
        paymentLink: 'https://pay.blockdrive.co/b/cNi6oGdOJdapgBh8UC2VG0f',
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
        priceId: 'price_1RfrEICXWi8NqmFChG0fYrRy',
        paymentLink: 'https://pay.blockdrive.co/b/aFaaEWaCx0nD5WD4Em2VG0g'
      },
      {
        period: 'quarterly',
        price: '$159',
        priceId: 'price_1Riy8uCXWi8NqmFCAYMg9Tc9',
        paymentLink: 'https://pay.blockdrive.co/b/14AcN45id8U970H5Iq2VG0h',
        savings: 'Save 10%'
      },
      {
        period: 'annual',
        price: '$599',
        priceId: 'price_1RiyDACXWi8NqmFCiLttoIg2',
        paymentLink: 'https://pay.blockdrive.co/b/5kQ00i6mh8U984L5Iq2VG0i',
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
        paymentLink: 'https://pay.blockdrive.co/b/9B64gyfWR0nDbgXc6O2VG0j'
      },
      {
        period: 'quarterly',
        price: '$267/quarter/seat',
        priceId: 'price_1RjjP4CXWi8NqmFCPqUeO9Hm',
        paymentLink: 'https://pay.blockdrive.co/b/6oU6oGaCx0nDfxd8UC2VG0k',
        savings: 'Save 10%'
      },
      {
        period: 'annual',
        price: '$950/year/seat',
        priceId: 'price_1RjjQaCXWi8NqmFCqbNgZqIx',
        paymentLink: 'https://pay.blockdrive.co/b/4gM14m3a54DT84Lfj02VG0l',
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
