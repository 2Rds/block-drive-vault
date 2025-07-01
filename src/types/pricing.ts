
export interface PricingTier {
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
