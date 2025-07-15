# Base Sepolia Deployment

## Contract Addresses

**Network:** Base Sepolia (Chain ID: 84532)
**Deployed:** July 15, 2025 (Updated with withdrawUnallocated function)

| Contract | Address | Explorer Link |
|----------|---------|---------------|
| SimpleBudgetWallet | `0x3300416DB028aE9eC43f32835aF652Fa87200874` | [View on BaseScan](https://sepolia.basescan.org/address/0x3300416db028ae9ec43f32835af652fa87200874) |
| SimpleBudgetWalletFactory | `0xAf8fb11822deC6Df35e17255B1A6bbF268a6b4e4` | [View on BaseScan](https://sepolia.basescan.org/address/0xaf8fb11822dec6df35e17255b1a6bbf268a6b4e4) |

## Frontend Environment Variables

Add these to your frontend `.env.local`:

```env
NEXT_PUBLIC_BUDGET_WALLET_ADDRESS=0x3300416DB028aE9eC43f32835aF652Fa87200874
NEXT_PUBLIC_FACTORY_ADDRESS=0xAf8fb11822deC6Df35e17255B1A6bbF268a6b4e4
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
- Unallocated funds withdrawal functionality
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