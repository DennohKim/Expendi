// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/ExpendiSubscriptions.sol";

/**
 * @title DeployExpendiSubscriptions
 * @dev Deployment script for Expendi custom subscription contracts
 */
contract DeployExpendiSubscriptions is Script {
    // Base mainnet USDC address
    address constant USDC_BASE_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    // Default fee recipient
    address constant DEFAULT_FEE_RECIPIENT = 0xAE609c3904C539aF2Ac11a86D0B030a77dB0a509;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Expendi Subscription contracts...");
        console.log("Deployer:", deployer);
        console.log("USDC Address:", USDC_BASE_MAINNET);
        console.log("Fee Recipient:", DEFAULT_FEE_RECIPIENT);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Singleton Subscription Contract
        ExpendiSubscriptions mainContract = new ExpendiSubscriptions(
            USDC_BASE_MAINNET,
            DEFAULT_FEE_RECIPIENT
        );
        
        console.log("Singleton Subscription Contract deployed at:", address(mainContract));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Deployment Summary ===");
        console.log("Network: Base Mainnet (Chain ID: 8453)");
        console.log("Singleton Subscription Contract:", address(mainContract));
        console.log("USDC Token:", USDC_BASE_MAINNET);
        console.log("Fee Recipient:", DEFAULT_FEE_RECIPIENT);
        
        console.log("\n=== Next Steps ===");
        console.log("1. Verify contracts on Basescan");
        console.log("2. Update backend environment variables");
        console.log("3. Update frontend contract addresses");
        console.log("4. Test with small amounts first");
    }
}

/**
 * @title DeployExpendiSubscriptionsTestnet
 * @dev Deployment script for testnet (Base Sepolia)
 */
contract DeployExpendiSubscriptionsTestnet is Script {
    // Base Sepolia USDC address (you may need to deploy MockUSDC for testing)
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
    
    // Testnet fee recipient
    address constant TESTNET_FEE_RECIPIENT = 0xAE609c3904C539aF2Ac11a86D0B030a77dB0a509;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Expendi Subscription contracts to Base Sepolia...");
        console.log("Deployer:", deployer);
        console.log("USDC Address:", USDC_BASE_SEPOLIA);
        console.log("Fee Recipient:", TESTNET_FEE_RECIPIENT);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Singleton Subscription Contract
        ExpendiSubscriptions mainContract = new ExpendiSubscriptions(
            USDC_BASE_SEPOLIA,
            TESTNET_FEE_RECIPIENT
        );
        
        console.log("Singleton Subscription Contract deployed at:", address(mainContract));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Testnet Deployment Summary ===");
        console.log("Network: Base Sepolia (Chain ID: 84532)");
        console.log("Singleton Subscription Contract:", address(mainContract));
        console.log("USDC Token:", USDC_BASE_SEPOLIA);
        console.log("Fee Recipient:", TESTNET_FEE_RECIPIENT);
    }
}