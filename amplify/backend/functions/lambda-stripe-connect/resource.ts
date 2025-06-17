import { defineFunction } from '@aws-amplify/backend';

export const stripeConnectFunction = defineFunction({
  name: 'stripeConnectHandler',
  entry: './handler.ts',
  runtime: 20,
  memoryMB: 512,
  timeoutSeconds: 30
});
