import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import Stripe from 'stripe';
import axios from 'axios';
import * as querystring from 'querystring';

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const FRONTEND_URL = process.env.FRONTEND_URL!;
const STRIPE_TOKENS_TABLE_NAME = process.env.STRIPE_TOKENS_TABLE_NAME!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

interface EventRequest {
  path: string;
  httpMethod: string;
  queryStringParameters?: { [key: string]: string };
  body?: string;
}

export const handler = async (event: EventRequest) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const path = event.path || '';
  const method = event.httpMethod || '';
  let userId = event.queryStringParameters?.userId;

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

  // 1. Get Stripe Connect onboarding URL
  if (path.endsWith('/connect/authorize') && method === 'GET') {
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
  if (path.endsWith('/connect/callback') && method === 'POST') {
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
  if (path.endsWith('/connection_token') && method === 'POST') {
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

  console.log(`No matching route for path: ${path} and method: ${method}`);
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Adjust CORS
    body: JSON.stringify({ error: 'Not Found' }),
  };
};
