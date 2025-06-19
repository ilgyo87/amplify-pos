# Stripe Connect Setup Guide

## Environment Variables

To enable Stripe Connect functionality, you need to set the following environment variables before deploying your backend:

1. Create a `.env` file in the root of your project with:

```bash
# Your platform's Stripe Connect OAuth client ID
STRIPE_CLIENT_ID=ca_YOUR_STRIPE_CLIENT_ID_HERE

# Your platform's secret key (for server-side API calls)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Your platform's publishable key (for client-side tokenization)
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Redirect URL for Stripe Connect OAuth
FRONTEND_URL=https://stripe-callback.vercel.app
```

2. Deploy your backend with environment variables:

```bash
# Option 1: Use the deploy script
./deploy.sh

# Option 2: Manually export variables and deploy
export $(cat .env | grep -v '^#' | xargs)
npx ampx sandbox
```

## Production Deployment

For production deployments:

1. Set environment variables in your CI/CD pipeline
2. Or use AWS Secrets Manager to store sensitive values
3. Update the Lambda configuration in `amplify/backend.ts` to pull from Secrets Manager

## Testing

After deployment, test that environment variables are properly set:

```bash
# Get your Lambda URL from amplify_outputs.json
LAMBDA_URL=$(jq -r '.custom.stripeConnectApiEndpoint' amplify_outputs.json)

# Test the endpoint
curl -s "$LAMBDA_URL" | jq .
```

You should see `"hasStripeClientId": true` and `"hasStripeSecretKey": true` in the response.