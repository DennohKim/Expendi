// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";

contract DeploySimpleBaseSepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== DEPLOYING TO BASE SEPOLIA ===");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SimpleBudgetWallet template
        console.log("\n1. Deploying SimpleBudgetWallet template...");
        SimpleBudgetWallet budgetWallet = new SimpleBudgetWallet();
        console.log("SimpleBudgetWallet deployed at:", address(budgetWallet));
        
        // Deploy SimpleBudgetWalletFactory
        console.log("\n2. Deploying SimpleBudgetWalletFactory...");
        SimpleBudgetWalletFactory factory = new SimpleBudgetWalletFactory();
        console.log("SimpleBudgetWalletFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("SimpleBudgetWallet:", address(budgetWallet));
        console.log("SimpleBudgetWalletFactory:", address(factory));
        console.log("Network: Base Sepolia (Chain ID: 84532)");
        
        console.log("\n=== FRONTEND CONFIG ===");
        console.log("Add these to your frontend .env:");
        console.log("NEXT_PUBLIC_BUDGET_WALLET_ADDRESS=%s", address(budgetWallet));
        console.log("NEXT_PUBLIC_FACTORY_ADDRESS=%s", address(factory));
        console.log("NEXT_PUBLIC_CHAIN_ID=84532");
    }
}