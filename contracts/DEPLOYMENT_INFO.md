# Base Sepolia Deployment

## Contract Addresses

**Network:** Base Sepolia (Chain ID: 84532)
**Deployed:** July 10, 2025

| Contract | Address | Explorer Link |
|----------|---------|---------------|
| SimpleBudgetWallet | `0x9b76D8eAdF1CA6e1cDc2ECb2Ac2df13Bf5CF068C` | [View on BaseScan](https://sepolia.basescan.org/address/0x9b76d8eadf1ca6e1cdc2ecb2ac2df13bf5cf068c) |
| SimpleBudgetWalletFactory | `0x4525f41f2c49EB476E9e0f0fCac96Cc6eec16ea7` | [View on BaseScan](https://sepolia.basescan.org/address/0x4525f41f2c49eb476e9e0f0fcac96cc6eec16ea7) |

## Frontend Environment Variables

Add these to your frontend `.env.local`:

```env
NEXT_PUBLIC_BUDGET_WALLET_ADDRESS=0x9b76D8eAdF1CA6e1cDc2ECb2Ac2df13Bf5CF068C
NEXT_PUBLIC_FACTORY_ADDRESS=0x4525f41f2c49EB476E9e0f0fCac96Cc6eec16ea7
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_NETWORK_NAME=Base Sepolia
```

## Deployment Details

- **Deployer:** `0x5A6528b24d4aBE30c8c64672B00ccD2B9dD6ba33`
- **Gas Used:** ~8,228,599 gas
- **Gas Price:** ~0.001000774 gwei
- **Total Cost:** ~0.000008234967935626 ETH
- **Verification:** ✅ Both contracts verified on BaseScan

## Contract Features

### SimpleBudgetWallet
- Budget management with spending buckets
- Monthly spending limits
- Multi-token support (ETH + ERC20)
- Delegate permissions
- Emergency functions
- Access control with admin/spender roles

### SimpleBudgetWalletFactory
- Deploy budget wallets for users
- Deterministic deployment with CREATE2
- Free wallet creation (no fees)
- User-to-wallet mapping
- Factory statistics and management

## Usage

1. **Create a Budget Wallet**: Call `createWallet()` on the factory contract
2. **Fund Your Wallet**: Deposit ETH or tokens to your budget wallet
3. **Create Buckets**: Set up spending categories with monthly limits
4. **Spend**: Use bucket funds within your defined limits
5. **Manage**: Add delegates, transfer between buckets, track spending

## Security Features

- ReentrancyGuard protection
- Pausable for emergency stops
- Role-based access control
- Safe token transfers (SafeERC20)
- Monthly spending limit enforcement