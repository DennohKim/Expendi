// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../../src/ExpendiBucketManager.sol";
import "../../src/mocks/MockSubscriptionDataManager.sol";
import "../../src/mocks/MockSubscriptionPaymentProcessor.sol";

contract DeployExpendiBucketManager is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // For testnet deployment, deploy mock subscription service contracts
        // For mainnet, you would use actual subscription service contract addresses
        address subscriptionDataAddress;
        address subscriptionPaymentAddress;
        
        if (block.chainid == 84532) { // Base Sepolia
            console.log("Deploying to Base Sepolia testnet...");
            
            // Deploy mock subscription service contracts for testing
            MockSubscriptionDataManager mockDataManager = new MockSubscriptionDataManager();
            MockSubscriptionPaymentProcessor mockPaymentProcessor = new MockSubscriptionPaymentProcessor();
            
            subscriptionDataAddress = address(mockDataManager);
            subscriptionPaymentAddress = address(mockPaymentProcessor);
            
            console.log("Mock Subscription Data Manager deployed at:", subscriptionDataAddress);
            console.log("Mock Subscription Payment Processor deployed at:", subscriptionPaymentAddress);
            
        } else if (block.chainid == 8453) { // Base Mainnet
            console.log("Deploying to Base Mainnet...");
            
            // Use actual subscription service contract addresses on mainnet
            // TODO: Replace with actual subscription service contract addresses
            subscriptionDataAddress = 0x1234567890123456789012345678901234567890; // Replace with actual
            subscriptionPaymentAddress = 0x0987654321098765432109876543210987654321; // Replace with actual
            
            console.log("Using Subscription Data Manager at:", subscriptionDataAddress);
            console.log("Using Subscription Payment Processor at:", subscriptionPaymentAddress);
            
        } else {
            revert("Unsupported network");
        }
        
        // Deploy the main contract
        ExpendiBucketManager manager = new ExpendiBucketManager(
            subscriptionDataAddress,
            subscriptionPaymentAddress
        );
        
        console.log("ExpendiBucketManager deployed at:", address(manager));
        
        // If testnet, add supported tokens for testing
        if (block.chainid == 84532) {
            // Add Base Sepolia USDC for testing
            address baseSepoliaUSDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
            manager.addSupportedToken(baseSepoliaUSDC);
            console.log("Added Base Sepolia USDC as supported token:", baseSepoliaUSDC);
        } else if (block.chainid == 8453) {
            // Add Base Mainnet tokens
            address baseMainnetUSDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Base Mainnet USDC
            address baseMainnetDAI = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb; // Base Mainnet DAI
            manager.addSupportedToken(baseMainnetUSDC);
            manager.addSupportedToken(baseMainnetDAI);
            console.log("Added Base Mainnet USDC as supported token:", baseMainnetUSDC);
            console.log("Added Base Mainnet DAI as supported token:", baseMainnetDAI);
        }
        
        // Output deployment info
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("Network:", block.chainid == 84532 ? "Base Sepolia" : "Base Mainnet");
        console.log("ExpendiBucketManager:", address(manager));
        console.log("Subscription Data Manager:", subscriptionDataAddress);
        console.log("Subscription Payment Processor:", subscriptionPaymentAddress);
        console.log("");
        console.log("Please verify contracts on Basescan:");
        console.log("forge verify-contract", address(manager), "src/ExpendiBucketManager.sol:ExpendiBucketManager --chain-id", block.chainid);
        
        vm.stopBroadcast();
    }
}