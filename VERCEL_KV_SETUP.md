# Vercel KV Setup Instructions

## Required Environment Variables

Add these to your Vercel project settings:

```bash
# Vercel KV (Redis) - for distributed rate limiting
KV_REST_API_URL=https://your-kv-instance.kv.vercel-storage.com
KV_REST_API_TOKEN=your-kv-token
```

## How to Get These Values

### Option 1: Vercel Dashboard (Recommended)
1. Go to your Vercel project
2. Navigate to **Storage** tab
3. Click **Create Database** → **KV** (Redis)
4. Name it: `pms-rate-limiting`
5. Click **Create**
6. Vercel automatically adds the env vars to your project ✅

### Option 2: Vercel CLI
```bash
vercel env pull .env.local
```

This will download all environment variables including KV credentials.

## Local Development

**Without Vercel KV** (default):
- Rate limiting falls back to in-memory Map
- Works fine for local testing
- Not distributed, but that's okay locally

**With Vercel KV** (optional):
1. Create `.env.local` file
2. Add the KV environment variables
3. Run `npm run dev`

## Verify It's Working

### Check Rate Limiting
```bash
# Make 61 rapid requests to test rate limiting
for i in {1..61}; do curl http://localhost:3000/api/ledger; done
```

Expected: 61st request returns `429 Too Many Requests`

### Check Health Monitoring
```bash
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  http://localhost:3000/api/admin/health
```

Should now show:
- ✅ Stripe API connectivity
- ✅ Webhook processing health
- ✅ Database pool metrics

## Production Deployment

1. **Create Vercel KV database** (one-time setup)
2. **Deploy to Vercel**
3. Environment variables automatically set ✅
4. Distributed rate limiting active across all serverless instances

## Cost

**Vercel KV Pricing**:
- Hobby plan: 256 MB free (sufficient for rate limiting)
- Scales automatically with your usage

Rate limiting uses minimal storage (~1KB per IP address).
