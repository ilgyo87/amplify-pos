import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { stripePaymentFunction } from './backend/functions/lambda-stripe-payment/resource';
import { emailNotificationFunction } from './backend/functions/lambda-email-notification/resource';
import { smsNotificationFunction } from './backend/functions/lambda-sms-notification/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  stripePaymentFunction,
  emailNotificationFunction,
  smsNotificationFunction,
});

// Add SES permissions to email notification function
backend.emailNotificationFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

// Add SNS permissions to SMS notification function
backend.smsNotificationFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['sns:Publish'],
    resources: ['*'],
  })
);

// Add function URLs for HTTP access
const emailFunctionUrl = backend.emailNotificationFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowCredentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    allowedMethods: [HttpMethod.POST],
    allowedOrigins: ['*'],
    maxAge: Duration.seconds(86400)
  }
});

const smsFunctionUrl = backend.smsNotificationFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowCredentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    allowedMethods: [HttpMethod.POST],
    allowedOrigins: ['*'],
    maxAge: Duration.seconds(86400)
  }
});

// Add function URLs to outputs
backend.addOutput({
  custom: {
    emailNotificationUrl: emailFunctionUrl.url,
    smsNotificationUrl: smsFunctionUrl.url
  }
});
