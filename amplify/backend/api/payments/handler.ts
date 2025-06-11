import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // This handler will route to the Stripe payment function
  // For now, we'll include the Stripe logic directly here
  // In a larger app, you might route to different payment processors

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Route to stripe payment processing
  const { stripePaymentFunction } = await import('../../functions/lambda-stripe-payment/handler.js');
  return stripePaymentFunction.handler(event);
};