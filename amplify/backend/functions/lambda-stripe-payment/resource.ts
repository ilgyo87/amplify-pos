import { defineFunction, secret } from '@aws-amplify/backend';

export const stripePaymentFunction = defineFunction({
  name: 'stripe-payment',
  entry: './handler.ts',
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY')
  },
  timeoutSeconds: 30,
});