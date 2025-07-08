// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";

contract TestDeployment is Script {
    function run() external {
        // Read deployment addresses
        string memory deploymentFile = string.concat("./deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(deploymentFile);
        
        address budgetWalletAddr = vm.parseJsonAddress(json, ".budgetWallet");
        address factoryAddr = vm.parseJsonAddress(json, ".factory");
        
        SimpleBudgetWallet budgetWallet = SimpleBudgetWallet(payable(budgetWalletAddr));
        SimpleBudgetWalletFactory factory = SimpleBudgetWalletFactory(factoryAddr);
        
        uint256 testPrivateKey = vm.envUint("TEST_PRIVATE_KEY");
        address testUser = vm.addr(testPrivateKey);
        
        console.log("=== TESTING DEPLOYMENT ===");
        console.log("Test user:", testUser);
        console.log("Test user balance:", testUser.balance);
        
        vm.startBroadcast(testPrivateKey);
        
        // 1. Test factory
        console.log("\n1. Testing factory...");
        bool hasWallet = factory.hasWallet(testUser);
        console.log("User has wallet:", hasWallet);
        
        if (!hasWallet && testUser.balance > 0.01 ether) {
            console.log("Creating wallet for test user...");
            address newWallet = factory.createWallet();
            console.log("Created wallet at:", newWallet);
        }
        
        // 2. Test budget wallet basic functions
        console.log("\n2. Testing budget wallet...");
        
        if (testUser.balance > 0.01 ether) {
            // Deposit some ETH
            console.log("Depositing 0.01 ETH...");
            budgetWallet.depositETH{value: 0.01 ether}();
            
            uint256 balance = budgetWallet.getUnallocatedBalance(testUser, address(0));
            console.log("Unallocated balance:", balance);
            
            // Create a test bucket
            console.log("Creating test bucket...");
            budgetWallet.createBucket("test", 0.1 ether);
            
            string[] memory buckets = budgetWallet.getUserBuckets(testUser);
            console.log("User buckets count:", buckets.length);
            if (buckets.length > 0) {
                console.log("First bucket:", buckets[0]);
            }
        } else {
            console.log("Insufficient balance for testing. Send some ETH to:", testUser);
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== TEST COMPLETE ===");
    }
}
