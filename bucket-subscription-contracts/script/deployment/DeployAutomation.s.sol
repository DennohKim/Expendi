// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../../src/automation/ExpendiBucketManagerAutomation.sol";
import "../../src/ExpendiBucketManager.sol";

/**
 * @title DeployAutomation
 * @dev Deployment script for ExpendiBucketManagerAutomation contract
 */
contract DeployAutomation is Script {
    
    // Base Sepolia contract addresses
    address constant EXPENDI_BUCKET_MANAGER = 0x4832FE3192f205F753F1C334916B7cfec7823D64;
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying ExpendiBucketManagerAutomation...");
        console.log("Deployer:", deployer);
        console.log("ExpendiBucketManager:", EXPENDI_BUCKET_MANAGER);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy automation contract
        ExpendiBucketManagerAutomation automation = new ExpendiBucketManagerAutomation(
            EXPENDI_BUCKET_MANAGER
        );
        
        console.log("ExpendiBucketManagerAutomation deployed at:", address(automation));
        
        // Grant SUBSCRIPTION_MANAGER_ROLE to automation contract on ExpendiBucketManager
        ExpendiBucketManager bucketManager = ExpendiBucketManager(EXPENDI_BUCKET_MANAGER);
        
        // Check if deployer has admin role to grant the automation role
        bytes32 ADMIN_ROLE = keccak256("ADMIN_ROLE");
        bytes32 SUBSCRIPTION_MANAGER_ROLE = keccak256("SUBSCRIPTION_MANAGER_ROLE");
        
        if (bucketManager.hasRole(ADMIN_ROLE, deployer)) {
            console.log("Granting SUBSCRIPTION_MANAGER_ROLE to automation contract...");
            bucketManager.grantRole(SUBSCRIPTION_MANAGER_ROLE, address(automation));
            console.log("SUBSCRIPTION_MANAGER_ROLE granted successfully");
        } else {
            console.log("WARNING: Deployer does not have ADMIN_ROLE, cannot grant SUBSCRIPTION_MANAGER_ROLE");
            console.log("Please manually grant SUBSCRIPTION_MANAGER_ROLE to automation contract:", address(automation));
        }
        
        vm.stopBroadcast();
        
        // Verify deployment
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Base Sepolia");
        console.log("ExpendiBucketManager:", EXPENDI_BUCKET_MANAGER);
        console.log("ExpendiBucketManagerAutomation:", address(automation));
        console.log("Deployer:", deployer);
        
        // Output automation configuration
        console.log("\n=== AUTOMATION CONFIGURATION ===");
        console.log("Check Interval:", automation.checkInterval(), "seconds");
        console.log("Max Batch Size:", automation.maxBatchSize());
        console.log("Total Tracked Users:", automation.getTrackedUsers().length);
        
        // Output next steps
        console.log("\n=== NEXT STEPS ===");
        console.log("1. Register upkeep on Chainlink Automation: https://automation.chain.link/");
        console.log("2. Use target address:", address(automation));
        console.log("3. Fund upkeep with LINK tokens");
        console.log("4. Track user subscriptions with trackUserSubscription()");
        console.log("5. Monitor automation with getAutomationStats()");
        
        // Save deployment info to JSON
        string memory deploymentInfo = string(abi.encodePacked(
            '{\n',
            '  "network": "Base Sepolia",\n',
            '  "chainId": 84532,\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "deploymentDate": "', vm.toString(block.timestamp), '",\n',
            '  "contracts": {\n',
            '    "ExpendiBucketManager": "', vm.toString(EXPENDI_BUCKET_MANAGER), '",\n',
            '    "ExpendiBucketManagerAutomation": "', vm.toString(address(automation)), '"\n',
            '  },\n',
            '  "automationConfig": {\n',
            '    "checkInterval": ', vm.toString(automation.checkInterval()), ',\n',
            '    "maxBatchSize": ', vm.toString(automation.maxBatchSize()), '\n',
            '  },\n',
            '  "chainlinkAutomation": {\n',
            '    "registryUrl": "https://automation.chain.link/",\n',
            '    "targetContract": "', vm.toString(address(automation)), '",\n',
            '    "upkeepNeeded": true\n',
            '  }\n',
            '}'
        ));
        
        vm.writeFile("deployments/automation-deployment.json", deploymentInfo);
        console.log("Deployment info saved to: deployments/automation-deployment.json");
    }
}