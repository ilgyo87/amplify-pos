import { defineFunction } from '@aws-amplify/backend';
import { stripePaymentFunction } from '../../functions/lambda-stripe-payment/resource.js';

export const paymentsApi = defineFunction({
  name: 'payments-api',
  entry: './handler.ts',
  environment: {
    STRIPE_PAYMENT_FUNCTION_NAME: stripePaymentFunction.name
  }
});