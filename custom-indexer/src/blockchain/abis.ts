// SimpleBudgetWalletFactory ABI
export const factoryAbi = [
  {
    type: 'event',
    name: 'WalletCreated',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'salt', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'WalletRegistered',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'wallet', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true },
      { name: 'newOwner', type: 'address', indexed: true }
    ]
  },
  {
    type: 'function',
    name: 'createWallet',
    inputs: [
      { name: 'user', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'address' }
    ]
  }
] as const;

// SimpleBudgetWallet ABI - Updated to match actual contract
export const budgetWalletAbi = [
  {
    type: 'event',
    name: 'BucketCreated',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'bucketName', type: 'string', indexed: false },
      { name: 'monthlyLimit', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'BucketUpdated',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'bucketName', type: 'string', indexed: false },
      { name: 'newLimit', type: 'uint256', indexed: false },
      { name: 'active', type: 'bool', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'BucketFunded',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'bucketName', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'SpentFromBucket',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'bucketName', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'recipient', type: 'address', indexed: false },
      { name: 'token', type: 'address', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'BucketTransfer',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'fromBucket', type: 'string', indexed: false },
      { name: 'toBucket', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'FundsDeposited',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'MonthlyLimitReset',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'bucketName', type: 'string', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'DelegateAdded',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'delegate', type: 'address', indexed: true },
      { name: 'bucketName', type: 'string', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'DelegateRemoved',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'delegate', type: 'address', indexed: true },
      { name: 'bucketName', type: 'string', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'UnallocatedWithdraw',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'recipient', type: 'address', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'EmergencyWithdraw',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'RoleGranted',
    inputs: [
      { name: 'role', type: 'bytes32', indexed: true },
      { name: 'account', type: 'address', indexed: true },
      { name: 'sender', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'RoleRevoked',
    inputs: [
      { name: 'role', type: 'bytes32', indexed: true },
      { name: 'account', type: 'address', indexed: true },
      { name: 'sender', type: 'address', indexed: true }
    ]
  },
  {
    type: 'function',
    name: 'createBucket',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'monthlyLimit', type: 'uint256' },
      { name: 'token', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'spend',
    inputs: [
      { name: 'bucketId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'withdrawUnallocated',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'recipient', type: 'address' }
    ],
    outputs: []
  }
] as const;

// ERC20 Token ABI (for USDC transfers)
export const erc20Abi = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true },
      { name: 'newOwner', type: 'address', indexed: true }
    ]
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [
      { name: '', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [
      { name: 'account', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [
      { name: '', type: 'uint8' }
    ]
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [
      { name: '', type: 'string' }
    ]
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [
      { name: '', type: 'string' }
    ]
  }
] as const;