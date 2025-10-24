#!/bin/bash

# Goalz Contract Deployment Script for Base Mainnet
# Run with: ./deploy.sh

set -e

echo "🚀 Deploying Goalz Contract to Base Mainnet"
echo "==========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Source environment variables
source .env

# Validate required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "⚠️  Warning: ETHERSCAN_API_KEY not set. Contract verification may fail."
fi

echo "📋 Pre-deployment checks:"
echo "  - Network: Base Mainnet (Chain ID: 8453)"
echo "  - USDC Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
echo "  - Morpho Vault: 0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A (Spark USDC)"
echo "  - Gelato Automate: 0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo "🔄 Starting deployment..."

# Deploy the contract
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol:DeployGoalz \
    --rpc-url base \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    2>&1)

echo "$DEPLOY_OUTPUT"

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o "Goalz deployed at: 0x[a-fA-F0-9]\{40\}" | cut -d' ' -f4)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Failed to extract contract address from deployment output"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo "📍 Contract Address: $CONTRACT_ADDRESS"
echo ""

# Wait a bit for contract to be indexed
echo "⏳ Waiting 30 seconds for contract to be indexed..."
sleep 30

echo "🔍 Verifying on Blockscout..."

# Verify on Blockscout
BLOCKSCOUT_OUTPUT=$(forge verify-contract $CONTRACT_ADDRESS \
    src/Goalz_Morpho.sol:Goalz \
    --verifier blockscout \
    --verifier-url https://base.blockscout.com/api \
    --constructor-args $(cast abi-encode "constructor(address[],address[],address)" \
        "[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913]" \
        "[0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A]" \
        "0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0") \
    2>&1)

echo "$BLOCKSCOUT_OUTPUT"

echo ""
echo "🎉 Deployment Complete!"
echo "========================"
echo "📍 Contract Address: $CONTRACT_ADDRESS"
echo "🔗 Basescan: https://basescan.org/address/$CONTRACT_ADDRESS"
echo "🔗 Blockscout: https://base.blockscout.com/address/$CONTRACT_ADDRESS"
echo ""
echo "🔧 Manual verification commands (if needed):"
echo "Basescan:"
echo "forge verify-contract $CONTRACT_ADDRESS src/Goalz_Morpho.sol:Goalz --chain-id 8453 --etherscan-api-key \$ETHERSCAN_API_KEY"
echo ""
echo "Blockscout:"
echo "forge verify-contract $CONTRACT_ADDRESS src/Goalz_Morpho.sol:Goalz --verifier blockscout --verifier-url https://base.blockscout.com/api"
echo ""
echo "🏁 Deployment and verification complete!"