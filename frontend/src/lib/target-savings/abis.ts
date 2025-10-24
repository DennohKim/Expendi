export const GoalzABI = [
  {
    "type": "constructor",
    "inputs": [
      {"name": "_initialDepositTokens", "type": "address[]", "internalType": "address[]"},
      {"name": "_initialMorphoVaults", "type": "address[]", "internalType": "address[]"},
      {"name": "_automate", "type": "address", "internalType": "address"}
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "to", "type": "address", "internalType": "address"},
      {"name": "tokenId", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "automate",
    "inputs": [],
    "outputs": [{"name": "", "type": "address", "internalType": "contract IAutomate"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "automateDeposit",
    "inputs": [
      {"name": "goalId", "type": "uint256", "internalType": "uint256"},
      {"name": "amount", "type": "uint256", "internalType": "uint256"},
      {"name": "frequency", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "automatedDeposit",
    "inputs": [{"name": "goalId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "automatedDeposits",
    "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "amount", "type": "uint256", "internalType": "uint256"},
      {"name": "frequency", "type": "uint256", "internalType": "uint256"},
      {"name": "lastDeposit", "type": "uint256", "internalType": "uint256"},
      {"name": "gelatoTaskId", "type": "bytes32", "internalType": "bytes32"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "owner", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelAutomatedDeposit",
    "inputs": [{"name": "goalId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deleteGoal",
    "inputs": [{"name": "goalId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [
      {"name": "goalId", "type": "uint256", "internalType": "uint256"},
      {"name": "amount", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getApproved",
    "inputs": [{"name": "tokenId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "address", "internalType": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGoalInterest",
    "inputs": [{"name": "goalId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGoalValue",
    "inputs": [{"name": "goalId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "goalzTokens",
    "inputs": [{"name": "", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "address", "internalType": "contract GoalzTokenMorpho"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isApprovedForAll",
    "inputs": [
      {"name": "owner", "type": "address", "internalType": "address"},
      {"name": "operator", "type": "address", "internalType": "address"}
    ],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "morphoVaults",
    "inputs": [{"name": "", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "address", "internalType": "contract IMetaMorpho"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{"name": "", "type": "string", "internalType": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ownerOf",
    "inputs": [{"name": "tokenId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "address", "internalType": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "safeTransferFrom",
    "inputs": [
      {"name": "from", "type": "address", "internalType": "address"},
      {"name": "to", "type": "address", "internalType": "address"},
      {"name": "tokenId", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "safeTransferFrom",
    "inputs": [
      {"name": "from", "type": "address", "internalType": "address"},
      {"name": "to", "type": "address", "internalType": "address"},
      {"name": "tokenId", "type": "uint256", "internalType": "uint256"},
      {"name": "data", "type": "bytes", "internalType": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "savingsGoals",
    "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "what", "type": "string", "internalType": "string"},
      {"name": "why", "type": "string", "internalType": "string"},
      {"name": "targetAmount", "type": "uint256", "internalType": "uint256"},
      {"name": "currentAmount", "type": "uint256", "internalType": "uint256"},
      {"name": "targetDate", "type": "uint256", "internalType": "uint256"},
      {"name": "depositToken", "type": "address", "internalType": "address"},
      {"name": "complete", "type": "bool", "internalType": "bool"},
      {"name": "shareBalance", "type": "uint256", "internalType": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setApprovalForAll",
    "inputs": [
      {"name": "operator", "type": "address", "internalType": "address"},
      {"name": "approved", "type": "bool", "internalType": "bool"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setGoal",
    "inputs": [
      {"name": "what", "type": "string", "internalType": "string"},
      {"name": "why", "type": "string", "internalType": "string"},
      {"name": "targetAmount", "type": "uint256", "internalType": "uint256"},
      {"name": "targetDate", "type": "uint256", "internalType": "uint256"},
      {"name": "depositToken", "type": "address", "internalType": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [{"name": "interfaceId", "type": "bytes4", "internalType": "bytes4"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{"name": "", "type": "string", "internalType": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenByIndex",
    "inputs": [{"name": "index", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenOfOwnerByIndex",
    "inputs": [
      {"name": "owner", "type": "address", "internalType": "address"},
      {"name": "index", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenURI",
    "inputs": [{"name": "tokenId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "string", "internalType": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      {"name": "from", "type": "address", "internalType": "address"},
      {"name": "to", "type": "address", "internalType": "address"},
      {"name": "tokenId", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [{"name": "goalId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

export const IERC20ABI = [
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