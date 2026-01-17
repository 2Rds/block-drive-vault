#!/usr/bin/env node
/**
 * Calculate estimated Cloudflare costs based on wrangler.toml and usage
 * Usage: node calculate-costs.js [path-to-wrangler.toml]
 */

import { readFileSync } from 'fs';
import { parse } from 'toml';
import { resolve } from 'path';

const filePath = process.argv[2] || 'wrangler.toml';

// Pricing constants (as of 2024)
const PRICING = {
  workers: {
    freeRequests: 100_000 * 30, // 100k/day * 30 days
    paidBase: 5, // $5/month
    paidRequests: 10_000_000, // included in paid plan
    overagePerMillion: 0.50
  },
  r2: {
    storagePerGB: 0.015,
    classAPerMillion: 4.50, // write, list
    classBPerMillion: 0.36  // read
  },
  kv: {
    storagePerGB: 0.50,
    freeReads: 100_000 * 30,
    freeWrites: 1_000 * 30,
    readsPerMillion: 0.50,
    writesPerMillion: 5.00
  },
  durableObjects: {
    requestsPerMillion: 0.15,
    gbSecondsPerMillion: 0.20
  }
};

try {
  const content = readFileSync(resolve(filePath), 'utf-8');
  const config = parse(content);

  console.log('Cloudflare Cost Estimation');
  console.log('=========================\n');

  let total = 0;

  // Workers
  console.log('Workers:');
  console.log('  Free tier: 100k requests/day (3M/month)');
  console.log('  Estimated: Need usage data for accurate estimate');
  console.log('  Cost: $0 (if under free tier)\n');

  // R2
  if (config.r2_buckets && config.r2_buckets.length > 0) {
    console.log(`R2 Storage (${config.r2_buckets.length} buckets):`);
    console.log('  Storage: Depends on usage');
    console.log('  Egress: FREE (always!)');
    console.log('  Operations: Depends on usage');
    console.log('  Estimated: $0.50-$5/month\n');
    total += 2; // rough estimate
  }

  // KV
  if (config.kv_namespaces && config.kv_namespaces.length > 0) {
    console.log(`KV Namespaces (${config.kv_namespaces.length}):`);
    console.log('  Free: 100k reads/day, 1k writes/day');
    console.log('  Estimated: $0 (if under free tier)\n');
  }

  // D1
  if (config.d1_databases && config.d1_databases.length > 0) {
    console.log(`D1 Databases (${config.d1_databases.length}):`);
    console.log('  Cost: FREE (beta)\n');
  }

  // Durable Objects
  if (config.durable_objects && config.durable_objects.bindings) {
    console.log(`Durable Objects (${config.durable_objects.bindings.length}):`);
    console.log('  ⚠️  Can be expensive - $0.15/million requests');
    console.log('  Use sparingly!');
    console.log('  Estimated: $5-$50/month depending on usage\n');
    total += 10; // rough estimate if using DOs
  }

  console.log('========================');
  console.log(`Estimated Total: $${total}/month`);
  console.log('\n💡 Tips:');
  console.log('- Stay under free tier limits where possible');
  console.log('- Use R2 instead of S3 to save on egress ($0.09/GB)');
  console.log('- Cache aggressively to reduce Worker invocations');
  console.log('- Batch KV writes to stay under 1k/day');
  console.log('\nFor detailed cost analysis, use Cloudflare dashboard Analytics → Billing');

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
