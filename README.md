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

## 🚀 Deployed Contracts

### Base Sepolia Testnet

#### Factory Contract
- **Address**: [`0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a`](https://sepolia.basescan.org/address/0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a)
- **Status**: ✅ Verified
- **Creation Fee**: 0 ETH
- **Block Number**: 28209133

#### Budget Wallet Template
- **Address**: [`0xA2f565Db75B32Dac366666621633b2259bF332D6`](https://sepolia.basescan.org/address/0xA2f565Db75B32Dac366666621633b2259bF332D6)  
- **Status**: ✅ Verified
- **Template Contract**: Used by factory for wallet creation
- **Block Number**: 28209133

### Celo Mainnet

#### Factory Contract
- **Address**: [`0x06CB6b1B6DD6B16DF66f50a597ef7902c80F937f`](https://celoscan.io/address/0x06CB6b1B6DD6B16DF66f50a597ef7902c80F937f)
- **Status**: ✅ Verified
- **Creation Fee**: 0 ETH
- **Chain ID**: 42220

#### Budget Wallet Template
- **Address**: [`0x30C72e2b14eE982fE3587e366C9093845e84aa1f`](https://celoscan.io/address/0x30C72e2b14eE982fE3587e366C9093845e84aa1f)
- **Status**: ✅ Verified
- **Template Contract**: Used by factory for wallet creation
- **Chain ID**: 42220

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
# Privy Configuration (REQUIRED)
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here

# WalletConnect (Optional - for better wallet support)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id


# Subgraph Configuration
NEXT_PUBLIC_SUBGRAPH_URL=test

# Smart Contract Addresses
NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a
NEXT_PUBLIC_BUDGET_WALLET_ADDRESS=0xA2f565Db75B32Dac366666621633b2259bF332D6
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_NETWORK_NAME=Celo

# Pimlico Configuration (for gas sponsoring)
NEXT_PUBLIC_PIMLICO_API_KEY=test

# Database Configuration (for direct connections if needed)
DATABASE_URL=your-postgres-connection-string

# Notifications (for future push notifications)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com

# Analytics (optional)
POSTHOG_KEY=your-posthog-key
MIXPANEL_TOKEN=your-mixpanel-token

# Email notifications (optional)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# Development
NODE_ENV=development
NEXT_PUBLIC_ENVIRONMENT=development
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
    0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a \
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

### Celo Mainnet
- **Chain ID**: 42220
- **RPC URL**: https://forno.celo.org
- **Block Explorer**: https://celoscan.io
- **Native Token**: CELO
- **Stablecoin**: cUSD (0x765DE816845861e75A25fCA122bb6898B8B1282a)

### Contract Verification
All contracts are verified on their respective block explorers for transparency and easy interaction.

## 💳 Pretium API Integration

Expendi integrates with the **Pretium API** to enable seamless cryptocurrency-to-mobile money conversions, allowing users to spend their cUSD directly as mobile money across African markets.

### What is Pretium API?

Pretium API (`https://api.xwift.africa`) is a financial bridge service that enables direct conversion from blockchain-based cryptocurrencies to mobile money systems like M-Pesa, Airtel Money, and other African mobile payment networks.

### Integration Architecture

The Pretium integration follows a sophisticated two-phase payment process:

#### Phase 1: Blockchain Transaction
1. User selects amount in cUSD from their budget bucket
2. cUSD is transferred to settlement address: `0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98`
3. Transaction is recorded on Celo blockchain
4. Transaction hash is generated for tracking

#### Phase 2: Mobile Money Distribution
1. Pretium API receives the blockchain transaction hash
2. cUSD amount is converted to local currency (KES) using live exchange rates
3. Mobile money is sent to recipient's phone number/paybill/till number
4. Payment confirmation handled via webhooks

### Supported Payment Methods

#### Mobile Payment Types
- **MOBILE**: Direct phone number transfers (M-Pesa, Airtel Money)
- **PAYBILL**: Business payment numbers for bill payments
- **BUY_GOODS**: Till numbers for merchant payments

#### Supported Networks
- **Safaricom (M-Pesa)** - Primary network in Kenya
- **Airtel Money** - Kenya and other African countries
- **MTN Mobile Money** - Uganda, Ghana, and other markets
- **AirtelTigo** - Ghana
- **Telcel** - Regional coverage

### API Endpoints Used

#### 1. Exchange Rate Service (`/api/pretium/exchange-rate`)
```typescript
// Real-time cUSD to KES conversion rates
const response = await fetch('/api/pretium/exchange-rate');
const { rate } = await response.json();
```
- **Features**: 5-minute cache, auto-refresh, error handling
- **Usage**: Display local currency equivalents to users

#### 2. Mobile Number Validation (`/api/pretium/validation`)
```typescript
// Validate recipient mobile numbers and paybill numbers
const response = await fetch('/api/pretium/validation', {
  method: 'POST',
  body: JSON.stringify({
    recipient: '+254700000000',
    type: 'MOBILE',
    network: 'Safaricom'
  })
});
```
- **Features**: Real-time validation, recipient name lookup, network detection
- **Usage**: Prevent failed transactions through pre-validation

#### 3. Payment Processing (`/api/pretium`)
```typescript
// Initiate mobile money payment after blockchain confirmation
const response = await fetch('/api/pretium', {
  method: 'POST',
  body: JSON.stringify({
    transaction_hash: '0x...',
    amount: '100.00',
    shortcode: '+254700000000',
    type: 'MOBILE',
    mobile_network: 'Safaricom',
    chain: 'CELO'
  })
});
```
- **Features**: Multi-network support, callback handling, status tracking

### Configuration Requirements

#### Environment Variables
```bash
# Pretium API Configuration
PRETIUM_BASE_URI=https://api.xwift.africa
PRETIUM_API_KEY=your-pretium-api-key

# Settlement address for mobile money bridge
SETTLEMENT_ADDRESS=0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98
```

#### Required Setup
1. **Pretium API Account**: Register at [xwift.africa](https://xwift.africa)
2. **API Key**: Obtain your unique API key for authentication
3. **Webhook Configuration**: Set up callback URLs for payment status updates
4. **Settlement Wallet**: Configure the bridge wallet for payment processing

### User Experience Flow

1. **Bucket Selection**: User selects which budget bucket to spend from
2. **Payment Method Toggle**: Choose between wallet address or mobile number
3. **Exchange Rate Display**: Live cUSD to KES conversion rates
4. **Mobile Number Validation**: Real-time validation with recipient name display
5. **Unified Payment Processing**: Single interface for blockchain + mobile payments

### Integration Benefits

- **Seamless UX**: Spend crypto as easily as traditional mobile money
- **Real-time Rates**: Live exchange rates ensure fair conversions  
- **Multi-network Support**: Works across major African mobile money networks
- **Validation**: Prevents failed transactions through recipient validation
- **Budget Control**: Integrates with bucket-based spending limits

### Technical Implementation

#### Key Hooks
- **`useBucketPayment`**: Main orchestrator for bucket-based payments
- **`useMobilePayment`**: Direct interface to Pretium payment API
- **`useExchangeRate`**: Currency conversion with caching
- **`useValidatePhoneNumber`**: Debounced recipient validation

#### Error Handling
- Comprehensive error messages for API failures
- Retry logic for exchange rate fetching
- User-friendly notifications via toast system
- Fallback handling for network issues

#### Security Features  
- API key authentication with Pretium
- Input validation for addresses and phone numbers
- Balance and spending limit validation
- Transaction hash verification before mobile payment

This integration represents a sophisticated bridge between DeFi and traditional African financial infrastructure, enabling practical cryptocurrency spending through established mobile money systems.

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

### Base Sepolia Testnet
- **Factory Contract**: [0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a](https://sepolia.basescan.org/address/0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a)
- **Budget Wallet Template**: [0xA2f565Db75B32Dac366666621633b2259bF332D6](https://sepolia.basescan.org/address/0xA2f565Db75B32Dac366666621633b2259bF332D6)
- **Block Explorer**: https://sepolia.basescan.org
- **Bridge**: https://bridge.base.org/deposit

### Celo Mainnet
- **Factory Contract**: [0x06CB6b1B6DD6B16DF66f50a597ef7902c80F937f](https://celoscan.io/address/0x06CB6b1B6DD6B16DF66f50a597ef7902c80F937f)
- **Budget Wallet Template**: [0x30C72e2b14eE982fE3587e366C9093845e84aa1f](https://celoscan.io/address/0x30C72e2b14eE982fE3587e366C9093845e84aa1f)
- **Block Explorer**: https://celoscan.io
- **Official Website**: https://celo.org