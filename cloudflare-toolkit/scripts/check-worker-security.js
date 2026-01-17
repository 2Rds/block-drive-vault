#!/usr/bin/env node
/**
 * Basic security scan for Worker code
 * Usage: node check-worker-security.js <path-to-worker.js>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node check-worker-security.js <path-to-worker-file>');
  process.exit(1);
}

const SECURITY_CHECKS = [
  {
    name: 'Hardcoded Secrets',
    pattern: /(api[_-]?key|password|secret|token)\s*=\s*['"][^'"]+['"]/gi,
    severity: 'HIGH',
    message: 'Possible hardcoded secret found. Use wrangler secrets instead.'
  },
  {
    name: 'SQL Injection Risk',
    pattern: /env\.DB\.prepare\([^?]*\$\{/g,
    severity: 'HIGH',
    message: 'Possible SQL injection. Use parameterized queries with .bind()'
  },
  {
    name: 'Missing Input Validation',
    pattern: /await request\.(json|formData)\(\)[^;]*;[\s\S]{0,100}(?!if|const.*=.*validate|const.*=.*check)/,
    severity: 'MEDIUM',
    message: 'Input from request not validated before use'
  },
  {
    name: 'Open CORS',
    pattern: /['"]Access-Control-Allow-Origin['"]:\s*['"][*]['"]/g,
    severity: 'MEDIUM',
    message: 'CORS allows all origins (*). Consider restricting to specific domains.'
  },
  {
    name: 'Missing Rate Limiting',
    pattern: /(?<!rate|limit|throttle).*fetch.*request/gi,
    severity: 'LOW',
    message: 'Consider adding rate limiting for public endpoints'
  }
];

try {
  const content = readFileSync(resolve(filePath), 'utf-8');

  console.log(chalk.bold('\n🔒 Security Scan Results\n'));

  let issuesFound = 0;

  for (const check of SECURITY_CHECKS) {
    const matches = content.match(check.pattern);
    if (matches) {
      issuesFound++;
      const color = check.severity === 'HIGH' ? chalk.red :
                   check.severity === 'MEDIUM' ? chalk.yellow :
                   chalk.blue;

      console.log(color(`[${check.severity}] ${check.name}`));
      console.log(`  ${check.message}`);
      console.log(`  Found ${matches.length} occurrence(s)\n`);
    }
  }

  if (issuesFound === 0) {
    console.log(chalk.green('✅ No obvious security issues found\n'));
  } else {
    console.log(chalk.yellow(`⚠️  Found ${issuesFound} potential security issues\n`));
    console.log('Recommendations:');
    console.log('- Review each issue carefully');
    console.log('- Use wrangler secrets for sensitive data');
    console.log('- Validate all user input');
    console.log('- Consider using the waf-security-engineer agent for comprehensive review\n');
  }

} catch (error) {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
}
