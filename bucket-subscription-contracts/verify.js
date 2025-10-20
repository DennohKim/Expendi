const fs = require('fs');

async function verifyContract() {
  // Read the flattened source code
  const sourceCode = fs.readFileSync('./ExpendiBucketManager_flat.sol', 'utf8');
  
  // Prepare the verification request
  const verificationData = {
    apikey: 'AYVBXNQTQX81J63WU2EKIAAPVFH8PJW9TW',
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: '0x4832FE3192f205F753F1C334916B7cfec7823D64',
    sourceCode: sourceCode,
    codeformat: 'solidity-single-file',
    contractname: 'ExpendiBucketManager',
    compilerversion: 'v0.8.20+commit.a1b79de6',
    optimizationUsed: '1',
    runs: '200',
    constructorArguements: '0000000000000000000000000726e7052daadd09548aba2d5e72ad12be8e787e00000000000000000070af29fea0438c3d4ffd38e23c01a26b8679c593',
    evmversion: 'shanghai',
    licenseType: '3' // MIT license
  };

  try {
    const response = await fetch('https://api-sepolia.basescan.org/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(verificationData)
    });

    const result = await response.json();
    console.log('Verification request result:', result);

    if (result.status === '1') {
      console.log('Contract verification submitted successfully!');
      console.log('GUID:', result.result);
      
      // Check verification status
      await checkVerificationStatus(result.result);
    } else {
      console.log('Verification failed:', result.message);
    }
  } catch (error) {
    console.error('Error verifying contract:', error);
  }
}

async function checkVerificationStatus(guid) {
  console.log('Checking verification status...');
  
  const statusData = {
    apikey: 'AYVBXNQTQX81J63WU2EKIAAPVFH8PJW9TW',
    module: 'contract',
    action: 'checkverifystatus',
    guid: guid
  };

  try {
    const response = await fetch('https://api-sepolia.basescan.org/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(statusData)
    });

    const result = await response.json();
    console.log('Verification status:', result);
  } catch (error) {
    console.error('Error checking verification status:', error);
  }
}

verifyContract();