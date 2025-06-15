import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType, HttpMethod, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { stripePaymentFunction } from './backend/functions/lambda-stripe-payment/resource';
import { emailNotificationFunction } from './backend/functions/lambda-email-notification/resource';
import { smsNotificationFunction } from './backend/functions/lambda-sms-notification/resource';
import { stripeConnectFunction } from './backend/functions/lambda-stripe-connect/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  stripePaymentFunction,
  emailNotificationFunction,
  smsNotificationFunction,
  stripeConnectFunction,
});

// Add SES permissions to email notification function
backend.emailNotificationFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

// Grant stripeConnectFunction access to the StripeToken table
const stripeTokenTableName = backend.data.resources.tables.StripeToken.tableName;
backend.stripeConnectFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
    resources: [`arn:aws:dynamodb:*:*:table/${stripeTokenTableName}`,
                `arn:aws:dynamodb:*:*:table/${stripeTokenTableName}/index/*`], // if you add indexes later
  })
);

// Pass environment variables to stripeConnectFunction
const stripeConnectLambda = backend.stripeConnectFunction.resources.lambda as LambdaFunction;
stripeConnectLambda.addEnvironment('STRIPE_TOKENS_TABLE_NAME', stripeTokenTableName);

// Add Stripe environment variables from process.env
// Set these in your deployment environment or use AWS Secrets Manager
stripeConnectLambda.addEnvironment('STRIPE_CLIENT_ID', process.env.STRIPE_CLIENT_ID || 'your-stripe-client-id');
stripeConnectLambda.addEnvironment('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY || 'your-stripe-secret-key');
stripeConnectLambda.addEnvironment('FRONTEND_URL', process.env.FRONTEND_URL || 'https://example.com');

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
const stripeApi = backend.stripeConnectFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.GET, HttpMethod.POST],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
    allowCredentials: false,
    maxAge: Duration.seconds(86400)
  }
});

backend.addOutput({
  custom: {
    emailNotificationUrl: emailFunctionUrl.url,
    smsNotificationUrl: smsFunctionUrl.url,
    stripeConnectApiEndpoint: stripeApi.url
  }
});