import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Stripe payment handler called', event);

  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
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
      apiVersion: '2024-06-20',
    });

    const body = JSON.parse(event.body || '{}');
    const { token, amount, description, metadata } = body;

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

    // Create the charge
    const charge = await stripe.charges.create({
      amount: amountInCents,
      currency: 'usd',
      source: token,
      description: description || 'POS Transaction',
      metadata: metadata || {}
    });

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