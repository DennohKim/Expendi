// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";

contract TestFactoryWallet is Script {
    address constant FACTORY_ADDRESS = 0x488B7a8c4431F9Ba1b86f44Ccb5b2Bf2825f1031;
    address constant WALLET_ADDRESS = 0x316f0eB615C799e4Bb0BaB7c6026E952f25F3a92;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== TESTING FACTORY WALLET FUNCTIONALITY ===");
        console.log("Factory:", FACTORY_ADDRESS);
        console.log("Wallet:", WALLET_ADDRESS);
        console.log("Deployer:", deployer);
        
        SimpleBudgetWalletFactory factory = SimpleBudgetWalletFactory(FACTORY_ADDRESS);
        SimpleBudgetWallet wallet = SimpleBudgetWallet(payable(WALLET_ADDRESS));
        
        console.log("\n1. Testing wallet creation prevention for existing users");
        try factory.createWallet{value: 0}() {
            console.log("ERROR: Should not allow wallet creation for existing user");
        } catch {
            console.log("SUCCESS: Correctly prevented duplicate wallet creation");
        }
        
        console.log("\n2. Testing spending from bucket");
        // Get bucket details first
        (uint256 balance, uint256 spent, uint256 limit, uint256 timeUntilReset, bool active) = 
            wallet.getBucket(deployer, "groceries");
        console.log("Bucket balance:", balance);
        console.log("Monthly spent:", spent);
        console.log("Monthly limit:", limit);
        console.log("Active:", active);
        
        if (balance > 0) {
            console.log("\n3. Attempting to spend 0.01 ETH from groceries bucket");
            vm.startBroadcast(deployerPrivateKey);
            
            try wallet.spendFromBucket(
                deployer,
                "groceries",
                0.01 ether,
                payable(0x742D35cC6634C0532925a3B8d1c5B5BEB0c23C00), // Random recipient
                address(0), // ETH
                ""
            ) {
                console.log("SUCCESS: Successfully spent from bucket");
                
                // Check updated bucket details
                (uint256 newBalance, uint256 newSpent, , , ) = 
                    wallet.getBucket(deployer, "groceries");
                console.log("New bucket balance:", newBalance);
                console.log("New monthly spent:", newSpent);
            } catch {
                console.log("ERROR: Failed to spend from bucket");
            }
            
            vm.stopBroadcast();
        }
        
        console.log("\n4. Testing factory statistics");
        console.log("Total wallets created:", factory.totalWalletsCreated());
        console.log("Deployer has wallet:", factory.hasWallet(deployer));
        console.log("Factory owner:", factory.owner());
        console.log("Creation fee:", factory.creationFee());
        
        console.log("\n=== FACTORY WALLET TEST COMPLETE ===");
    }
}