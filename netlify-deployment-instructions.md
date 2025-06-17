# Deploy Stripe Connect Callback Page

## Quick Setup (5 minutes)

### Option 1: Netlify (Recommended - Free)

1. Go to [netlify.com](https://netlify.com)
2. Sign up for a free account
3. Drag and drop the `public/stripe-callback.html` file to the deploy area
4. Netlify will give you a URL like: `https://amazing-name-123456.netlify.app`
5. Your callback URL will be: `https://amazing-name-123456.netlify.app/stripe-callback.html`

### Option 2: Vercel (Alternative - Free)

1. Go to [vercel.com](https://vercel.com)
2. Sign up for a free account  
3. Upload the `public/stripe-callback.html` file
4. Get your URL like: `https://your-project.vercel.app/stripe-callback.html`

### Option 3: GitHub Pages (Alternative - Free)

1. Create a new GitHub repository
2. Upload `stripe-callback.html` to the root
3. Enable GitHub Pages in repository settings
4. Your URL will be: `https://yourusername.github.io/repo-name/stripe-callback.html`

## Update Your Lambda Function

Once you have your callback URL, update your Lambda environment variable:

```bash
STRIPE_CLIENT_ID=your-stripe-client-id \
STRIPE_SECRET_KEY=your-stripe-secret-key \
FRONTEND_URL=https://your-actual-callback-url.netlify.app \
npx ampx sandbox --once
```

## Update Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Connect** → **Settings**
3. Replace `https://httpbin.org/stripe-connect-callback` with your new URL
4. Add: `https://your-actual-callback-url.netlify.app/stripe-callback.html`

## Testing

1. Use your app's "Connect to Stripe" feature
2. Complete OAuth on Stripe's website
3. You should be redirected to your callback page
4. The page will automatically deep link back to your app
5. Check console logs for "✅ Stripe Connect setup completed successfully!"

## Troubleshooting

- If automatic redirect doesn't work, tap the "Open App" button on the callback page
- Check that your app's URL scheme (`amplifypos://`) is properly configured
- Verify the callback URL exactly matches what's in your Stripe dashboard settings