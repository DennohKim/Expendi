// SimpleBudgetWalletFactory ABI
export const factoryAbi = [
  {
    type: 'event',
    name: 'WalletCreated',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'template', type: 'address', indexed: false }
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

// SimpleBudgetWallet ABI
export const budgetWalletAbi = [
  {
    type: 'event',
    name: 'BucketCreated',
    inputs: [
      { name: 'bucketId', type: 'uint256', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'monthlyLimit', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'Spending',
    inputs: [
      { name: 'bucketId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'BucketLimitUpdated',
    inputs: [
      { name: 'bucketId', type: 'uint256', indexed: true },
      { name: 'newLimit', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'DelegatePermissionChanged',
    inputs: [
      { name: 'delegate', type: 'address', indexed: true },
      { name: 'bucketId', type: 'uint256', indexed: true },
      { name: 'canSpend', type: 'bool', indexed: false }
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