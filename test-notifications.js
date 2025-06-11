// Simple test script to debug notification issues
const AWS = require('aws-sdk');

// Configure AWS (using default credentials)
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

async function testEmailFunction() {
  console.log('Testing email function...');
  
  const payload = {
    httpMethod: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: 'ilgyo87@gmail.com',
      subject: 'Test Email from POS System',
      text: 'This is a test email to verify the notification system is working.',
      customerName: 'Test Customer',
      orderNumber: 'TEST-001'
    })
  };

  try {
    const result = await lambda.invoke({
      FunctionName: 'amplify-amplifypos-iggy-s-emailnotificationlambda7-Y8B3549reI85',
      Payload: JSON.stringify(payload)
    }).promise();

    console.log('Email function result:', result);
    
    if (result.Payload) {
      const response = JSON.parse(result.Payload);
      console.log('Email function response:', response);
    }
  } catch (error) {
    console.error('Email function error:', error);
  }
}

async function testSMSFunction() {
  console.log('Testing SMS function...');
  
  const payload = {
    httpMethod: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phoneNumber: '+1234567890',
      message: 'Test SMS from POS System: Your order TEST-001 is ready!',
      customerName: 'Test Customer',
      orderNumber: 'TEST-001'
    })
  };

  try {
    const result = await lambda.invoke({
      FunctionName: 'amplify-amplifypos-iggy-s-smsnotificationlambdaD05-DYun1iIRCgsJ',
      Payload: JSON.stringify(payload)
    }).promise();

    console.log('SMS function result:', result);
    
    if (result.Payload) {
      const response = JSON.parse(result.Payload);
      console.log('SMS function response:', response);
    }
  } catch (error) {
    console.error('SMS function error:', error);
  }
}

async function runTests() {
  console.log('🧪 Starting notification function tests...\n');
  
  await testEmailFunction();
  console.log('\n' + '='.repeat(50) + '\n');
  await testSMSFunction();
  
  console.log('\n🏁 Tests completed!');
}

runTests().catch(console.error);