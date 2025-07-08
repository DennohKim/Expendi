// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";

contract DeployFresh is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== FRESH DEPLOYMENT TO BASE SEPOLIA ===");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SimpleBudgetWalletFactory with 0 creation fee
        console.log("\n1. Deploying SimpleBudgetWalletFactory...");
        SimpleBudgetWalletFactory factory = new SimpleBudgetWalletFactory(0);
        console.log("Factory deployed at:", address(factory));
        console.log("Creation fee:", factory.creationFee());
        console.log("Factory owner:", factory.owner());
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Factory Address:", address(factory));
        console.log("Template will be created when users call createWallet()");
        
        // Test factory functionality
        console.log("\n=== TESTING FACTORY ===");
        console.log("Total wallets created:", factory.totalWalletsCreated());
        console.log("Deployer has wallet:", factory.hasWallet(deployer));
    }
}