// Removed specific type imports to handle both API Gateway and Function URL events
import Stripe from 'stripe';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const STRIPE_TOKENS_TABLE_NAME = process.env.STRIPE_TOKENS_TABLE_NAME;

export const handler = async (event: any): Promise<any> => {
  console.log('Stripe payment handler called', event);

  // Get HTTP method and path (Lambda function URLs use different properties)
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  const path = event.rawPath || event.path || '';
  console.log('HTTP method:', method, 'Path:', path);

  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Initialize Stripe with secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10',
    });

    const body = JSON.parse(event.body || '{}');

    // Handle refund requests
    if (path.includes('/refund')) {
      const { chargeId, amount, reason } = body;

      if (!chargeId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required field: chargeId' 
          })
        };
      }

      console.log(`Processing refund for charge: ${chargeId}`);

      const refundParams: any = {
        charge: chargeId,
        reason: reason || 'requested_by_customer'
      };

      // If amount is specified, use it (should be in cents)
      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await stripe.refunds.create(refundParams);

      console.log('Refund successful:', refund.id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          refundId: refund.id,
          amount: refund.amount / 100, // Convert back to dollars
          currency: refund.currency,
          status: refund.status,
          created: refund.created
        })
      };
    }

    // Handle payment requests (default)
    const { token, amount, description, metadata, userId } = body;

    // Validate required fields
    if (!token || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: token and amount' 
        })
      };
    }

    // Validate amount (should be in cents)
    const amountInCents = Math.round(amount * 100);
    if (amountInCents < 50) { // Stripe minimum is $0.50
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Amount must be at least $0.50' 
        })
      };
    }

    console.log(`Processing payment: $${amount} (${amountInCents} cents)`);

    // Get connected account ID if userId is provided
    let connectedAccountId = null;
    if (userId && STRIPE_TOKENS_TABLE_NAME) {
      try {
        const result = await docClient.send(new GetCommand({
          TableName: STRIPE_TOKENS_TABLE_NAME,
          Key: { userId }
        }));
        
        if (result.Item?.stripeAccountId) {
          connectedAccountId = result.Item.stripeAccountId;
          console.log('Using connected account:', connectedAccountId);
        }
      } catch (error) {
        console.log('Could not get connected account, proceeding with direct charge:', error);
      }
    }

    // Create the charge with destination if connected account exists
    const chargeParams: any = {
      amount: amountInCents,
      currency: 'usd',
      source: token,
      description: description || 'POS Transaction',
      metadata: metadata || {}
    };

    // If we have a connected account, use destination charges
    if (connectedAccountId) {
      // With destination charges, the platform charges the customer
      // and transfers funds to the connected account
      chargeParams.destination = {
        account: connectedAccountId,
        amount: Math.round(amountInCents * 0.95) // Keep 5% as platform fee
      };
    }

    const charge = await stripe.charges.create(chargeParams);

    console.log('Payment successful:', charge.id);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        chargeId: charge.id,
        amount: charge.amount / 100, // Convert back to dollars
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
        receipt_url: charge.receipt_url
      })
    };

  } catch (error: any) {
    console.error('Stripe payment error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Card was declined',
          message: error.message,
          decline_code: error.decline_code
        })
      };
    }

    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid request',
          message: error.message
        })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Payment processing failed',
        message: error.message || 'Unknown error occurred'
      })
    };
  }
};