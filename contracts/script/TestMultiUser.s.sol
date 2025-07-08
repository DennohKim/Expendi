// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";

contract TestMultiUser is Script {
    address constant FACTORY_ADDRESS = 0x488B7a8c4431F9Ba1b86f44Ccb5b2Bf2825f1031;
    
    function run() external {
        console.log("=== TESTING MULTI-USER FACTORY FUNCTIONALITY ===");
        console.log("Factory:", FACTORY_ADDRESS);
        
        SimpleBudgetWalletFactory factory = SimpleBudgetWalletFactory(FACTORY_ADDRESS);
        
        // Use a different private key for second user simulation
        uint256 user1PrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 user2PrivateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        
        address user1 = vm.addr(user1PrivateKey);
        address user2 = vm.addr(user2PrivateKey);
        
        console.log("User 1 (existing):", user1);
        console.log("User 2 (new):", user2);
        console.log("User 2 balance:", user2.balance);
        
        console.log("\n1. Initial factory state");
        console.log("Total wallets created:", factory.totalWalletsCreated());
        console.log("User 1 has wallet:", factory.hasWallet(user1));
        console.log("User 2 has wallet:", factory.hasWallet(user2));
        
        if (user2.balance > 0.01 ether) {
            console.log("\n2. Creating wallet for User 2");
            vm.startBroadcast(user2PrivateKey);
            
            try factory.createWallet{value: 0}() returns (address newWallet) {
                console.log("SUCCESS: Wallet created for User 2 at:", newWallet);
                
                // Test the new wallet
                SimpleBudgetWallet wallet = SimpleBudgetWallet(payable(newWallet));
                
                // Deposit some ETH
                wallet.depositETH{value: 0.001 ether}();
                console.log("Deposited 0.001 ETH to User 2 wallet");
                
                // Create a bucket
                wallet.createBucket("test-bucket", 0.0005 ether);
                console.log("Created test-bucket with 0.0005 ETH limit");
                
                // Fund the bucket
                wallet.fundBucket("test-bucket", 0.0005 ether, address(0));
                console.log("Funded test-bucket with 0.0005 ETH");
                
                // Check bucket details
                (uint256 balance, uint256 spent, uint256 limit, , bool active) = 
                    wallet.getBucket(user2, "test-bucket");
                console.log("Bucket balance:", balance);
                console.log("Monthly limit:", limit);
                console.log("Active:", active);
                
            } catch Error(string memory reason) {
                console.log("ERROR: Failed to create wallet for User 2:", reason);
            }
            
            vm.stopBroadcast();
        } else {
            console.log("SKIP: User 2 has insufficient balance to test wallet creation");
        }
        
        console.log("\n3. Final factory state");
        console.log("Total wallets created:", factory.totalWalletsCreated());
        console.log("User 1 has wallet:", factory.hasWallet(user1));
        console.log("User 2 has wallet:", factory.hasWallet(user2));
        
        if (factory.hasWallet(user1)) {
            console.log("User 1 wallet:", factory.getWallet(user1));
        }
        if (factory.hasWallet(user2)) {
            console.log("User 2 wallet:", factory.getWallet(user2));
        }
        
        console.log("\n=== MULTI-USER TEST COMPLETE ===");
    }
}