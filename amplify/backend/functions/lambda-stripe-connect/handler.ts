import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import Stripe from 'stripe';
import axios from 'axios';

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'amplifypos://stripe-connect-callback';
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
  console.log('=== LAMBDA START ===');
  console.log('Event keys:', Object.keys(event));
  console.log('Method:', event.requestContext?.http?.method || event.httpMethod);
  console.log('Path:', event.rawPath || event.path);
  
  try {
    // Simple test response for now
    const path = event.rawPath || event.path || '';
    const method = event.requestContext?.http?.method || event.httpMethod || '';
    
    // 1. Get Stripe Connect authorization URL
    if ((path.includes('connect/authorize') || path.includes('authorize')) && method === 'GET') {
      console.log('Processing authorize request');
      
      let userId = event.queryStringParameters?.userId;
      if (!userId) {
        console.log('No userId found, using demo-user');
        userId = 'demo-user';
      }
      
      if (!STRIPE_CLIENT_ID) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Stripe client ID not configured' })
        };
      }
      
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: STRIPE_CLIENT_ID,
        scope: 'read_write',
        redirect_uri: FRONTEND_URL,
        state: userId,
      }).toString();
      
      const url = `https://connect.stripe.com/oauth/authorize?${params}`;
      console.log(`Generated Stripe Connect URL for userId ${userId}: ${url}`);
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ url })
      };
    }
    
    // 2. Get account info
    if (path.includes('/account_info') && method === 'GET') {
      console.log('Processing account info request');
      
      const userId = event.queryStringParameters?.userId;
      if (!userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Missing userId parameter' })
        };
      }
      
      try {
        // Get the stored Stripe account info from DynamoDB
        const getParams = {
          TableName: STRIPE_TOKENS_TABLE_NAME,
          Key: {
            userId: userId
          }
        };
        
        const result = await docClient.send(new GetCommand(getParams));
        
        if (!result.Item) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'No Stripe account found for this user' })
          };
        }
        
        // Return the account info (without sensitive tokens)
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            id: result.Item.stripeAccountId,
            connected: true,
            createdAt: result.Item.createdAt,
            updatedAt: result.Item.updatedAt
          })
        };
        
      } catch (error: any) {
        console.error('Error getting account info:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            error: 'Failed to get account info',
            details: error.message
          })
        };
      }
    }
    
    // 3. Create connection token for Stripe Terminal
    if (path.includes('/connection_token') && method === 'POST') {
      console.log('Creating connection token for Stripe Terminal');
      
      if (!stripe) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Stripe not configured' })
        };
      }
      
      try {
        // First, ensure we have a location for Terminal readers
        let locationId: string | null = null;
        
        try {
          // Try to get existing locations
          const locations = await stripe.terminal.locations.list({ limit: 1 });
          
          if (locations.data.length > 0) {
            locationId = locations.data[0].id;
            console.log('Using existing location:', locationId);
          } else {
            // Create a default location if none exists
            const location = await stripe.terminal.locations.create({
              display_name: 'Default POS Location',
              address: {
                line1: 'POS Terminal',
                city: 'Default City',
                country: 'US',
                postal_code: '00000',
                state: 'CA',
              },
            });
            locationId = location.id;
            console.log('Created new location:', locationId);
          }
        } catch (locationError) {
          console.error('Error managing locations:', locationError);
          // Continue without location ID - simulated readers don't need it
        }
        
        // Create a connection token for Stripe Terminal
        const connectionToken = await stripe.terminal.connectionTokens.create({
          location: locationId || undefined,
        });
        
        console.log('Connection token created successfully with location:', locationId);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            secret: connectionToken.secret,
            location_id: locationId 
          })
        };
      } catch (error: any) {
        console.error('Error creating connection token:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            error: 'Failed to create connection token',
            details: error.message
          })
        };
      }
    }
    
    // 4. Handle Stripe Connect OAuth callback
    if (path.includes('/connect/callback') && method === 'POST') {
      console.log('Processing callback request');
      
      if (!event.body) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Request body is missing' })
        };
      }
      
      let body;
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      console.log('Request body:', body);
      
      const { code, userId } = body;
      if (!code || !userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Missing code or userId' })
        };
      }
      
      if (!STRIPE_SECRET_KEY) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Stripe secret key not configured' })
        };
      }
      
      try {
        console.log('Exchanging code for access token...');
        
        // Exchange authorization code for access token
        const tokenUrl = 'https://connect.stripe.com/oauth/token';
        const params = new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_secret: STRIPE_SECRET_KEY,
        });
        
        console.log('Making request to Stripe token endpoint...');
        const response = await axios.post(tokenUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        
        console.log('Stripe token response:', response.data);
        const { stripe_user_id, access_token, refresh_token } = response.data;
        
        // Store the Stripe account details in DynamoDB
        const putParams = {
          TableName: STRIPE_TOKENS_TABLE_NAME,
          Item: {
            userId: userId,
            stripeAccountId: stripe_user_id,
            accessToken: access_token,
            refreshToken: refresh_token,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
        
        console.log('Storing tokens in DynamoDB...');
        await docClient.send(new PutCommand(putParams));
        
        console.log('Successfully stored Stripe Connect account for user:', userId);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: true,
            message: 'Stripe Connect account connected successfully',
            stripeAccountId: stripe_user_id,
            receivedData: {
              code: code.substring(0, 10) + '...',
              userId: userId
            }
          })
        };
        
      } catch (error: any) {
        console.error('Error processing Stripe callback:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            error: 'Failed to process Stripe callback',
            details: error.message,
            stack: error.stack
          })
        };
      }
    }
    
    // 5. Get platform publishable key
    if (path.includes('/platform_key') && method === 'GET') {
      console.log('Getting platform publishable key');
      
      // For Stripe Connect, we need the PLATFORM's publishable key
      // This should be YOUR (the app owner's) Stripe account publishable key
      // Users will connect their accounts to receive payments
      
      // Option 1: Use environment variable (recommended for production)
      let platformPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      
      // Option 2: For development/testing, detect which Stripe account owns this app
      if (!platformPublishableKey && STRIPE_SECRET_KEY && stripe) {
        try {
          // Get account info to determine if we're in test or live mode
          const account = await stripe.accounts.retrieve();
          // This gives us the platform account info
          console.log('Platform account:', account.id, 'Test mode:', !account.charges_enabled);
          
          // In a real app, you'd store your platform's publishable key in AWS Secrets Manager
          // For now, we'll return an error telling users how to set it up
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ 
              error: 'Platform publishable key not configured',
              instructions: 'As the platform owner, you need to set STRIPE_PUBLISHABLE_KEY environment variable with your Stripe account\'s publishable key',
              platformAccountId: account.id,
              testMode: !account.charges_enabled
            })
          };
        } catch (error) {
          console.error('Error getting platform account:', error);
        }
      }
      
      if (!platformPublishableKey) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            error: 'Platform key not configured',
            message: 'The platform needs to configure their Stripe publishable key'
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          publishableKey: platformPublishableKey,
          mode: platformPublishableKey.startsWith('pk_test') ? 'test' : 'live'
        })
      };
    }
    
    // 6. Handle disconnect request
    if (path.includes('/disconnect') && method === 'POST') {
      console.log('Processing disconnect request');
      
      const body = JSON.parse(event.body || '{}');
      const userId = body.userId;
      
      if (!userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Missing userId' })
        };
      }
      
      try {
        // Delete the Stripe account info from DynamoDB
        const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
        const deleteParams = {
          TableName: STRIPE_TOKENS_TABLE_NAME,
          Key: {
            userId: userId
          }
        };
        
        await docClient.send(new DeleteCommand(deleteParams));
        console.log('Successfully disconnected Stripe account for user:', userId);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: true,
            message: 'Stripe account disconnected successfully'
          })
        };
        
      } catch (error: any) {
        console.error('Error disconnecting Stripe account:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            error: 'Failed to disconnect Stripe account',
            details: error.message
          })
        };
      }
    }
    
    // Default response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        message: 'Lambda is working!',
        path: path,
        method: method,
        env: {
          hasStripeClientId: !!STRIPE_CLIENT_ID,
          hasStripeSecretKey: !!STRIPE_SECRET_KEY,
          frontendUrl: FRONTEND_URL,
          tableName: STRIPE_TOKENS_TABLE_NAME
        }
      })
    };
    
  } catch (error: any) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Internal error', 
        message: error.message,
        stack: error.stack
      })
    };
  }
};