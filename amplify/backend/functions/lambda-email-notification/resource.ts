import { defineFunction } from '@aws-amplify/backend';

export const emailNotificationFunction = defineFunction({
  name: 'email-notification',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    FROM_EMAIL: 'dry.cleaning.services.pos@gmail.com'
  }
});