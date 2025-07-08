// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";

contract DeployBudgetWallet is Script {
    SimpleBudgetWallet public budgetWallet;
    SimpleBudgetWalletFactory public factory;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== DEPLOYING BUDGET WALLET TO BASE ===");
        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy SimpleBudgetWallet
        console.log("\n1. Deploying SimpleBudgetWallet...");
        budgetWallet = new SimpleBudgetWallet();
        console.log("SimpleBudgetWallet deployed at:", address(budgetWallet));
        
        // 2. Deploy SimpleBudgetWalletFactory
        console.log("\n2. Deploying SimpleBudgetWalletFactory...");
        uint256 creationFee = vm.envOr("WALLET_CREATION_FEE", uint256(0));
        factory = new SimpleBudgetWalletFactory(creationFee);
        console.log("SimpleBudgetWalletFactory deployed at:", address(factory));
        console.log("Creation fee set to:", creationFee);
        
        vm.stopBroadcast();
        
        // 3. Log deployment summary
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Network:", _getNetworkName());
        console.log("SimpleBudgetWallet:", address(budgetWallet));
        console.log("SimpleBudgetWalletFactory:", address(factory));
        console.log("Deployer:", deployer);
        console.log("Gas used: Check transaction receipt");
        
        // 4. Save deployment info
        _saveDeploymentInfo();
        
        // 5. Generate environment variables
        _generateEnvVariables();
    }
    
    function _getNetworkName() internal view returns (string memory) {
        if (block.chainid == 8453) return "Base Mainnet";
        if (block.chainid == 84532) return "Base Sepolia";
        if (block.chainid == 31337) return "Local";
        return "Unknown";
    }
    
    function _saveDeploymentInfo() internal {
        string memory json = "deployment";
        
        vm.serializeAddress(json, "budgetWallet", address(budgetWallet));
        vm.serializeAddress(json, "factory", address(factory));
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeString(json, "network", _getNetworkName());
        vm.serializeUint(json, "deployedAt", block.timestamp);
        
        string memory finalJson = vm.serializeAddress(json, "deployer", msg.sender);
        
        string memory filename = string.concat("./deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(finalJson, filename);
        
        console.log("\n4. Deployment info saved to:", filename);
    }
    
    function _generateEnvVariables() internal view {
        console.log("\n5. Add these to your .env.local:");
        console.log("NEXT_PUBLIC_BUDGET_WALLET_ADDRESS=%s", address(budgetWallet));
        console.log("NEXT_PUBLIC_FACTORY_ADDRESS=%s", address(factory));
        console.log("NEXT_PUBLIC_CHAIN_ID=%s", vm.toString(block.chainid));
        console.log("NEXT_PUBLIC_NETWORK_NAME=%s", _getNetworkName());
    }
}