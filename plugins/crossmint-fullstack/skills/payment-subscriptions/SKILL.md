---
name: Stablecoin Payments & Subscriptions
description: This skill should be used when the user asks about "USDC payments", "USDT transactions", "stablecoin billing", "recurring subscriptions", "payment webhooks", "Crossmint payment API", "BlockDrive tier billing", "NFT membership payments", "subscription management", "refunds and cancellations", or needs to implement stablecoin-based payment processing and subscription billing across Solana and EVM chains.
version: 1.0.0
---

# Stablecoin Payments & Subscriptions

## Overview

Crossmint provides a comprehensive payment orchestration platform that enables BlockDrive to accept USDC and USDT payments across multiple blockchains, manage recurring subscriptions, and automatically mint NFT memberships tied to payment tiers. This system handles the complete payment lifecycle from checkout to fulfillment, webhooks, refunds, and cancellations.

**Key Capabilities**:
- **Multi-Chain Stablecoin Payments**: USDC/USDT on Solana, Ethereum, Base, Polygon
- **Recurring Subscriptions**: Automated billing for Free, Pro, and Enterprise tiers
- **NFT Membership Minting**: Automatically mint tier-based NFTs on successful payment
- **Payment Webhooks**: Real-time notifications for payment events
- **Refund Management**: Automated refund processing with on-chain verification
- **Currency Flexibility**: Support for crypto and fiat payment methods
- **Compliance**: Built-in AML/KYC for enterprise accounts

**BlockDrive Subscription Tiers**:
1. **Free Tier**: 5GB storage, basic features (no payment required)
2. **Pro Tier**: 100GB storage, advanced features ($9.99/month USDC)
3. **Enterprise Tier**: Unlimited storage, custom features ($99.99/month USDC)

## When to Use

Activate this skill when:
- Implementing subscription billing for BlockDrive tiers
- Processing one-time or recurring stablecoin payments
- Setting up payment webhooks for event handling
- Minting NFT memberships tied to subscription tiers
- Implementing refund or cancellation flows
- Configuring multi-chain payment acceptance
- Building checkout flows with crypto payments
- Integrating payment analytics and reporting
- Handling failed payment retries
- Managing subscription upgrades and downgrades

## Core Architecture

### Payment & Subscription Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              CROSSMINT PAYMENT & SUBSCRIPTION FLOW                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐           │
│  │   USER   │────▶│  CROSSMINT   │────▶│   SUPABASE   │           │
│  │  (Payer) │     │  Payment API │     │   Database   │           │
│  └──────────┘     └──────────────┘     └──────────────┘           │
│       │                  │                     │                   │
│       │                  │                     │                   │
│  1. Select tier    2. Process payment   3. Update subscription     │
│     & checkout        & mint NFT           & grant access          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  PAYMENT PROCESSING                                          │  │
│  │  • User selects Pro/Enterprise tier                         │  │
│  │  • Crossmint creates checkout session                       │  │
│  │  • User pays with USDC/USDT on any chain                    │  │
│  │  • Crossmint mints membership NFT                           │  │
│  │  • Webhook triggers access grant                            │  │
│  │  • Subscription activated in database                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  RECURRING BILLING                                           │  │
│  │  • Crossmint automatically charges monthly                   │  │
│  │  • Payment webhook confirms transaction                      │  │
│  │  • NFT remains valid (no re-mint needed)                    │  │
│  │  • Failed payments trigger retry logic                      │  │
│  │  • After 3 failures, subscription downgraded                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Subscription Tier Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BLOCKDRIVE SUBSCRIPTION TIERS                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FREE TIER                                                           │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  • No payment required                                 │        │
│  │  • 5GB storage limit                                   │        │
│  │  • Basic file upload/download                          │        │
│  │  • No NFT membership                                   │        │
│  │  • Community support only                              │        │
│  └────────────────────────────────────────────────────────┘        │
│                          ↓ UPGRADE                                  │
│  PRO TIER ($9.99/month USDC)                                        │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  • Recurring monthly billing                           │        │
│  │  • 100GB storage limit                                 │        │
│  │  • Advanced file sharing                               │        │
│  │  • Version history (30 days)                           │        │
│  │  • Pro NFT badge minted                                │        │
│  │  • Priority support                                    │        │
│  │  • API access                                          │        │
│  └────────────────────────────────────────────────────────┘        │
│                          ↓ UPGRADE                                  │
│  ENTERPRISE TIER ($99.99/month USDC)                                │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  • Recurring monthly billing                           │        │
│  │  • Unlimited storage                                   │        │
│  │  • Team collaboration features                         │        │
│  │  • Unlimited version history                           │        │
│  │  • Enterprise NFT badge minted                         │        │
│  │  • White-label options                                 │        │
│  │  • Dedicated support & SLA                             │        │
│  │  • Advanced API & webhooks                             │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Webhook Event Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PAYMENT WEBHOOK EVENT FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PAYMENT SUCCESS                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  1. Crossmint → BlockDrive webhook endpoint            │        │
│  │  2. Verify webhook signature                           │        │
│  │  3. Extract payment & user data                        │        │
│  │  4. Update subscription in Supabase                    │        │
│  │  5. Mint NFT membership badge                          │        │
│  │  6. Send confirmation email                            │        │
│  │  7. Grant tier-specific features                       │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
│  PAYMENT FAILED                                                      │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  1. Crossmint → BlockDrive webhook endpoint            │        │
│  │  2. Verify webhook signature                           │        │
│  │  3. Log failure reason                                 │        │
│  │  4. Increment retry counter                            │        │
│  │  5. Send payment failed notification                   │        │
│  │  6. Schedule retry (after 3 days)                      │        │
│  │  7. Downgrade after 3 failed attempts                  │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
│  SUBSCRIPTION CANCELLED                                              │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  1. Crossmint → BlockDrive webhook endpoint            │        │
│  │  2. Verify webhook signature                           │        │
│  │  3. Mark subscription as cancelled                     │        │
│  │  4. Allow access until period end                      │        │
│  │  5. Burn NFT membership (optional)                     │        │
│  │  6. Send cancellation confirmation                     │        │
│  │  7. Downgrade to Free tier on next billing date        │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
│  REFUND PROCESSED                                                    │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  1. Crossmint → BlockDrive webhook endpoint            │        │
│  │  2. Verify webhook signature                           │        │
│  │  3. Update subscription status                         │        │
│  │  4. Calculate prorated access period                   │        │
│  │  5. Burn NFT membership                                │        │
│  │  6. Send refund confirmation                           │        │
│  │  7. Revoke tier-specific features immediately          │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Pattern

### Required Packages

```bash
npm install @crossmint/client-sdk-react-ui
npm install @crossmint/server-sdk
npm install stripe # For subscription management patterns
npm install crypto # For webhook signature verification
```

### Environment Configuration

```typescript
// .env.local
NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY=your_client_key
CROSSMINT_SERVER_API_KEY=your_server_key
CROSSMINT_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_PRO_TIER_PRICE_ID=price_pro_monthly
NEXT_PUBLIC_ENTERPRISE_TIER_PRICE_ID=price_enterprise_monthly
NEXT_PUBLIC_APP_URL=https://blockdrive.app
```

### Payment Service Core

```typescript
// lib/payments/crossmint-payment-service.ts
import { CrossmintPaymentAPI } from '@crossmint/server-sdk';

export type TierName = 'free' | 'pro' | 'enterprise';

export interface SubscriptionTier {
  name: TierName;
  displayName: string;
  priceMonthly: number; // USDC
  currency: 'usdc' | 'usdt';
  chain: 'solana' | 'ethereum' | 'base' | 'polygon';
  features: string[];
  storageGB: number;
  nftMetadata?: {
    name: string;
    description: string;
    image: string;
    attributes: Record<string, string>;
  };
}

export const SUBSCRIPTION_TIERS: Record<TierName, SubscriptionTier> = {
  free: {
    name: 'free',
    displayName: 'Free',
    priceMonthly: 0,
    currency: 'usdc',
    chain: 'solana',
    features: [
      '5GB storage',
      'Basic file upload/download',
      'Community support',
    ],
    storageGB: 5,
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    priceMonthly: 9.99,
    currency: 'usdc',
    chain: 'solana',
    features: [
      '100GB storage',
      'Advanced file sharing',
      '30-day version history',
      'Priority support',
      'API access',
    ],
    storageGB: 100,
    nftMetadata: {
      name: 'BlockDrive Pro Member',
      description: 'Pro tier membership for BlockDrive decentralized storage',
      image: 'https://blockdrive.app/nft/pro-badge.png',
      attributes: {
        tier: 'Pro',
        storage: '100GB',
        features: 'Advanced',
      },
    },
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceMonthly: 99.99,
    currency: 'usdc',
    chain: 'solana',
    features: [
      'Unlimited storage',
      'Team collaboration',
      'Unlimited version history',
      'White-label options',
      'Dedicated support & SLA',
      'Advanced API & webhooks',
    ],
    storageGB: -1, // Unlimited
    nftMetadata: {
      name: 'BlockDrive Enterprise Member',
      description: 'Enterprise tier membership for BlockDrive decentralized storage',
      image: 'https://blockdrive.app/nft/enterprise-badge.png',
      attributes: {
        tier: 'Enterprise',
        storage: 'Unlimited',
        features: 'Premium',
      },
    },
  },
};

export interface CreateCheckoutParams {
  userId: string;
  tier: TierName;
  email: string;
  walletAddress: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
}

export class CrossmintPaymentService {
  private api: CrossmintPaymentAPI;

  constructor(apiKey: string) {
    this.api = new CrossmintPaymentAPI(apiKey);
  }

  /**
   * Create a checkout session for subscription upgrade
   */
  async createCheckoutSession(
    params: CreateCheckoutParams
  ): Promise<CheckoutSession> {
    try {
      const tier = SUBSCRIPTION_TIERS[params.tier];

      if (tier.name === 'free') {
        throw new Error('Cannot create checkout for free tier');
      }

      const session = await this.api.checkout.create({
        lineItems: [{
          name: `BlockDrive ${tier.displayName} Subscription`,
          description: tier.features.join(', '),
          price: tier.priceMonthly,
          currency: tier.currency.toUpperCase(),
          quantity: 1,
        }],
        payment: {
          method: 'crypto',
          crypto: {
            chains: [tier.chain],
            currencies: [tier.currency.toUpperCase()],
          },
          recurring: {
            interval: 'month',
            intervalCount: 1,
          },
        },
        recipient: {
          email: params.email,
          walletAddress: params.walletAddress,
        },
        metadata: {
          userId: params.userId,
          tier: params.tier,
          subscriptionType: 'recurring',
        },
        locale: 'en-US',
        successCallbackUrl: params.successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
        cancelCallbackUrl: params.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
      });

      console.log('Checkout session created:', {
        sessionId: session.id,
        tier: params.tier,
        user: params.userId,
      });

      return {
        id: session.id,
        url: session.url,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Process one-time payment (e.g., for yearly subscriptions)
   */
  async processOneTimePayment(params: {
    userId: string;
    amount: number;
    currency: 'usdc' | 'usdt';
    chain: string;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<{ paymentId: string; status: string }> {
    try {
      const payment = await this.api.payments.create({
        amount: params.amount,
        currency: params.currency.toUpperCase(),
        chain: params.chain,
        description: params.description,
        metadata: {
          userId: params.userId,
          ...params.metadata,
        },
      });

      console.log('One-time payment created:', {
        paymentId: payment.id,
        amount: params.amount,
        currency: params.currency,
      });

      return {
        paymentId: payment.id,
        status: payment.status,
      };
    } catch (error) {
      console.error('Failed to process one-time payment:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.api.subscriptions.get(subscriptionId);

      return {
        id: subscription.id,
        status: subscription.status,
        tier: subscription.metadata?.tier as TierName,
        currentPeriodStart: new Date(subscription.currentPeriodStart),
        currentPeriodEnd: new Date(subscription.currentPeriodEnd),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        userId: subscription.metadata?.userId,
      };
    } catch (error) {
      console.error('Failed to get subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription (at period end)
   */
  async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false
  ): Promise<void> {
    try {
      await this.api.subscriptions.cancel(subscriptionId, {
        immediate,
      });

      console.log('Subscription cancelled:', {
        subscriptionId,
        immediate,
      });
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription (upgrade/downgrade tier)
   */
  async updateSubscription(
    subscriptionId: string,
    newTier: TierName
  ): Promise<void> {
    try {
      const tier = SUBSCRIPTION_TIERS[newTier];

      await this.api.subscriptions.update(subscriptionId, {
        priceAmount: tier.priceMonthly,
        metadata: {
          tier: newTier,
        },
      });

      console.log('Subscription updated:', {
        subscriptionId,
        newTier,
      });
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<{ refundId: string; status: string }> {
    try {
      const refund = await this.api.refunds.create({
        paymentId,
        amount, // If not provided, full refund
        reason,
      });

      console.log('Refund processed:', {
        refundId: refund.id,
        paymentId,
        amount: refund.amount,
      });

      return {
        refundId: refund.id,
        status: refund.status,
      };
    } catch (error) {
      console.error('Failed to process refund:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string) {
    try {
      const payments = await this.api.payments.list({
        metadata: { userId },
        limit: 100,
      });

      return payments.data.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: new Date(payment.created),
        description: payment.description,
      }));
    } catch (error) {
      console.error('Failed to get payment history:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Failed to verify webhook signature:', error);
      return false;
    }
  }
}
```

### Webhook Handler

```typescript
// app/api/webhooks/crossmint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CrossmintPaymentService } from '@/lib/payments/crossmint-payment-service';
import { createClient } from '@/lib/supabase/server';
import { mintMembershipNFT } from '@/lib/nft/membership-minting';

const paymentService = new CrossmintPaymentService(
  process.env.CROSSMINT_SERVER_API_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Get webhook payload and signature
    const payload = await req.text();
    const signature = req.headers.get('x-crossmint-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = paymentService.verifyWebhookSignature(
      payload,
      signature,
      process.env.CROSSMINT_WEBHOOK_SECRET!
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event
    const event = JSON.parse(payload);
    console.log('Webhook event received:', event.type);

    // Route to appropriate handler
    switch (event.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(event);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event);
        break;

      case 'subscription.created':
        await handleSubscriptionCreated(event);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event);
        break;

      case 'refund.processed':
        await handleRefundProcessed(event);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(event: any) {
  const { userId, tier } = event.data.metadata;
  const supabase = createClient();

  try {
    // Update subscription in database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier,
        status: 'active',
        current_period_start: new Date(event.data.currentPeriodStart),
        current_period_end: new Date(event.data.currentPeriodEnd),
        crossmint_subscription_id: event.data.subscriptionId,
        crossmint_payment_id: event.data.id,
        updated_at: new Date(),
      });

    if (updateError) throw updateError;

    // Mint NFT membership badge
    if (tier !== 'free') {
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('id', userId)
        .single();

      if (userData?.wallet_address) {
        await mintMembershipNFT({
          walletAddress: userData.wallet_address,
          tier,
          userId,
        });
      }
    }

    // Send confirmation email
    await sendSubscriptionConfirmationEmail(userId, tier);

    console.log('Payment succeeded processed:', {
      userId,
      tier,
      paymentId: event.data.id,
    });
  } catch (error) {
    console.error('Failed to handle payment succeeded:', error);
    throw error;
  }
}

async function handlePaymentFailed(event: any) {
  const { userId, tier } = event.data.metadata;
  const supabase = createClient();

  try {
    // Log failed payment
    await supabase.from('payment_failures').insert({
      user_id: userId,
      tier,
      reason: event.data.failureReason,
      crossmint_payment_id: event.data.id,
      retry_count: event.data.retryCount || 0,
      created_at: new Date(),
    });

    // Check retry count
    const retryCount = event.data.retryCount || 0;

    if (retryCount >= 3) {
      // Downgrade subscription after 3 failed attempts
      await supabase
        .from('subscriptions')
        .update({
          tier: 'free',
          status: 'past_due',
          downgraded_at: new Date(),
        })
        .eq('user_id', userId);

      await sendPaymentFailedDowngradeEmail(userId);
    } else {
      // Send retry notification
      await sendPaymentFailedRetryEmail(userId, retryCount + 1);
    }

    console.log('Payment failed processed:', {
      userId,
      tier,
      retryCount,
    });
  } catch (error) {
    console.error('Failed to handle payment failed:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(event: any) {
  const { userId, tier } = event.data.metadata;
  const supabase = createClient();

  try {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      tier,
      status: 'active',
      current_period_start: new Date(event.data.currentPeriodStart),
      current_period_end: new Date(event.data.currentPeriodEnd),
      crossmint_subscription_id: event.data.id,
      created_at: new Date(),
    });

    console.log('Subscription created:', { userId, tier });
  } catch (error) {
    console.error('Failed to handle subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(event: any) {
  const { userId, tier } = event.data.metadata;
  const supabase = createClient();

  try {
    // Get old tier
    const { data: oldSubscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .single();

    // Update subscription
    await supabase
      .from('subscriptions')
      .update({
        tier,
        status: event.data.status,
        current_period_start: new Date(event.data.currentPeriodStart),
        current_period_end: new Date(event.data.currentPeriodEnd),
        updated_at: new Date(),
      })
      .eq('user_id', userId);

    // Handle tier change
    if (oldSubscription && oldSubscription.tier !== tier) {
      await handleTierChange(userId, oldSubscription.tier, tier);
    }

    console.log('Subscription updated:', { userId, oldTier: oldSubscription?.tier, newTier: tier });
  } catch (error) {
    console.error('Failed to handle subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionCancelled(event: any) {
  const { userId } = event.data.metadata;
  const supabase = createClient();

  try {
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        cancelled_at: new Date(),
      })
      .eq('user_id', userId);

    await sendCancellationConfirmationEmail(userId);

    console.log('Subscription cancelled:', { userId });
  } catch (error) {
    console.error('Failed to handle subscription cancelled:', error);
    throw error;
  }
}

async function handleRefundProcessed(event: any) {
  const { userId, tier } = event.data.metadata;
  const supabase = createClient();

  try {
    // Update subscription
    await supabase
      .from('subscriptions')
      .update({
        tier: 'free',
        status: 'refunded',
        refunded_at: new Date(),
      })
      .eq('user_id', userId);

    // Burn NFT membership (optional)
    await burnMembershipNFT(userId, tier);

    // Send refund confirmation
    await sendRefundConfirmationEmail(userId, event.data.amount);

    console.log('Refund processed:', {
      userId,
      amount: event.data.amount,
    });
  } catch (error) {
    console.error('Failed to handle refund processed:', error);
    throw error;
  }
}

async function handleTierChange(userId: string, oldTier: string, newTier: string) {
  // Burn old NFT and mint new one
  await burnMembershipNFT(userId, oldTier);

  const supabase = createClient();
  const { data: userData } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('id', userId)
    .single();

  if (userData?.wallet_address) {
    await mintMembershipNFT({
      walletAddress: userData.wallet_address,
      tier: newTier,
      userId,
    });
  }

  await sendTierChangeEmail(userId, oldTier, newTier);
}

// Email helper functions (implement with your email service)
async function sendSubscriptionConfirmationEmail(userId: string, tier: string) {
  console.log('Sending subscription confirmation email:', { userId, tier });
}

async function sendPaymentFailedRetryEmail(userId: string, retryCount: number) {
  console.log('Sending payment failed retry email:', { userId, retryCount });
}

async function sendPaymentFailedDowngradeEmail(userId: string) {
  console.log('Sending payment failed downgrade email:', { userId });
}

async function sendCancellationConfirmationEmail(userId: string) {
  console.log('Sending cancellation confirmation email:', { userId });
}

async function sendRefundConfirmationEmail(userId: string, amount: number) {
  console.log('Sending refund confirmation email:', { userId, amount });
}

async function sendTierChangeEmail(userId: string, oldTier: string, newTier: string) {
  console.log('Sending tier change email:', { userId, oldTier, newTier });
}

async function burnMembershipNFT(userId: string, tier: string) {
  console.log('Burning membership NFT:', { userId, tier });
}
```

### NFT Membership Minting

```typescript
// lib/nft/membership-minting.ts
import { CrossmintEmbeddedWallet } from '@crossmint/client-sdk-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import { SUBSCRIPTION_TIERS, TierName } from '@/lib/payments/crossmint-payment-service';

export interface MintMembershipParams {
  walletAddress: string;
  tier: TierName;
  userId: string;
}

export async function mintMembershipNFT(params: MintMembershipParams) {
  try {
    const tier = SUBSCRIPTION_TIERS[params.tier];

    if (!tier.nftMetadata) {
      console.log('No NFT for tier:', params.tier);
      return null;
    }

    // Use Crossmint NFT minting API
    const response = await fetch('https://api.crossmint.com/v1/nfts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CROSSMINT_SERVER_API_KEY!,
      },
      body: JSON.stringify({
        recipient: `solana:${params.walletAddress}`,
        metadata: {
          name: tier.nftMetadata.name,
          description: tier.nftMetadata.description,
          image: tier.nftMetadata.image,
          attributes: [
            ...Object.entries(tier.nftMetadata.attributes).map(([trait_type, value]) => ({
              trait_type,
              value,
            })),
            {
              trait_type: 'User ID',
              value: params.userId,
            },
            {
              trait_type: 'Minted At',
              value: new Date().toISOString(),
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`NFT minting failed: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('Membership NFT minted:', {
      userId: params.userId,
      tier: params.tier,
      mintAddress: data.onChain.mintAddress,
    });

    return {
      mintAddress: data.onChain.mintAddress,
      transactionId: data.onChain.transactionId,
    };
  } catch (error) {
    console.error('Failed to mint membership NFT:', error);
    throw error;
  }
}
```

### React Hook for Subscriptions

```typescript
// hooks/useSubscription.ts
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { TierName } from '@/lib/payments/crossmint-payment-service';
import { createClient } from '@/lib/supabase/client';

export interface Subscription {
  id: string;
  userId: string;
  tier: TierName;
  status: 'active' | 'cancelled' | 'past_due' | 'refunded';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription() {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found, user is on free tier
          setSubscription({
            id: 'free',
            userId: user.id,
            tier: 'free',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
          });
        } else {
          throw error;
        }
      } else {
        setSubscription({
          id: data.id,
          userId: data.user_id,
          tier: data.tier,
          status: data.status,
          currentPeriodStart: new Date(data.current_period_start),
          currentPeriodEnd: new Date(data.current_period_end),
          cancelAtPeriodEnd: data.cancel_at_period_end || false,
        });
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const startCheckout = useCallback(async (tier: TierName) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start checkout:', error);
      throw error;
    }
  }, [user]);

  const cancelSubscription = useCallback(async (immediate: boolean = false) => {
    if (!user || !subscription) return;

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      await loadSubscription();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }, [user, subscription, loadSubscription]);

  const reactivateSubscription = useCallback(async () => {
    if (!user || !subscription) return;

    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription');
      }

      await loadSubscription();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      throw error;
    }
  }, [user, subscription, loadSubscription]);

  return {
    subscription,
    loading,
    startCheckout,
    cancelSubscription,
    reactivateSubscription,
    refresh: loadSubscription,
  };
}
```

### Subscription Management UI

```typescript
// components/subscription/SubscriptionManager.tsx
'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { SUBSCRIPTION_TIERS } from '@/lib/payments/crossmint-payment-service';

export function SubscriptionManager() {
  const { subscription, loading, startCheckout, cancelSubscription } = useSubscription();

  if (loading) {
    return <div>Loading subscription...</div>;
  }

  if (!subscription) {
    return <div>No subscription found</div>;
  }

  const currentTier = SUBSCRIPTION_TIERS[subscription.tier];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Subscription Management</h1>

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{currentTier.displayName} Plan</h2>
            <p className="text-gray-600">
              {subscription.tier === 'free'
                ? 'Free forever'
                : `$${currentTier.priceMonthly}/month`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold capitalize">{subscription.status}</p>
          </div>
        </div>

        {/* Features */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Features:</h3>
          <ul className="space-y-1">
            {currentTier.features.map((feature, idx) => (
              <li key={idx} className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Billing Info */}
        {subscription.tier !== 'free' && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              Current period: {subscription.currentPeriodStart.toLocaleDateString()} - {subscription.currentPeriodEnd.toLocaleDateString()}
            </p>
            {subscription.cancelAtPeriodEnd && (
              <p className="text-sm text-orange-600 mt-2">
                Your subscription will end on {subscription.currentPeriodEnd.toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Available Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['free', 'pro', 'enterprise'] as const).map(tierName => {
          const tier = SUBSCRIPTION_TIERS[tierName];
          const isCurrent = subscription.tier === tierName;
          const isUpgrade = getTierLevel(tierName) > getTierLevel(subscription.tier);

          return (
            <div
              key={tierName}
              className={`bg-white rounded-lg shadow p-6 ${
                isCurrent ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              <h3 className="text-xl font-bold mb-2">{tier.displayName}</h3>
              <p className="text-3xl font-bold mb-4">
                {tier.priceMonthly === 0 ? 'Free' : `$${tier.priceMonthly}`}
                {tier.priceMonthly > 0 && <span className="text-sm">/month</span>}
              </p>

              <ul className="space-y-2 mb-6">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="text-sm flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div>
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                  {tierName !== 'free' && !subscription.cancelAtPeriodEnd && (
                    <button
                      onClick={() => cancelSubscription(false)}
                      className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => startCheckout(tierName)}
                  disabled={tierName === 'free'}
                  className={`w-full px-4 py-2 rounded ${
                    isUpgrade
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } ${tierName === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUpgrade ? 'Upgrade' : 'Downgrade'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTierLevel(tier: string): number {
  const levels = { free: 0, pro: 1, enterprise: 2 };
  return levels[tier as keyof typeof levels] || 0;
}
```

## Database Schema

```sql
-- subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'refunded')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  crossmint_subscription_id TEXT,
  crossmint_payment_id TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  downgraded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);
CREATE INDEX subscriptions_crossmint_subscription_id_idx ON subscriptions(crossmint_subscription_id);

-- payment_failures table
CREATE TABLE payment_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  reason TEXT,
  crossmint_payment_id TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX payment_failures_user_id_idx ON payment_failures(user_id);

-- membership_nfts table
CREATE TABLE membership_nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  mint_address TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  burned BOOLEAN DEFAULT FALSE,
  burned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX membership_nfts_user_id_idx ON membership_nfts(user_id);
CREATE INDEX membership_nfts_mint_address_idx ON membership_nfts(mint_address);
```

## Best Practices

### Payment Security

1. **Webhook Verification**
   - Always verify webhook signatures
   - Use timing-safe comparison for signatures
   - Log all webhook events for audit trail
   - Implement idempotency to prevent duplicate processing

2. **Subscription Management**
   - Allow users to cancel at period end (not immediately)
   - Prorate refunds based on usage
   - Implement grace periods for failed payments
   - Send notifications before billing

3. **Error Handling**
   - Retry failed payments automatically (with limits)
   - Provide clear error messages to users
   - Log all payment failures for analysis
   - Implement fallback payment methods

### User Experience

1. **Transparent Pricing**
   - Show all costs upfront
   - Display currency conversions clearly
   - Explain recurring billing
   - Provide usage tracking

2. **Flexible Billing**
   - Support monthly and annual billing
   - Allow mid-cycle upgrades/downgrades
   - Prorate charges fairly
   - Offer trial periods

3. **Communication**
   - Send payment receipts immediately
   - Notify before billing date
   - Alert on failed payments
   - Confirm subscription changes

## Testing

```typescript
// tests/payments/subscription.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { CrossmintPaymentService } from '@/lib/payments/crossmint-payment-service';

describe('CrossmintPaymentService', () => {
  let service: CrossmintPaymentService;

  beforeAll(() => {
    service = new CrossmintPaymentService(process.env.CROSSMINT_SERVER_API_KEY!);
  });

  it('should create checkout session for Pro tier', async () => {
    const session = await service.createCheckoutSession({
      userId: 'test-user-123',
      tier: 'pro',
      email: 'test@example.com',
      walletAddress: 'WALLET_ADDRESS',
    });

    expect(session.id).toBeDefined();
    expect(session.url).toContain('https://');
    expect(session.expiresAt).toBeInstanceOf(Date);
  });

  it('should process refund', async () => {
    const result = await service.processRefund('payment_123', 9.99, 'Customer request');

    expect(result.refundId).toBeDefined();
    expect(result.status).toBe('pending');
  });

  it('should verify webhook signature', () => {
    const payload = JSON.stringify({ type: 'payment.succeeded' });
    const secret = 'webhook_secret';

    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isValid = service.verifyWebhookSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });
});
```

## Additional Resources

- [Crossmint Payment API Documentation](https://docs.crossmint.com/payments/overview)
- [Webhook Security Best Practices](https://docs.crossmint.com/webhooks/security)
- [Subscription Billing Patterns](https://stripe.com/docs/billing/subscriptions/overview)
- [NFT Membership Systems](https://docs.crossmint.com/nfts/memberships)

## Conclusion

The Crossmint payment and subscription system provides BlockDrive with a complete solution for stablecoin billing, recurring subscriptions, and NFT membership management. By leveraging USDC/USDT across multiple chains, we can offer users familiar payment methods while maintaining decentralization.

The webhook-driven architecture ensures that subscription state stays synchronized between Crossmint, Supabase, and on-chain NFT memberships. Failed payment handling with automatic retries and grace periods provides a professional billing experience, while NFT membership badges create verifiable proof of tier access that can be used across the entire BlockDrive ecosystem.
