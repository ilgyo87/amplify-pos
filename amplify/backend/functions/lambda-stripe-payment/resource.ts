import { defineFunction } from '@aws-amplify/backend';

export const stripePaymentFunction = defineFunction({
  name: 'stripe-payment',
  entry: './handler.ts',
  timeoutSeconds: 30,
});