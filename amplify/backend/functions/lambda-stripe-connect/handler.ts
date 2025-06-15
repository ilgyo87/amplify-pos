import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import Stripe from 'stripe';
import axios from 'axios';
import * as querystring from 'querystring';

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // Default to localhost for development
const STRIPE_TOKENS_TABLE_NAME = process.env.STRIPE_TOKENS_TABLE_NAME!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Only initialize Stripe if we have the secret key
let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.includes('YOUR_SECRET_KEY_HERE')) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10',
  });
}


export const handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Debug environment variables (without exposing sensitive data)
  console.log('Environment check:', {
    STRIPE_CLIENT_ID: STRIPE_CLIENT_ID ? STRIPE_CLIENT_ID.substring(0, 10) + '...' : 'undefined',
    STRIPE_SECRET_KEY: STRIPE_SECRET_KEY ? STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'undefined',
    FRONTEND_URL: FRONTEND_URL || 'undefined',
    STRIPE_TOKENS_TABLE_NAME: STRIPE_TOKENS_TABLE_NAME || 'undefined'
  });

  // Check if Stripe is properly configured
  if (!STRIPE_CLIENT_ID || !STRIPE_SECRET_KEY || !FRONTEND_URL ||
      STRIPE_CLIENT_ID.includes('YOUR_CLIENT_ID_HERE') || 
      STRIPE_SECRET_KEY.includes('YOUR_SECRET_KEY_HERE') ||
      FRONTEND_URL.includes('YOUR_EXPO_URL_HERE')) {
    console.error('Stripe environment variables not properly configured');
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Stripe service not configured',
        message: 'Contact administrator to configure Stripe environment variables'
      })
    };
  }

  // Handle both API Gateway and Function URL events
  const path = event.rawPath || event.path || '';
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  let userId = event.queryStringParameters?.userId;

  console.log(`Processing request - Path: "${path}", Method: "${method}"`);

  if (!userId && event.body) {
    try {
      const body = JSON.parse(event.body);
      userId = body.userId;
    } catch (e) {
      console.error('Error parsing userId from body', e);
    }
  }

  // Fallback userId for testing if not provided - REMOVE FOR PRODUCTION or secure properly
  if (!userId) {
    console.warn('UserId not found in request, using demo-user. Secure this for production!');
    userId = 'demo-user'; 
  }

  // Normalize path by removing trailing slashes and handling different formats
  const normalizedPath = path.replace(/\/+$/, '').toLowerCase();
  console.log(`Normalized path: "${normalizedPath}"`);

  // 1. Get Stripe Connect onboarding URL
  if ((normalizedPath.includes('connect/authorize') || normalizedPath.includes('authorize')) && method === 'GET') {
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
    }
    const params = querystring.stringify({
      response_type: 'code',
      client_id: STRIPE_CLIENT_ID,
      scope: 'read_write',
      redirect_uri: `${FRONTEND_URL}/stripe-connect-callback?userId=${userId}`,
      state: userId, // Using userId as state for verification on callback
    });
    const url = `https://connect.stripe.com/oauth/authorize?${params}`;
    console.log(`Generated Stripe Connect URL for userId ${userId}: ${url}`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Adjust CORS as needed
      body: JSON.stringify({ url }),
    };
  }

  // 2. Handle Stripe Connect OAuth callback
  if (normalizedPath.endsWith('/connect/callback') && method === 'POST') {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Request body is missing' }) };
    }
    try {
      const body = JSON.parse(event.body);
      const { code, userId: callbackUserId } = body;

      if (!code || !callbackUserId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing code or userId in request body' }) };
      }
      
      console.log(`Processing callback for userId ${callbackUserId} with code ${code}`);

      const response = await axios.post('https://connect.stripe.com/oauth/token', null, {
        params: {
          client_secret: STRIPE_SECRET_KEY,
          code,
          grant_type: 'authorization_code',
        },
      });

      const { access_token, stripe_user_id } = response.data;
      if (!access_token || !stripe_user_id) {
        console.error('Stripe token exchange failed, missing access_token or stripe_user_id', response.data);
        return { statusCode: 500, body: JSON.stringify({ error: 'Stripe token exchange failed' }) };
      }

      const putCommand = new PutCommand({
        TableName: STRIPE_TOKENS_TABLE_NAME,
        Item: {
          userId: callbackUserId,
          accessToken: access_token,
          stripeUserId: stripe_user_id,
          createdAt: new Date().toISOString(),
        },
      });
      await docClient.send(putCommand);
      console.log(`Stored Stripe token for userId ${callbackUserId}, stripeUserId ${stripe_user_id}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Adjust CORS
        body: JSON.stringify({ success: true, stripeUserId: stripe_user_id }),
      };
    } catch (err: any) {
      console.error('Error in /connect/callback:', err.response?.data || err.message);
      return {
        statusCode: err.response?.status || 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Adjust CORS
        body: JSON.stringify({ error: err.response?.data?.error_description || err.message || 'Failed to process Stripe callback' }),
      };
    }
  }

  // 3. Create a connection token for the connected account
  if (normalizedPath.endsWith('/connection_token') && method === 'POST') {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Request body is missing' }) };
    }
    try {
      const body = JSON.parse(event.body);
      const { userId: tokenUserId } = body;

      if (!tokenUserId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId in request body' }) };
      }

      console.log(`Fetching connection token for userId ${tokenUserId}`);
      const getCommand = new GetCommand({
        TableName: STRIPE_TOKENS_TABLE_NAME,
        Key: { userId: tokenUserId },
      });
      const result = await docClient.send(getCommand);

      if (!result.Item || !result.Item.accessToken) {
        console.warn(`No Stripe token found for userId ${tokenUserId}`);
        return { statusCode: 404, body: JSON.stringify({ error: 'Stripe account not connected or token not found' }) };
      }

      // Use the stored access token to make calls on behalf of the connected account
      const connectedStripe = new Stripe(result.Item.accessToken);
      const connectionToken = await connectedStripe.terminal.connectionTokens.create();
      console.log(`Generated connection token for userId ${tokenUserId}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Adjust CORS
        body: JSON.stringify({ secret: connectionToken.secret }),
      };
    } catch (err: any) {
      console.error('Error in /connection_token:', err.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Adjust CORS
        body: JSON.stringify({ error: err.message || 'Failed to create connection token' }),
      };
    }
  }

  // 4. Create payment intent with Stripe Connect (direct charge model)
  if (normalizedPath.endsWith('/create_payment_intent') && method === 'POST') {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Request body is missing' }) };
    }
    try {
      const body = JSON.parse(event.body);
      const { amount, currency = 'usd', userId: paymentUserId, application_fee_amount, description, metadata } = body;

      if (!paymentUserId || !amount) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: userId, amount' }) };
      }

      console.log(`Creating payment intent for userId ${paymentUserId}, amount: ${amount}, fee: ${application_fee_amount}`);
      
      // Get the connected account info
      const getCommand = new GetCommand({
        TableName: STRIPE_TOKENS_TABLE_NAME,
        Key: { userId: paymentUserId },
      });
      const result = await docClient.send(getCommand);

      if (!result.Item || !result.Item.stripeUserId) {
        console.warn(`No connected Stripe account found for userId ${paymentUserId}`);
        return { statusCode: 404, body: JSON.stringify({ error: 'Stripe account not connected' }) };
      }

      if (!stripe) {
        return { statusCode: 503, body: JSON.stringify({ error: 'Stripe not configured' }) };
      }

      // Create payment intent with direct charge model
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        application_fee_amount: application_fee_amount || 1, // Default $0.01 platform fee
        on_behalf_of: result.Item.stripeUserId, // Connected account
        transfer_data: {
          destination: result.Item.stripeUserId,
        },
        description: description || 'POS Terminal Payment',
        metadata: {
          platform_user_id: paymentUserId,
          connected_account: result.Item.stripeUserId,
          ...metadata
        },
        // Enable for Terminal usage
        payment_method_types: ['card_present'],
        capture_method: 'automatic',
      });

      console.log(`Payment intent created: ${paymentIntent.id} for connected account ${result.Item.stripeUserId}`);
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          application_fee_amount: paymentIntent.application_fee_amount,
          on_behalf_of: paymentIntent.on_behalf_of,
          status: paymentIntent.status
        }),
      };
    } catch (err: any) {
      console.error('Error in /create_payment_intent:', err.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message || 'Failed to create payment intent' }),
      };
    }
  }

  // 5. Get connected account information
  if (normalizedPath.endsWith('/account_info') && method === 'GET') {
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
    }
    try {
      console.log(`Fetching account info for userId ${userId}`);
      const getCommand = new GetCommand({
        TableName: STRIPE_TOKENS_TABLE_NAME,
        Key: { userId },
      });
      const result = await docClient.send(getCommand);

      if (!result.Item || !result.Item.stripeUserId) {
        console.warn(`No connected Stripe account found for userId ${userId}`);
        return { statusCode: 404, body: JSON.stringify({ error: 'Stripe account not connected' }) };
      }

      if (!stripe) {
        return { statusCode: 503, body: JSON.stringify({ error: 'Stripe not configured' }) };
      }

      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(result.Item.stripeUserId);
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          id: account.id,
          type: account.type,
          country: account.country,
          default_currency: account.default_currency,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          business_profile: {
            name: account.business_profile?.name,
            url: account.business_profile?.url,
          },
          requirements: {
            currently_due: account.requirements?.currently_due,
            disabled_reason: account.requirements?.disabled_reason,
          }
        }),
      };
    } catch (err: any) {
      console.error('Error in /account_info:', err.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message || 'Failed to get account info' }),
      };
    }
  }

  console.log(`No matching route for path: ${path} and method: ${method}`);
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Adjust CORS
    body: JSON.stringify({ error: 'Not Found' }),
  };
};
