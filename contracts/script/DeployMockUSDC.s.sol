// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";

contract DeployMockUSDC is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== DEPLOYING MOCK USDC TO BASE SEPOLIA ===");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC with USDC-like parameters
        console.log("\nDeploying MockUSDC...");
        MockUSDC mockUSDC = new MockUSDC(
            "Mock USD Coin",      // name
            "MUSDC",              // symbol
            1000000 * 10**6,      // initial supply: 1M USDC (6 decimals)
            deployer              // owner
        );
        
        console.log("MockUSDC deployed at:", address(mockUSDC));
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDC Address:", address(mockUSDC));
        console.log("Name:", mockUSDC.name());
        console.log("Symbol:", mockUSDC.symbol());
        console.log("Decimals:", mockUSDC.decimals());
        console.log("Total Supply:", mockUSDC.totalSupply());
        console.log("Owner Balance:", mockUSDC.balanceOf(deployer));
        console.log("Network: Base Sepolia (Chain ID: 84532)");
        
        console.log("\n=== FRONTEND CONFIG ===");
        console.log("Add this to your frontend .env:");
        console.log("NEXT_PUBLIC_MOCK_USDC_ADDRESS=%s", address(mockUSDC));
    }
}