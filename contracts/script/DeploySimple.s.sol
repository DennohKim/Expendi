// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";

contract DeploySimple is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("=== DEPLOYING TO BASE SEPOLIA ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SimpleBudgetWallet
        SimpleBudgetWallet budgetWallet = new SimpleBudgetWallet();
        console.log("SimpleBudgetWallet:", address(budgetWallet));
        
        // Deploy SimpleBudgetWalletFactory
        SimpleBudgetWalletFactory factory = new SimpleBudgetWalletFactory(0);
        console.log("SimpleBudgetWalletFactory:", address(factory));
        
        vm.stopBroadcast();
        
        console.log("=== DEPLOYMENT COMPLETE ===");
    }
}