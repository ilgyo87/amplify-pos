import { defineFunction } from '@aws-amplify/backend';

export const smsNotificationFunction = defineFunction({
  name: 'sms-notification',
  entry: './handler.ts',
  timeoutSeconds: 30,
});