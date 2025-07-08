// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";

contract TestDeterministic is Script {
    address constant FACTORY_ADDRESS = 0x488B7a8c4431F9Ba1b86f44Ccb5b2Bf2825f1031;
    
    function run() external {
        console.log("=== TESTING DETERMINISTIC WALLET CREATION ===");
        console.log("Factory:", FACTORY_ADDRESS);
        
        SimpleBudgetWalletFactory factory = SimpleBudgetWalletFactory(FACTORY_ADDRESS);
        
        // Use a different private key for testing deterministic creation
        uint256 testPrivateKey = 0x9876543210987654321098765432109876543210987654321098765432109876;
        address testUser = vm.addr(testPrivateKey);
        
        console.log("Test user:", testUser);
        console.log("Test user balance:", testUser.balance);
        
        // Test salt values
        uint256 salt1 = 12345;
        uint256 salt2 = 67890;
        
        console.log("\n1. Testing deterministic address prediction");
        
        address predictedAddr1 = factory.getWalletAddress(salt1);
        address predictedAddr2 = factory.getWalletAddress(salt2);
        
        console.log("Predicted address for salt", salt1, ":", predictedAddr1);
        console.log("Predicted address for salt", salt2, ":", predictedAddr2);
        console.log("Addresses are different:", predictedAddr1 != predictedAddr2);
        
        console.log("\n2. Testing same salt produces same address");
        address predictedAddr1Again = factory.getWalletAddress(salt1);
        console.log("Same salt prediction:", predictedAddr1Again);
        console.log("Addresses match:", predictedAddr1 == predictedAddr1Again);
        
        console.log("\n3. Checking if test user already has wallet");
        console.log("Test user has wallet:", factory.hasWallet(testUser));
        
        if (testUser.balance >= 0.001 ether) {
            console.log("\n4. Creating deterministic wallet");
            vm.startBroadcast(testPrivateKey);
            
            try factory.createWalletDeterministic{value: 0}(salt1) returns (address actualWallet) {
                console.log("SUCCESS: Deterministic wallet created at:", actualWallet);
                console.log("Matches prediction:", actualWallet == predictedAddr1);
                
                // Test the wallet
                SimpleBudgetWallet wallet = SimpleBudgetWallet(payable(actualWallet));
                
                // Try to use the wallet
                wallet.depositETH{value: 0.0001 ether}();
                console.log("Deposited 0.0001 ETH to deterministic wallet");
                
                uint256 unallocated = wallet.getUnallocatedBalance(testUser, address(0));
                console.log("Unallocated balance:", unallocated);
                
            } catch Error(string memory reason) {
                console.log("ERROR: Failed to create deterministic wallet:", reason);
            }
            
            vm.stopBroadcast();
            
            console.log("\n5. Testing duplicate salt prevention");
            vm.startBroadcast(testPrivateKey);
            
            try factory.createWalletDeterministic{value: 0}(salt1) {
                console.log("ERROR: Should not allow duplicate wallet creation");
            } catch Error(string memory reason) {
                console.log("SUCCESS: Correctly prevented duplicate creation:", reason);
            }
            
            vm.stopBroadcast();
            
        } else {
            console.log("SKIP: Test user has insufficient balance");
        }
        
        console.log("\n6. Final factory state");
        console.log("Total wallets created:", factory.totalWalletsCreated());
        console.log("Test user has wallet:", factory.hasWallet(testUser));
        
        if (factory.hasWallet(testUser)) {
            console.log("Test user wallet:", factory.getWallet(testUser));
        }
        
        console.log("\n=== DETERMINISTIC TEST COMPLETE ===");
    }
}