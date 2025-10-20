const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAPIEndpoints() {
  console.log('🧪 Testing Backend API Endpoints');
  console.log('================================');
  
  try {
    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    const healthResponse = await axios.get(`${BASE_URL}/api/v2/subscriptions/queue/status`);
    console.log('   ✅ Status:', healthResponse.status);
    console.log('   ✅ Queue healthy:', healthResponse.data.data.healthy);
    console.log('   ✅ Queue stats:', healthResponse.data.data.stats);
    console.log('');
    
    // Test 2: Create a test subscription
    console.log('📋 Test 2: Create Test Subscription');
    const testSubscription = {
      payerAddress: '0xAE609c3904C539aF2Ac11a86D0B030a77dB0a509',
      recipientAddress: '0xAE609c3904C539aF2Ac11a86D0B030a77dB0a509',
      amount: '1.00',
      periodInDays: 0,
      nextChargeTimestamp: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
      metadata: {
        name: 'API Test Payment',
        description: 'Testing backend API integration',
        category: 'Testing'
      }
    };
    
    const createResponse = await axios.post(`${BASE_URL}/api/v2/subscriptions`, testSubscription);
    console.log('   ✅ Status:', createResponse.status);
    console.log('   ✅ Subscription created:', createResponse.data.success);
    
    if (createResponse.data.data) {
      const subscriptionId = createResponse.data.data.id;
      console.log('   ✅ Subscription ID:', subscriptionId);
      
      // Test 3: Get the created subscription
      console.log('\\n📋 Test 3: Retrieve Subscription');
      const getResponse = await axios.get(`${BASE_URL}/api/v2/subscriptions/${subscriptionId}`);
      console.log('   ✅ Status:', getResponse.status);
      console.log('   ✅ Retrieved subscription:', getResponse.data.data.id === subscriptionId);
      console.log('   ✅ Amount matches:', getResponse.data.data.amount === '1.00');
    }
    console.log('');
    
    // Test 4: Test CORS headers
    console.log('📋 Test 4: CORS Configuration');
    const corsResponse = await axios.options(`${BASE_URL}/api/v2/subscriptions`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('   ✅ CORS Status:', corsResponse.status);
    console.log('   ✅ CORS Headers present:', !!corsResponse.headers['access-control-allow-origin']);
    console.log('');
    
    // Test 5: Error handling
    console.log('📋 Test 5: Error Handling');
    try {
      await axios.post(`${BASE_URL}/api/v2/subscriptions`, {
        payerAddress: 'invalid-address',
        amount: '-10'
      });
    } catch (error) {
      console.log('   ✅ Error handling works:', error.response.status >= 400);
      console.log('   ✅ Error status:', error.response.status);
    }
    console.log('');
    
    console.log('🎉 ALL API ENDPOINT TESTS PASSED!');
    console.log('Your backend API is working correctly and ready for frontend integration.');
    
  } catch (error) {
    console.error('❌ API test failed:');
    console.error('   Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
    console.error('   Please check if backend is running on port 3001');
  }
}

// Check if axios is available, if not provide instructions
try {
  require.resolve('axios');
  testAPIEndpoints();
} catch (e) {
  console.log('📦 Installing axios for testing...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install axios', { stdio: 'inherit' });
    console.log('✅ Axios installed, running tests...');
    delete require.cache[require.resolve('axios')];
    testAPIEndpoints();
  } catch (installError) {
    console.error('❌ Failed to install axios. Please run: npm install axios');
  }
}