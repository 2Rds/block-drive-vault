
export type BillingPeriod = 'monthly' | 'quarterly' | 'annual';

export interface PricingOption {
  period: BillingPeriod;
  price: string;
  priceId: string;
  paymentLink?: string;
  savings?: string; // e.g., "Save 20%"
}

export interface PricingTier {
  name: string;
  pricing: PricingOption[];
  description: string;
  features: string[];
  storage: string;
  bandwidth: string;
  seats: string;
  popular?: boolean;
  isEnterprise?: boolean;
  hasTrial?: boolean;
}
