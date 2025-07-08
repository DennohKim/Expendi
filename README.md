# Expendi Budget Wallet Smart Contracts

A comprehensive smart contract system for budget management with individual wallet instances, spending buckets, and monthly limits on Base Sepolia testnet.

## 🏗️ Architecture Overview

The Expendi system consists of two main smart contracts that work together to provide users with individual budget management wallets:

### 1. SimpleBudgetWallet
- **Purpose**: Core budget management contract with spending buckets and monthly limits
- **Architecture**: Individual wallet instances deployed per user
- **Features**: Non-custodial budget tracking, spending limits, delegate permissions

### 2. SimpleBudgetWalletFactory  
- **Purpose**: Factory contract for deploying individual SimpleBudgetWallet instances
- **Architecture**: Singleton factory managing user wallet creation
- **Features**: User wallet tracking, deterministic address generation, creation fee management

## 📋 Contract Features

### SimpleBudgetWallet Features

#### 🏦 Account Management
- **ETH & ERC20 Support**: Deposit and manage both ETH and ERC20 tokens
- **Unallocated Funds**: Funds deposited but not assigned to specific buckets
- **Role-Based Access**: Admin and spender roles with granular permissions

#### 🗂️ Bucket System
- **Custom Buckets**: Create named spending categories (e.g., "groceries", "entertainment")
- **Monthly Limits**: Set spending limits that reset automatically every 30 days
- **Bucket Controls**: Activate/deactivate buckets, transfer funds between buckets
- **Balance Tracking**: Separate balance tracking for ETH and each ERC20 token per bucket

#### 💸 Spending Controls
- **Authorized Spending**: Only bucket owner or approved delegates can spend
- **Monthly Limit Enforcement**: Prevents spending beyond monthly budget limits
- **Batch Operations**: Execute multiple spending operations in a single transaction
- **Spending History**: Track monthly spending with automatic reset cycles

#### 👥 Delegation System
- **Delegate Management**: Grant spending permissions to other addresses per bucket
- **Granular Control**: Different delegates for different spending categories
- **Revocable Permissions**: Remove delegate access at any time

#### 🚨 Emergency Features
- **Pausable Contract**: Admin can pause all operations in emergencies
- **Emergency Withdrawal**: Recover all funds when contract is paused
- **Access Control**: Multi-role system for secure administration

### SimpleBudgetWalletFactory Features

#### 🏭 Wallet Creation
- **Individual Wallets**: Each user gets their own SimpleBudgetWallet contract instance
- **Duplicate Prevention**: Ensures one wallet per user address
- **Creation Fees**: Optional fees for wallet creation (currently set to 0)

#### 🎯 Deterministic Deployment
- **CREATE2 Support**: Deploy wallets at predictable addresses using salt values
- **Address Prediction**: Calculate wallet addresses before deployment
- **Collision Prevention**: Ensures unique addresses for each salt

#### 📊 Tracking & Management
- **User Registry**: Maps user addresses to their wallet contracts
- **Wallet Registry**: Maps wallet contracts back to owner addresses
- **Statistics**: Track total wallets created and factory metrics
- **Pagination**: Retrieve wallet lists with offset/limit support

## 🚀 Deployed Contracts (Base Sepolia)

### Factory Contract
- **Address**: [`0x488B7a8c4431F9Ba1b86f44Ccb5b2Bf2825f1031`](https://sepolia.basescan.org/address/0x488B7a8c4431F9Ba1b86f44Ccb5b2Bf2825f1031)
- **Status**: ✅ Verified
- **Creation Fee**: 0 ETH

### Example Individual Wallet
- **Address**: [`0x316f0eB615C799e4Bb0BaB7c6026E952f25F3a92`](https://sepolia.basescan.org/address/0x316f0eB615C799e4Bb0BaB7c6026E952f25F3a92)  
- **Owner**: `0x5A6528b24d4aBE30c8c64672B00ccD2B9dD6ba33`
- **Created Via**: Factory deployment
- **Features**: Active budget with groceries bucket (0.05 ETH limit)

## 🛠️ Development Setup

### Prerequisites
- [Foundry](https://getfoundry.sh/) for smart contract development
- Node.js 16+ for additional tooling
- Git for version control

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd contracts

# Install dependencies
forge install

# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### Environment Configuration
Create a `.env` file with:
```bash
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHERSCAN_API_KEY=your_basescan_api_key
WALLET_CREATION_FEE=0
```

### Build & Test
```bash
# Compile contracts
forge build

# Run tests
forge test

# Run tests with verbosity
forge test -vvv
```

## 📖 Usage Guide

### For End Users

#### 1. Create Your Wallet
```solidity
// Call the factory to create your personal wallet
SimpleBudgetWalletFactory factory = SimpleBudgetWalletFactory(FACTORY_ADDRESS);
address myWallet = factory.createWallet{value: 0}();
```

#### 2. Deposit Funds
```solidity
SimpleBudgetWallet wallet = SimpleBudgetWallet(payable(myWallet));

// Deposit ETH
wallet.depositETH{value: 1 ether}();

// Deposit ERC20 tokens
IERC20(tokenAddress).approve(myWallet, amount);
wallet.depositToken(tokenAddress, amount);
```

#### 3. Create Budget Buckets
```solidity
// Create a groceries bucket with 0.5 ETH monthly limit
wallet.createBucket("groceries", 0.5 ether);

// Fund the bucket from unallocated balance
wallet.fundBucket("groceries", 0.3 ether, address(0)); // address(0) = ETH
```

#### 4. Spend from Buckets
```solidity
// Spend 0.1 ETH from groceries bucket
wallet.spendFromBucket(
    msg.sender,           // user
    "groceries",          // bucket name
    0.1 ether,           // amount
    payable(recipient),   // recipient
    address(0),          // token (ETH)
    ""                   // additional data
);
```

### For Frontend Integration

#### Factory Contract Interface
```solidity
interface ISimpleBudgetWalletFactory {
    function createWallet() external payable returns (address wallet);
    function createWalletDeterministic(uint256 salt) external payable returns (address wallet);
    function getWallet(address user) external view returns (address);
    function hasWallet(address user) external view returns (bool);
    function totalWalletsCreated() external view returns (uint256);
    function getWalletAddress(uint256 salt) external view returns (address);
}
```

#### Wallet Contract Interface
```solidity
interface ISimpleBudgetWallet {
    function depositETH() external payable;
    function depositToken(address token, uint256 amount) external;
    function createBucket(string memory bucketName, uint256 monthlyLimit) external;
    function fundBucket(string memory bucketName, uint256 amount, address token) external;
    function spendFromBucket(address user, string memory bucketName, uint256 amount, address payable recipient, address token, bytes calldata data) external;
    function getBucket(address user, string memory bucketName) external view returns (uint256 ethBalance, uint256 monthlySpent, uint256 monthlyLimit, uint256 timeUntilReset, bool active);
    function getUserBuckets(address user) external view returns (string[] memory);
    function getTotalBalance(address user, address token) external view returns (uint256);
}
```

## 🔧 Contract Interactions

### Deployment Scripts

#### Deploy Factory
```bash
forge script script/DeployFresh.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

#### Test Factory Functionality
```bash
forge script script/TestFactoryWallet.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### Verification
```bash
# Verify factory contract
forge verify-contract \
    --chain-id 84532 \
    --num-of-optimizations 200 \
    --watch \
    --constructor-args $(cast abi-encode "constructor(uint256)" 0) \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    --compiler-version v0.8.19+commit.7dd6d404 \
    0x488B7a8c4431F9Ba1b86f44Ccb5b2Bf2825f1031 \
    src/SimpleBudgetWalletFactory.sol:SimpleBudgetWalletFactory
```

## 🔐 Security Features

### Access Control
- **Role-based permissions** using OpenZeppelin's AccessControl
- **Owner-only factory management** functions
- **Delegate system** for controlled spending access

### Reentrancy Protection
- **ReentrancyGuard** on all state-changing functions
- **Checks-Effects-Interactions** pattern implementation
- **Internal function separation** for batch operations

### Emergency Mechanisms
- **Pausable contract** for emergency stops
- **Emergency withdrawal** function for fund recovery
- **Multi-signature capability** through role system

### Input Validation
- **Comprehensive parameter validation** on all functions
- **Balance checks** before fund transfers
- **Monthly limit enforcement** with automatic resets

## 📊 Gas Optimization

### Efficient Storage
- **Packed structs** for optimal storage usage
- **Mapping optimization** for user data access
- **Array length caching** in loops

### Batch Operations
- **Multi-bucket spending** in single transaction
- **Batch bucket management** capabilities
- **Reduced transaction costs** for multiple operations

## 🧪 Testing

### Test Coverage
- ✅ **Factory deployment and wallet creation**
- ✅ **Bucket creation and funding**
- ✅ **Spending controls and limits**
- ✅ **Delegate permissions**
- ✅ **Emergency functions**
- ✅ **Deterministic address generation**
- ✅ **Multi-user scenarios**

### Run Specific Tests
```bash
# Test wallet functionality
forge test --match-test testCreateBucket -vvv

# Test factory functionality  
forge test --match-test testCreateWallet -vvv

# Test spending controls
forge test --match-test testSpendFromBucket -vvv
```

## 🌐 Network Information

### Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org
- **Faucet**: https://bridge.base.org/deposit

### Contract Verification
All contracts are verified on Base Sepolia's block explorer for transparency and easy interaction.

## 📈 Future Enhancements

### Planned Features
- **Multi-signature wallet support** for shared budgets
- **Recurring payment automation** for subscription management  
- **Advanced analytics** and spending insights
- **Cross-chain bridge integration** for multi-network budgets
- **DeFi yield integration** for unallocated funds

### Governance
- **DAO governance** for protocol parameters
- **Community-driven feature development**
- **Decentralized upgrade mechanisms**

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Write comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

### Code Standards
- **Solidity 0.8.19+** for latest security features
- **OpenZeppelin contracts** for battle-tested components
- **Comprehensive documentation** for all functions
- **Gas optimization** best practices

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **Factory Contract**: [0x488B7a8c4431F9Ba1b86f44Ccb5b2Bf2825f1031](https://sepolia.basescan.org/address/0x488B7a8c4431F9Ba1b86f44Ccb5b2Bf2825f1031)
- **Example Wallet**: [0x316f0eB615C799e4Bb0BaB7c6026E952f25F3a92](https://sepolia.basescan.org/address/0x316f0eB615C799e4Bb0BaB7c6026E952f25F3a92)
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **Base Sepolia Bridge**: https://bridge.base.org/deposit