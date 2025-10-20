// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../../src/ExpendiBucketManager.sol";

contract DeployMainnet is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Mainnet subscription service contract addresses (replace with actual addresses)
        address subscriptionDataAddress = vm.envAddress("SUBSCRIPTION_DATA_MANAGER_ADDRESS");
        address subscriptionPaymentAddress = vm.envAddress("SUBSCRIPTION_PAYMENT_PROCESSOR_ADDRESS");
        
        require(subscriptionDataAddress != address(0), "SUBSCRIPTION_DATA_MANAGER_ADDRESS not set");
        require(subscriptionPaymentAddress != address(0), "SUBSCRIPTION_PAYMENT_PROCESSOR_ADDRESS not set");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying to Base Mainnet...");
        console.log("Deployer:", deployer);
        console.log("Subscription Data Manager:", subscriptionDataAddress);
        console.log("Subscription Payment Processor:", subscriptionPaymentAddress);
        
        // Deploy the main contract
        ExpendiBucketManager manager = new ExpendiBucketManager(
            subscriptionDataAddress,
            subscriptionPaymentAddress
        );
        
        console.log("ExpendiBucketManager deployed at:", address(manager));
        
        // Add Base Mainnet supported tokens
        address baseMainnetUSDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Base Mainnet USDC
        address baseMainnetDAI = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb; // Base Mainnet DAI
        address baseMainnetUSDT = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2; // Base Mainnet USDT
        
        manager.addSupportedToken(baseMainnetUSDC);
        manager.addSupportedToken(baseMainnetDAI);
        manager.addSupportedToken(baseMainnetUSDT);
        
        console.log("Added supported tokens:");
        console.log("  USDC:", baseMainnetUSDC);
        console.log("  DAI:", baseMainnetDAI);
        console.log("  USDT:", baseMainnetUSDT);
        
        // Setup production roles
        address subscriptionManager = vm.envAddress("SUBSCRIPTION_MANAGER_ADDRESS");
        address emergencyManager = vm.envAddress("EMERGENCY_MANAGER_ADDRESS");
        
        if (subscriptionManager != address(0)) {
            manager.grantRole(manager.SUBSCRIPTION_MANAGER_ROLE(), subscriptionManager);
            console.log("Granted SUBSCRIPTION_MANAGER_ROLE to:", subscriptionManager);
        }
        
        if (emergencyManager != address(0)) {
            manager.grantRole(manager.EMERGENCY_ROLE(), emergencyManager);
            console.log("Granted EMERGENCY_ROLE to:", emergencyManager);
        }
        
        // Output deployment summary
        console.log("");
        console.log("=== MAINNET DEPLOYMENT SUMMARY ===");
        console.log("Network: Base Mainnet (Chain ID: 8453)");
        console.log("ExpendiBucketManager:", address(manager));
        console.log("Subscription Data Manager:", subscriptionDataAddress);
        console.log("Subscription Payment Processor:", subscriptionPaymentAddress);
        console.log("Deployer:", deployer);
        console.log("");
        
        // Save deployment addresses to file
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "ExpendiBucketManager": "', vm.toString(address(manager)), '",\n',
            '  "SubscriptionDataManager": "', vm.toString(subscriptionDataAddress), '",\n',
            '  "SubscriptionPaymentProcessor": "', vm.toString(subscriptionPaymentAddress), '",\n',
            '  "supportedTokens": {\n',
            '    "USDC": "', vm.toString(baseMainnetUSDC), '",\n',
            '    "DAI": "', vm.toString(baseMainnetDAI), '",\n',
            '    "USDT": "', vm.toString(baseMainnetUSDT), '"\n',
            '  },\n',
            '  "chainId": 8453,\n',
            '  "deployer": "', vm.toString(deployer), '"\n',
            '}'
        ));
        
        vm.writeFile("./deployments/mainnet-deployment.json", json);
        console.log("Deployment info saved to ./deployments/mainnet-deployment.json");
        
        console.log("");
        console.log("Please verify the contract on Basescan:");
        console.log("forge verify-contract", address(manager), "src/ExpendiBucketManager.sol:ExpendiBucketManager --chain-id 8453");
        
        vm.stopBroadcast();
    }
}