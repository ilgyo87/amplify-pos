# Stripe Implementation Guide for Amplify POS

## Overview

This POS system supports two payment processing modes:

1. **Direct Stripe Integration**: Users enter their own Stripe API keys
2. **Stripe Connect (Optional)**: Platform-managed payments with revenue sharing

## Option 1: Direct Stripe Integration (Recommended for Independent Merchants)

### How it Works
- Each user enters their own Stripe publishable and secret keys
- Payments go directly to the user's Stripe account
- User manages their own disputes, refunds, and customer relationships
- No platform fees or involvement

### Setup Steps
1. User creates their own Stripe account at https://stripe.com
2. Gets API keys from https://dashboard.stripe.com/test/apikeys
3. Enters keys in Settings → Payment Settings
4. All payments process directly through their account

### Benefits
- Full control over payment processing
- Direct relationship with Stripe
- No platform fees
- Complete financial independence

### Limitations
- User must handle their own Stripe setup
- No centralized reporting across multiple locations
- Each location needs its own Stripe account

## Option 2: Stripe Connect (For Multi-Location Platforms)

### How it Works
- Platform (you) has a main Stripe account
- Users connect their Stripe accounts to your platform
- Platform can take a percentage fee (e.g., 5%)
- Centralized reporting and management

### Requirements
- Platform must have a Stripe account with Connect enabled
- Platform must set environment variables:
  - `STRIPE_CLIENT_ID`: Your Connect OAuth client ID
  - `STRIPE_SECRET_KEY`: Your platform's secret key
  - `STRIPE_PUBLISHABLE_KEY`: Your platform's publishable key

### Setup for Platform Owner
```bash
# Set environment variables in AWS Amplify Console
STRIPE_CLIENT_ID=ca_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx  
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### User Flow
1. User clicks "Connect with Stripe" in Settings
2. Creates or connects their Stripe account
3. Platform processes payments on their behalf
4. Money goes to user's account minus platform fee

## Current Implementation Status

✅ Direct Stripe Integration - Fully Working
- Users can enter their own keys
- Process payments directly

⚠️ Stripe Connect - Requires Platform Configuration
- Code is ready but needs platform keys
- Platform owner must configure environment variables

## Choosing the Right Option

### Use Direct Integration if:
- Single location business
- Want full control over payments
- Don't want platform fees
- Prefer direct Stripe relationship

### Use Stripe Connect if:
- Running a multi-location platform
- Want centralized reporting
- Need to collect platform fees
- Want simplified merchant onboarding

## Security Notes

- Never hardcode API keys in the application
- Use environment variables for platform keys
- Each user's keys are stored securely in their device
- Keys are never sent to the platform