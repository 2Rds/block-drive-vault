---
cloudflare_account_id: "0804701ffff5f5a40649e79e868ea832"
cloudflare_api_token: "7770f2a427477b544e5b8b63191f95fcdcd07"
default_zone_id: "d4892661d2cc1a9be94ba9325b732f12"
enable_cost_warnings: true
---

# Cloudflare Configuration

This file stores your Cloudflare account credentials and preferences for the Cloudflare Toolkit plugin.

## Account Information

- **Account ID**: 0804701ffff5f5a40649e79e868ea832
- **API Token**: Configured (keep this file secure!)

## Settings

- **Cost Warnings**: Enabled - You'll see cost estimates before deploying
- **Free Tier Tracking**: Automatic - Plugin monitors usage against free tier limits

## Usage

The Cloudflare Toolkit plugin uses these credentials to:
- Fetch real usage data for cost calculations
- Deploy Workers to your account
- Configure WAF rules and Zero Trust policies
- Access analytics and logs

## Security

⚠️ **Keep this file secure**:
- Already in `.gitignore` (won't be committed)
- Contains sensitive API token
- Scoped to this project only

## Next Steps

1. Test the configuration:
   - Try `/cloudflare:cost-check` to see real usage data
   - Use `/cloudflare:deploy` to deploy Workers

2. Get your zone ID (optional):
   - Go to Cloudflare dashboard → Your domain → Overview
   - Copy the Zone ID
   - Add `default_zone_id: "your-zone-id"` above

3. Set preferences (optional):
   - Add `preferred_region: "us-east-1"` for default Worker region
   - Add `default_worker_name: "blockdrive-api"` for default names

## Troubleshooting

If commands fail with authentication errors:
- Verify API token has correct permissions (Workers, R2, D1, etc.)
- Check account ID is correct
- Ensure token hasn't expired
