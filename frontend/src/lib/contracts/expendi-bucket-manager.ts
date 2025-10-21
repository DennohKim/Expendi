export const EXPENDI_BUCKET_MANAGER_ABI = [
  // Bucket Management
  {
    "type": "function",
    "name": "createBucket",
    "inputs": [
      { "name": "bucketName", "type": "string", "internalType": "string" },
      { "name": "monthlyLimit", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fundBucket",
    "inputs": [
      { "name": "bucketName", "type": "string", "internalType": "string" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" },
      { "name": "token", "type": "address", "internalType": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deleteBucket",
    "inputs": [
      { "name": "bucketName", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  
  // One-time Payments
  {
    "type": "function",
    "name": "makeOneTimePayment",
    "inputs": [
      { "name": "bucketName", "type": "string", "internalType": "string" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" },
      { "name": "token", "type": "address", "internalType": "address" },
      { "name": "recipient", "type": "address", "internalType": "address" },
      { "name": "description", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  
  // Subscription Management
  {
    "type": "function",
    "name": "createBucketSubscription",
    "inputs": [
      { "name": "bucketName", "type": "string", "internalType": "string" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" },
      { "name": "periodInDays", "type": "uint256", "internalType": "uint256" },
      { "name": "token", "type": "address", "internalType": "address" },
      { "name": "recipient", "type": "address", "internalType": "address" },
      { "name": "metadata", "type": "string", "internalType": "string" },
      { "name": "userConsent", "type": "bool", "internalType": "bool" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelBucketSubscription",
    "inputs": [
      { "name": "subscriptionId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  
  // Token Management
  {
    "type": "function",
    "name": "depositTokens",
    "inputs": [
      { "name": "token", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "withdrawTokens",
    "inputs": [
      { "name": "token", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  
  // View Functions
  {
    "type": "function",
    "name": "getBucketBalance",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "bucketName", "type": "string", "internalType": "string" },
      { "name": "token", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBucketInfo",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "bucketName", "type": "string", "internalType": "string" }
    ],
    "outputs": [
      { "name": "balance", "type": "uint256", "internalType": "uint256" },
      { "name": "monthlySpent", "type": "uint256", "internalType": "uint256" },
      { "name": "monthlyLimit", "type": "uint256", "internalType": "uint256" },
      { "name": "lastResetTimestamp", "type": "uint256", "internalType": "uint256" },
      { "name": "active", "type": "bool", "internalType": "bool" },
      { "name": "subscriptionCount", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSubscriptionInfo",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "subscriptionId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ISubscriptionDataManager.SubscriptionData",
        "components": [
          { "name": "subscriptionId", "type": "uint256", "internalType": "uint256" },
          { "name": "bucketName", "type": "string", "internalType": "string" },
          { "name": "amount", "type": "uint256", "internalType": "uint256" },
          { "name": "periodInDays", "type": "uint256", "internalType": "uint256" },
          { "name": "token", "type": "address", "internalType": "address" },
          { "name": "recipient", "type": "address", "internalType": "address" },
          { "name": "isActive", "type": "bool", "internalType": "bool" },
          { "name": "nextChargeTimestamp", "type": "uint256", "internalType": "uint256" },
          { "name": "totalCharged", "type": "uint256", "internalType": "uint256" },
          { "name": "chargeCount", "type": "uint256", "internalType": "uint256" },
          { "name": "createdAt", "type": "uint256", "internalType": "uint256" },
          { "name": "lastProcessedAt", "type": "uint256", "internalType": "uint256" },
          { "name": "userConsent", "type": "bool", "internalType": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserSubscriptions",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256[]", "internalType": "uint256[]" }
    ],
    "stateMutability": "view"
  }
] as const;

export const EXPENDI_AUTOMATION_ABI = [
  'function trackUserSubscription(address user, uint256 subscriptionId) external',
  'function untrackUserSubscription(address user, uint256 subscriptionId) external',
  'function getTrackedUserSubscriptions(address user) external view returns (uint256[])',
  'function isSubscriptionDue(address user, uint256 subscriptionId) external view returns (bool)',
  'function getAutomationStats() external view returns (uint256 totalPaymentsProcessed, uint256 totalFailedPayments, uint256 totalGasUsed, uint256 upkeepCount, uint256 trackedUsersCount, uint256 lastUpkeepTimestamp)',
  'function manualUpkeep() external'
] as const;

// ERC20 ABI for USDC operations
export const ERC20_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "spender", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      { "name": "account", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      { "name": "to", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      { "name": "from", "type": "address", "internalType": "address" },
      { "name": "to", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint8", "internalType": "uint8" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "string", "internalType": "string" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "string", "internalType": "string" }
    ],
    "stateMutability": "view"
  }
] as const;