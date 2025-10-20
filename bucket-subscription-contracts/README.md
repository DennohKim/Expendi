# ExpendiBucketManager Smart Contracts

A secure, bucket-based subscription management system built on Base blockchain for the Expendi platform.

## 🎯 Overview

ExpendiBucketManager enables users to:
- Create spending buckets with monthly limits
- Fund buckets with ERC20 tokens (USDC)
- Set up recurring subscriptions tied to specific buckets
- Make one-time payments from buckets
- Manage subscription lifecycles with user consent

## 🚀 Deployed Contracts (Base Sepolia Testnet)

### Main Contracts

| Contract | Address | Verified | Explorer |
|----------|---------|----------|----------|
| **ExpendiBucketManager** | `0x4832FE3192f205F753F1C334916B7cfec7823D64` | ✅ | [View on Blockscout](https://base-sepolia.blockscout.com/address/0x4832FE3192f205F753F1C334916B7cfec7823D64) |
| MockUSDC | `0x316506500241C52c71B6116863D6d020a3054782` | ✅ | [View on Blockscout](https://base-sepolia.blockscout.com/address/0x316506500241C52c71B6116863D6d020a3054782) |

### Supporting Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| MockSubscriptionDataManager | `0x0726E7052DAadD09548aBA2D5e72AD12BE8E787e` | Test subscription management |
| MockSubscriptionPaymentProcessor | `0x70Af29feA0438C3D4FfD38E23C01A26B8679c593` | Test payment processing |

**Network:** Base Sepolia (Chain ID: 84532)  
**Deployer:** `0xAE609c3904C539aF2Ac11a86D0B030a77dB0a509`

## 🏗️ Architecture

### Core Features

- **Bucket Management**: Create, fund, and manage spending buckets
- **Subscription System**: Recurring payments with user consent
- **Monthly Limits**: Automatic spending limit resets
- **Access Control**: Role-based permissions (Admin, Subscription Manager, Emergency)
- **Security**: Rate limiting, reentrancy guards, pausable functionality

### Smart Contract Structure

```
src/
├── ExpendiBucketManager.sol          # Main contract
├── interfaces/
│   ├── ISubscriptionDataManager.sol
│   └── ISubscriptionPaymentProcessor.sol
└── mocks/
    ├── MockSubscriptionDataManager.sol
    ├── MockSubscriptionPaymentProcessor.sol
    └── MockUSDC.sol
```

## 🛠️ Development Setup

### Prerequisites

- [Foundry](https://book.getfoundry.sh/)
- Node.js (for scripts)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd bucket-subscription-contracts

# Install dependencies
forge install

# Build contracts
forge build
```

### Testing

```bash
# Run all tests
forge test

# Run tests with verbosity
forge test -vv

# Run specific test file
forge test --match-path test/ExpendiBucketSubscriptionManagerTest2.t.sol
```

### Deploy to Base Sepolia

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key_here
export BASESCAN_API_KEY=your_basescan_api_key

# Deploy to testnet
forge script script/deployment/DeployTestnet.s.sol \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast

# Verify contracts
forge verify-contract <contract_address> src/ExpendiBucketManager.sol:ExpendiBucketManager \
  --verifier blockscout \
  --verifier-url https://base-sepolia.blockscout.com/api \
  --constructor-args <args>
```

## 📋 Contract Usage

### Creating a Bucket

```solidity
// Create a bucket with 1000 USDC monthly limit
manager.createBucket("entertainment", 1000e6);
```

### Funding a Bucket

```solidity
// Fund bucket with 500 USDC
manager.fundBucket("entertainment", 500e6, usdcAddress);
```

### Creating a Subscription

```solidity
// Create monthly subscription for 50 USDC
uint256 subscriptionId = manager.createBucketSubscription(
    "entertainment",    // bucket name
    50e6,              // 50 USDC
    30,                // 30 days
    usdcAddress,       // token
    recipient,         // payment recipient
    "Netflix",         // metadata
    true               // user consent
);
```

### Making One-Time Payments

```solidity
// Make a one-time payment
manager.makeOneTimePayment(
    "entertainment",
    25e6,              // 25 USDC
    usdcAddress,
    recipient,
    "Movie rental"
);
```

## 🔐 Security Features

- **Access Control**: OpenZeppelin role-based permissions
- **Reentrancy Protection**: ReentrancyGuard on all external functions
- **Rate Limiting**: Prevents spam operations
- **Emergency Controls**: Pausable functionality and emergency roles
- **User Consent**: Explicit consent required for subscriptions
- **Monthly Limits**: Automatic spending limit enforcement

## 🧪 Testing

The project includes comprehensive tests:

- **20+ test cases** covering all functionality
- **Rate limiting tests**
- **Security and access control tests**
- **Full subscription lifecycle tests**
- **Edge case and error condition tests**

```bash
# Run comprehensive test suite
forge test test/ExpendiBucketSubscriptionManagerTest2.t.sol -vv
```

## 📚 Foundry Documentation

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

### Usage Commands

```shell
# Build
forge build

# Test
forge test

# Format
forge fmt

# Gas Snapshots
forge snapshot

# Deploy
forge script script/deployment/DeployTestnet.s.sol --rpc-url <rpc_url> --private-key <private_key>

# Cast
cast <subcommand>

# Help
forge --help
anvil --help
cast --help
```

## 📄 License

MIT License

## 🔗 Links

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Base Documentation](https://docs.base.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---

Built with ❤️ for the Expendi ecosystem