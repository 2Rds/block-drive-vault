#!/usr/bin/env node
/**
 * Validate wrangler.toml syntax and configuration
 * Usage: node validate-wrangler-toml.js <path-to-wrangler.toml>
 */

import { readFileSync } from 'fs';
import { parse } from 'toml';
import { resolve } from 'path';

const filePath = process.argv[2] || 'wrangler.toml';

try {
  const content = readFileSync(resolve(filePath), 'utf-8');
  const config = parse(content);

  console.log('✅ Valid TOML syntax');

  // Check required fields
  const required = ['name'];
  const missing = required.filter(field => !config[field]);

  if (missing.length > 0) {
    console.log(`⚠️  Missing required fields: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Check recommended fields
  if (!config.main && !config.site) {
    console.log('⚠️  Missing "main" field (entry point)');
  }

  if (!config.compatibility_date) {
    console.log('⚠️  Missing "compatibility_date" field');
  }

  console.log(`\nWorker: ${config.name}`);
  if (config.main) console.log(`Entry: ${config.main}`);
  if (config.compatibility_date) console.log(`Compat: ${config.compatibility_date}`);

  // List bindings
  if (config.kv_namespaces) {
    console.log(`\nKV Namespaces: ${config.kv_namespaces.length}`);
  }
  if (config.d1_databases) {
    console.log(`D1 Databases: ${config.d1_databases.length}`);
  }
  if (config.r2_buckets) {
    console.log(`R2 Buckets: ${config.r2_buckets.length}`);
  }
  if (config.durable_objects) {
    console.log(`Durable Objects: ${config.durable_objects.bindings?.length || 0}`);
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}
