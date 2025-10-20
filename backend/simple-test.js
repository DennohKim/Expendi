const { ethers } = require('ethers');

async function quickTest() {
  console.log('🧪 Quick Backend Integration Test');
  console.log('=================================');
  
  // Test environment variables
  const contractAddress = process.env.EXPENDI_SUBSCRIPTION_CONTRACT_ADDRESS || '0x30C72e2b14eE982fE3587e366C9093845e84aa1f';
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const walletAddress = process.env.SUBSCRIPTION_OWNER_ADDRESS || 'NOT_SET';
  
  console.log('🔧 Environment Check:');
  console.log('   Contract:', contractAddress);
  console.log('   RPC URL:', rpcUrl);
  console.log('   Wallet:', walletAddress);
  console.log('');
  
  // Test contract connection
  try {
    console.log('📡 Testing Contract Connection...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, [
      'function owner() view returns (address)',
      'function feeRecipient() view returns (address)',
      'function MAX_DAILY_SPEND() view returns (uint256)',
      'function MIN_PERMISSION_PERIOD() view returns (uint256)'
    ], provider);
    
    const owner = await contract.owner();
    const feeRecipient = await contract.feeRecipient();
    const maxSpend = await contract.MAX_DAILY_SPEND();
    const minPeriod = await contract.MIN_PERMISSION_PERIOD();
    
    console.log('✅ Contract Integration Working:');
    console.log('   Owner:', owner);
    console.log('   Fee Recipient:', feeRecipient);
    console.log('   Max Daily Spend:', ethers.formatUnits(maxSpend, 6), 'USDC');
    console.log('   Min Permission Period:', minPeriod.toString(), 'seconds');
    console.log('');
    
    // Check if wallet matches
    if (owner.toLowerCase() === walletAddress.toLowerCase()) {
      console.log('✅ Wallet configuration correct!');
    } else {
      console.log('⚠️  Wallet mismatch - check SUBSCRIPTION_OWNER_ADDRESS');
    }
    
  } catch (error) {
    console.error('❌ Contract connection failed:', error.message);
  }
  
  // Test HTTP endpoint
  try {
    console.log('📡 Testing HTTP Endpoints...');
    const https = require('https');
    const http = require('http');
    
    const testUrl = 'http://localhost:3001/api/v2/subscriptions/queue/status';
    
    const request = http.get(testUrl, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ API Endpoint Working:');
          console.log('   Status:', response.statusCode);
          console.log('   Queue Healthy:', result.data?.healthy);
          console.log('   Queue Stats:', result.data?.stats);
          console.log('');
          console.log('🎉 BACKEND INTEGRATION TEST PASSED!');
          console.log('Your backend is ready for subscription processing.');
        } catch (e) {
          console.error('❌ Invalid JSON response:', data);
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('❌ HTTP request failed:', error.message);
      console.error('   Make sure backend is running: npm run dev');
    });
    
    request.setTimeout(5000, () => {
      console.error('❌ Request timeout - backend may not be running');
      request.destroy();
    });
    
  } catch (error) {
    console.error('❌ HTTP test failed:', error.message);
  }
}

quickTest();