#!/bin/bash

# ExpendiBucketManager Chainlink Automation Deployment Script
# This script deploys the automation system to Base Sepolia

set -e

echo "🚀 Deploying ExpendiBucketManager Chainlink Automation"
echo "======================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Check if environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
    print_error "PRIVATE_KEY environment variable not set"
    echo ""
    echo "Please set your private key:"
    echo "export PRIVATE_KEY=\"your_private_key_here\""
    echo ""
    echo "Or create a .env file with:"
    echo "PRIVATE_KEY=your_private_key_here"
    echo "RPC_URL=https://sepolia.base.org"
    echo ""
    exit 1
fi

# Set default RPC URL if not provided
if [ -z "$RPC_URL" ]; then
    export RPC_URL="https://sepolia.base.org"
    print_warning "Using default RPC URL: $RPC_URL"
fi

print_success "Environment variables configured"

# Verify we're on the right network
print_status "Verifying network connection..."
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' $RPC_URL | grep -q "0x14a34"; then
    print_success "Connected to Base Sepolia (Chain ID: 84532)"
else
    print_error "Unable to connect to Base Sepolia"
    exit 1
fi

# Check if contracts compile
print_status "Compiling contracts..."
if forge build; then
    print_success "Contracts compiled successfully"
else
    print_error "Contract compilation failed"
    exit 1
fi

# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
print_status "Deployer address: $DEPLOYER_ADDRESS"

# Check deployer balance
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL)
BALANCE_ETH=$(cast to-unit $BALANCE ether)
print_status "Deployer balance: $BALANCE_ETH ETH"

if (( $(echo "$BALANCE_ETH < 0.01" | bc -l) )); then
    print_warning "Low ETH balance. You may need more ETH for deployment."
    echo "Get Base Sepolia ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
fi

# Deploy automation contract
print_status "Deploying ExpendiBucketManagerAutomation contract..."
echo ""

# Run deployment script
if forge script script/deployment/DeployAutomation.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    --chain-id 84532; then
    
    print_success "Deployment completed successfully!"
    
else
    print_error "Deployment failed"
    exit 1
fi

echo ""
echo "🎉 Deployment Summary"
echo "===================="
echo ""

# Read deployment info if it exists
if [ -f "deployments/automation-deployment.json" ]; then
    print_success "Deployment info saved to: deployments/automation-deployment.json"
    
    # Extract contract address from broadcast file if available
    BROADCAST_DIR="broadcast/DeployAutomation.s.sol/84532"
    if [ -f "$BROADCAST_DIR/run-latest.json" ]; then
        AUTOMATION_ADDRESS=$(cat "$BROADCAST_DIR/run-latest.json" | jq -r '.transactions[] | select(.contractName == "ExpendiBucketManagerAutomation") | .contractAddress' 2>/dev/null || echo "Not found")
        if [ "$AUTOMATION_ADDRESS" != "Not found" ] && [ "$AUTOMATION_ADDRESS" != "null" ]; then
            echo "Automation Contract: $AUTOMATION_ADDRESS"
        fi
    fi
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Register Chainlink Automation Upkeep:"
echo "   - Go to: https://automation.chain.link/"
echo "   - Connect wallet to Base Sepolia"
echo "   - Click 'Register New Upkeep'"
echo ""
echo "2. Upkeep Configuration:"
echo "   - Trigger Type: CUSTOM LOGIC"
echo "   - Target Contract: [Automation Contract Address]"
echo "   - Upkeep Name: ExpendiBucketManager Subscriptions"
echo "   - Gas Limit: 2,000,000"
echo "   - Starting Balance: 5 LINK"
echo "   - Check Data: 0x (empty)"
echo ""
echo "3. Fund the Upkeep:"
echo "   - Get Base Sepolia LINK: https://faucets.chain.link/"
echo "   - Add 5+ LINK tokens to your upkeep"
echo ""
echo "4. Track Subscriptions:"
echo "   - Call trackUserSubscription(user, subscriptionId) for existing subscriptions"
echo "   - New subscriptions will need to be tracked manually or via integration"
echo ""
echo "5. Monitor Performance:"
echo "   - Use getAutomationStats() to check performance"
echo "   - Monitor upkeep execution on Chainlink dashboard"
echo ""

print_success "Chainlink Automation deployment complete! 🚀"
echo ""
echo "📖 Documentation:"
echo "- Setup Guide: AUTOMATION_SETUP.md"
echo "- Test Results: TEST_RESULTS.md"
echo "- Testing Guide: TESTING_GUIDE.md"