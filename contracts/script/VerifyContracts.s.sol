// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";

contract VerifyContracts is Script {
    function run() external {
        // Read deployment addresses
        string memory deploymentFile = string.concat("./deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(deploymentFile);
        
        address budgetWallet = vm.parseJsonAddress(json, ".budgetWallet");
        address factory = vm.parseJsonAddress(json, ".factory");
        
        console.log("=== VERIFYING CONTRACTS ===");
        console.log("Network:", block.chainid);
        console.log("BudgetWallet:", budgetWallet);
        console.log("Factory:", factory);
        
        // Verification commands (you'll run these manually)
        console.log("\nRun these commands to verify:");
        console.log("forge verify-contract %s SimpleBudgetWallet --chain-id %s", budgetWallet, vm.toString(block.chainid));
        console.log("forge verify-contract %s SimpleBudgetWalletFactory --chain-id %s --constructor-args $(cast abi-encode 'constructor(uint256)' 0)", factory, vm.toString(block.chainid));
    }
}
