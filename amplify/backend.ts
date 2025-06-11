import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { stripePaymentFunction } from './backend/functions/lambda-stripe-payment/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  stripePaymentFunction,
});

// Create API Gateway for the Stripe payment function
backend.stripePaymentFunction.addHttpApi({
  path: '/payment/stripe',
  methods: ['POST', 'OPTIONS']
});
