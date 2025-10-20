// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../../src/ExpendiBucketManager.sol";
import "../../src/mocks/MockSubscriptionDataManager.sol";
import "../../src/mocks/MockSubscriptionPaymentProcessor.sol";
import "../../src/mocks/MockUSDC.sol";

contract DeployTestnet is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying to testnet with deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        
        // Deploy mock subscription service contracts
        MockSubscriptionDataManager mockDataManager = new MockSubscriptionDataManager();
        MockSubscriptionPaymentProcessor mockPaymentProcessor = new MockSubscriptionPaymentProcessor();
        
        console.log("Mock Subscription Data Manager deployed at:", address(mockDataManager));
        console.log("Mock Subscription Payment Processor deployed at:", address(mockPaymentProcessor));
        
        // Deploy the main contract
        ExpendiBucketManager manager = new ExpendiBucketManager(
            address(mockDataManager),
            address(mockPaymentProcessor)
        );
        
        console.log("ExpendiBucketManager deployed at:", address(manager));
        
        // Deploy mock USDC for testing
        MockUSDC mockUSDC = new MockUSDC();
        console.log("Mock USDC deployed at:", address(mockUSDC));
        
        // Add mock USDC as supported token
        manager.addSupportedToken(address(mockUSDC));
        
        // If Base Sepolia, also add official testnet USDC
        if (block.chainid == 84532) {
            address baseSepoliaUSDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
            manager.addSupportedToken(baseSepoliaUSDC);
            console.log("Added Base Sepolia USDC:", baseSepoliaUSDC);
        }
        
        // Grant roles for testing
        bytes32 subscriptionManagerRole = manager.SUBSCRIPTION_MANAGER_ROLE();
        bytes32 emergencyRole = manager.EMERGENCY_ROLE();
        
        // Grant deployer all roles for testing
        manager.grantRole(subscriptionManagerRole, deployer);
        manager.grantRole(emergencyRole, deployer);
        
        console.log("Granted SUBSCRIPTION_MANAGER_ROLE to deployer");
        console.log("Granted EMERGENCY_ROLE to deployer");
        
        // Mint some test tokens to deployer
        mockUSDC.mint(deployer, 1000000e6); // 1M USDC
        console.log("Minted 1,000,000 Mock USDC to deployer");
        
        // Output deployment summary
        console.log("");
        console.log("=== TESTNET DEPLOYMENT SUMMARY ===");
        console.log("ExpendiBucketManager:", address(manager));
        console.log("Mock Subscription Data Manager:", address(mockDataManager));
        console.log("Mock Subscription Payment Processor:", address(mockPaymentProcessor));
        console.log("Mock USDC:", address(mockUSDC));
        console.log("Deployer has all admin roles and test tokens");
        console.log("");
        
        // Save deployment addresses to file
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "ExpendiBucketManager": "', vm.toString(address(manager)), '",\n',
            '  "MockSubscriptionDataManager": "', vm.toString(address(mockDataManager)), '",\n',
            '  "MockSubscriptionPaymentProcessor": "', vm.toString(address(mockPaymentProcessor)), '",\n',
            '  "MockUSDC": "', vm.toString(address(mockUSDC)), '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deployer": "', vm.toString(deployer), '"\n',
            '}'
        ));
        
        // vm.writeFile("./deployments/testnet-deployment.json", json);
        // console.log("Deployment info saved to ./deployments/testnet-deployment.json");
        
        vm.stopBroadcast();
    }
}