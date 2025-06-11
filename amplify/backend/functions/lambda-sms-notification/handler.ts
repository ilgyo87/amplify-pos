import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

interface SMSRequest {
  phoneNumber: string;
  message: string;
  customerName?: string;
  orderNumber?: string;
}

export const handler = async (
  event: any
): Promise<APIGatewayProxyResult> => {
  console.log('SMS notification handler called', event);

  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
  };

  // Get HTTP method from Lambda Function URL event structure
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;

  // Handle preflight OPTIONS request
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body: SMSRequest = JSON.parse(event.body || '{}');
    const { phoneNumber, message, customerName, orderNumber } = body;

    // Validate required fields
    if (!phoneNumber || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: phoneNumber and message' 
        })
      };
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid phone number format. Must be in E.164 format (e.g., +1234567890)' 
        })
      };
    }

    // Validate message length (SMS limit is 160 characters for single SMS)
    if (message.length > 1600) { // Allow up to 10 concatenated SMS messages
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Message too long. Maximum length is 1600 characters' 
        })
      };
    }

    console.log(`Sending SMS to ${phoneNumber}: ${message.substring(0, 50)}...`);

    // Initialize SNS client
    const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

    // Prepare SMS parameters
    const smsParams = {
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional' // For important notifications
        },
        'AWS.SNS.SMS.MaxPrice': {
          DataType: 'String',
          StringValue: '0.50' // Maximum price per SMS in USD
        }
      }
    };

    // Send SMS
    const command = new PublishCommand(smsParams);
    const result = await snsClient.send(command);

    console.log('SMS sent successfully:', result.MessageId);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageId: result.MessageId,
        phoneNumber,
        messageLength: message.length,
        customerName,
        orderNumber
      })
    };

  } catch (error: any) {
    console.error('SMS sending error:', error);

    // Handle specific SNS errors
    if (error.name === 'InvalidParameterException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid SMS parameters',
          message: error.message
        })
      };
    }

    if (error.name === 'OptedOutException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Phone number has opted out of SMS',
          message: 'The recipient has opted out of receiving SMS messages'
        })
      };
    }

    if (error.name === 'ThrottledException') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'SMS rate limit exceeded',
          message: 'Too many SMS messages sent. Please try again later.'
        })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'SMS sending failed',
        message: error.message || 'Unknown error occurred'
      })
    };
  }
};