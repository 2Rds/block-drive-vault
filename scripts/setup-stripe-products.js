#!/usr/bin/env node
/**
 * BlockDrive Stripe Products & Prices Setup Script
 *
 * Creates all subscription products and prices in Stripe.
 * Run with: STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe-products.js
 *
 * For test mode, use your test secret key (sk_test_...)
 * For production, use your live secret key (sk_live_...)
 */

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  console.error('   Usage: STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.js');
  process.exit(1);
}

// Product definitions matching pricingTiers.ts
const PRODUCTS = [
  {
    name: 'Pro',
    description: 'Perfect for personal use with 7-day free trial',
    metadata: {
      storage: '200 GB',
      bandwidth: '200 GB',
      seats: '1',
      hasTrial: 'true'
    },
    prices: [
      { interval: 'month', interval_count: 1, amount: 900, nickname: 'Pro Monthly' },
      { interval: 'month', interval_count: 3, amount: 2400, nickname: 'Pro Quarterly' },
      { interval: 'year', interval_count: 1, amount: 8900, nickname: 'Pro Annual' }
    ]
  },
  {
    name: 'Power',
    description: 'Enhanced storage for power users',
    metadata: {
      storage: '2 TB',
      bandwidth: '2 TB',
      seats: '1',
      hasTrial: 'false'
    },
    prices: [
      { interval: 'month', interval_count: 1, amount: 4900, nickname: 'Power Monthly' },
      { interval: 'month', interval_count: 3, amount: 13400, nickname: 'Power Quarterly' },
      { interval: 'year', interval_count: 1, amount: 49900, nickname: 'Power Annual' }
    ]
  },
  {
    name: 'Scale',
    description: 'Per-seat pricing for teams (2 seat minimum)',
    metadata: {
      storage: '1 TB',
      bandwidth: '1 TB',
      seats: '2+',
      hasTrial: 'false',
      popular: 'true',
      perSeat: 'true'
    },
    prices: [
      { interval: 'month', interval_count: 1, amount: 2900, nickname: 'Scale Monthly (per seat)' },
      { interval: 'month', interval_count: 3, amount: 7900, nickname: 'Scale Quarterly (per seat)' },
      { interval: 'year', interval_count: 1, amount: 29900, nickname: 'Scale Annual (per seat)' }
    ]
  }
];

async function stripeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(`${STRIPE_API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Stripe API error: ${JSON.stringify(data.error)}`);
  }

  return data;
}

async function createProduct(productData) {
  console.log(`\n📦 Creating product: ${productData.name}`);

  // Create the product
  const productParams = {
    name: `BlockDrive ${productData.name}`,
    description: productData.description,
    active: 'true',
  };

  // Add metadata
  for (const [key, value] of Object.entries(productData.metadata)) {
    productParams[`metadata[${key}]`] = value;
  }

  const product = await stripeRequest('/products', 'POST', productParams);
  console.log(`   ✅ Product created: ${product.id}`);

  // Create prices for this product
  const createdPrices = [];
  for (const priceData of productData.prices) {
    const priceParams = {
      product: product.id,
      currency: 'usd',
      unit_amount: priceData.amount.toString(),
      nickname: priceData.nickname,
      'recurring[interval]': priceData.interval,
      'recurring[interval_count]': priceData.interval_count.toString(),
    };

    const price = await stripeRequest('/prices', 'POST', priceParams);
    console.log(`   💰 Price created: ${price.nickname} - $${(priceData.amount / 100).toFixed(0)} → ${price.id}`);

    createdPrices.push({
      period: priceData.interval_count === 3 ? 'quarterly' : priceData.interval === 'month' ? 'monthly' : 'annual',
      priceId: price.id,
      amount: priceData.amount
    });
  }

  return {
    productId: product.id,
    productName: productData.name,
    prices: createdPrices
  };
}

async function main() {
  console.log('🚀 BlockDrive Stripe Products Setup');
  console.log('====================================');
  console.log(`   Mode: ${STRIPE_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);

  try {
    const results = [];

    for (const product of PRODUCTS) {
      const result = await createProduct(product);
      results.push(result);
    }

    console.log('\n\n✅ All products and prices created successfully!\n');
    console.log('====================================');
    console.log('📝 Update your pricingTiers.ts with these price IDs:\n');

    // Generate the pricingTiers.ts update
    for (const result of results) {
      console.log(`// ${result.productName}`);
      for (const price of result.prices) {
        console.log(`//   ${price.period}: '${price.priceId}'`);
      }
      console.log('');
    }

    // Generate copy-paste ready format
    console.log('\n📋 Copy-paste format for pricingTiers.ts:\n');
    console.log('export const pricingTiers: PricingTier[] = [');

    for (const result of results) {
      const productDef = PRODUCTS.find(p => p.name === result.productName);
      console.log(`  {`);
      console.log(`    name: '${result.productName}',`);
      console.log(`    pricing: [`);

      for (const price of result.prices) {
        const periodLabel = price.period;
        const dollarAmount = price.amount / 100;
        const savings = periodLabel === 'quarterly'
          ? ", savings: 'Save 9%'"
          : periodLabel === 'annual'
            ? ", savings: 'Save 15%'"
            : '';

        console.log(`      {`);
        console.log(`        period: '${periodLabel}',`);
        console.log(`        price: '$${dollarAmount}',`);
        console.log(`        priceId: '${price.priceId}',`);
        console.log(`        paymentLink: '${price.priceId}'${savings}`);
        console.log(`      },`);
      }

      console.log(`    ],`);
      console.log(`    description: '${productDef.description}',`);
      console.log(`    storage: '${productDef.metadata.storage}',`);
      console.log(`    bandwidth: '${productDef.metadata.bandwidth}',`);
      console.log(`    seats: '${productDef.metadata.seats === '1' ? '1 user' : productDef.metadata.seats + ' users'}',`);
      if (productDef.metadata.hasTrial === 'true') {
        console.log(`    hasTrial: true,`);
      }
      if (productDef.metadata.popular === 'true') {
        console.log(`    popular: true,`);
      }
      console.log(`    features: [`);
      console.log(`      // Add your features here`);
      console.log(`    ]`);
      console.log(`  },`);
    }

    console.log('];');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
