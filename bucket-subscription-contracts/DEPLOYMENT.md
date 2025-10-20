# ExpendiBucketSubscriptionManager Deployment Guide

This guide explains how to deploy the ExpendiBucketSubscriptionManager smart contract to Base Sepolia testnet and Base mainnet.

## Prerequisites

1. **Foundry** installed and configured
2. **Private key** with sufficient ETH for deployment
3. **Basescan API key** for contract verification
4. **Spheron contract addresses** (for mainnet deployment)

## Setup

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Fill in your private key and API keys in `.env`:
```bash
PRIVATE_KEY=your_private_key_without_0x_prefix
BASESCAN_API_KEY=your_basescan_api_key
```

## Testing

Run all tests before deployment:
```bash
forge test
```

All tests should pass before proceeding with deployment.

## Deployment

### Base Sepolia Testnet

Deploy to Base Sepolia with mock Spheron contracts for testing:

```bash
forge script script/deployment/DeployTestnet.s.sol --rpc-url base_sepolia --broadcast --verify
```

This will:
- Deploy mock Spheron contracts
- Deploy the main ExpendiBucketSubscriptionManager contract
- Deploy a mock USDC token for testing
- Grant all roles to the deployer
- Save deployment info to `deployments/testnet-deployment.json`

### Base Mainnet

Before mainnet deployment, set the Spheron contract addresses in `.env`:
```bash
SPHERON_DATA_ADDRESS=0x...actual_spheron_data_address
SPHERON_DEPAY_ADDRESS=0x...actual_spheron_depay_address
```

Deploy to Base mainnet:

```bash
forge script script/deployment/DeployMainnet.s.sol --rpc-url base_mainnet --broadcast --verify
```

This will:
- Deploy ExpendiBucketSubscriptionManager with real Spheron contracts
- Add Base mainnet tokens (USDC, DAI, USDT) as supported
- Grant roles to specified addresses (if provided)
- Save deployment info to `deployments/mainnet-deployment.json`

## Post-Deployment Verification

1. **Verify on Basescan**: Contracts should auto-verify if API key is set correctly
2. **Test basic functionality**:
   - Create a bucket
   - Fund the bucket
   - Make a one-time payment
   - Create a subscription
3. **Grant additional roles** if needed

## Contract Verification (Manual)

If auto-verification fails, verify manually:

```bash
# Testnet
forge verify-contract <CONTRACT_ADDRESS> src/ExpendiBucketSubscriptionManager.sol:ExpendiBucketSubscriptionManager --chain-id 84532 --constructor-args $(cast abi-encode "constructor(address,address)" <SPHERON_DATA> <SPHERON_DEPAY>)

# Mainnet
forge verify-contract <CONTRACT_ADDRESS> src/ExpendiBucketSubscriptionManager.sol:ExpendiBucketSubscriptionManager --chain-id 8453 --constructor-args $(cast abi-encode "constructor(address,address)" <SPHERON_DATA> <SPHERON_DEPAY>)
```

## Important Security Notes

1. **Never commit private keys** to version control
2. **Test thoroughly on testnet** before mainnet deployment
3. **Use a multisig wallet** for mainnet admin roles
4. **Set up proper role management** in production
5. **Monitor emergency pause functionality**

## Deployment Files

- `deployments/testnet-deployment.json` - Testnet deployment addresses
- `deployments/mainnet-deployment.json` - Mainnet deployment addresses

## Contract Addresses

### Base Sepolia Testnet
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Base Mainnet
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- DAI: `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb`
- USDT: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`

## Troubleshooting

### Gas Issues
- Increase gas limit: `--gas-limit 5000000`
- Check gas price: `--gas-price 1000000000` (1 gwei)

### RPC Issues
- Use alternative RPC endpoints
- Check network status

### Verification Issues
- Ensure constructor args are correct
- Check Basescan API key is valid
- Try manual verification

## Support

For issues with deployment, check:
1. Foundry documentation
2. Base network status
3. Contract logs and events