import { defineFunction } from '@aws-amplify/backend';

export const stripeConnectFunction = defineFunction({
  name: 'stripeConnectHandler',
  entry: './handler.ts',
});
