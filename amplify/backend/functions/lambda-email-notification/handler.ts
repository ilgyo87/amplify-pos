import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  customerName?: string;
  orderNumber?: string;
}

export const handler = async (
  event: any
): Promise<APIGatewayProxyResult> => {
  console.log('Email notification handler called', event);

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
    const body: EmailRequest = JSON.parse(event.body || '{}');
    const { to, subject, html, text, customerName, orderNumber } = body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: to, subject, and (html or text)' 
        })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid email address format' 
        })
      };
    }

    console.log(`Sending email to ${to} with subject: ${subject}`);

    // Initialize SES client
    const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

    // Prepare email parameters
    const emailParams = {
      Source: process.env.FROM_EMAIL || 'dry.cleaning.services.pos@gmail.com', // You'll need to verify this domain in SES
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          ...(text && {
            Text: {
              Data: text,
              Charset: 'UTF-8'
            }
          }),
          ...(html && {
            Html: {
              Data: html,
              Charset: 'UTF-8'
            }
          })
        }
      }
    };

    // Send email
    const command = new SendEmailCommand(emailParams);
    const result = await sesClient.send(command);

    console.log('Email sent successfully:', result.MessageId);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageId: result.MessageId,
        to,
        subject,
        customerName,
        orderNumber
      })
    };

  } catch (error: any) {
    console.error('Email sending error:', error);

    // Handle specific SES errors
    if (error.name === 'MessageRejected') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Email was rejected',
          message: error.message
        })
      };
    }

    if (error.name === 'MailFromDomainNotVerifiedException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Email domain not verified in SES',
          message: 'Please verify your sending domain in AWS SES'
        })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Email sending failed',
        message: error.message || 'Unknown error occurred'
      })
    };
  }
};