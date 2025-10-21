// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ExpendiBucketManager.sol";
import "../src/automation/ExpendiBucketManagerAutomation.sol";
import "../src/mocks/MockSubscriptionDataManager.sol";
import "../src/mocks/MockSubscriptionPaymentProcessor.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title ChainlinkAutomationIntegrationTest
 * @dev Integration test simulating real Chainlink Automation workflow
 * @notice This test simulates the exact flow that would happen on Chainlink Automation network
 */
contract ChainlinkAutomationIntegrationTest is Test {
    
    ExpendiBucketManager public bucketManager;
    ExpendiBucketManagerAutomation public automation;
    MockUSDC public usdc;
    
    address public deployer = address(0x1);
    address public user = address(0x2);
    address public recipient = address(0x3);
    address public chainlinkRegistry = address(0x4); // Simulates Chainlink Automation Registry
    
    string constant BUCKET_NAME = "monthly-subscriptions";
    uint256 constant SUBSCRIPTION_AMOUNT = 50e6; // 50 USDC
    uint256 constant PERIOD_DAYS = 30;
    uint256 constant INITIAL_BALANCE = 1000e6; // 1000 USDC
    
    event ChainlinkUpkeepPerformed(
        uint256 subscriptionsProcessed,
        uint256 totalGasUsed,
        bool success
    );
    
    function setUp() public {
        // Start with a reasonable timestamp to avoid rate limiting issues
        vm.warp(100000);
        
        vm.startPrank(deployer);
        
        // Deploy contracts (simulating mainnet deployment)
        MockSubscriptionDataManager dataManager = new MockSubscriptionDataManager();
        MockSubscriptionPaymentProcessor paymentProcessor = new MockSubscriptionPaymentProcessor();
        usdc = new MockUSDC();
        
        bucketManager = new ExpendiBucketManager(
            address(dataManager),
            address(paymentProcessor)
        );
        
        automation = new ExpendiBucketManagerAutomation(address(bucketManager));
        
        // Grant roles (simulating deployment setup)
        bucketManager.grantRole(
            keccak256("SUBSCRIPTION_MANAGER_ROLE"),
            address(automation)
        );
        
        automation.grantRole(
            keccak256("AUTOMATION_ROLE"),
            chainlinkRegistry
        );
        
        bucketManager.addSupportedToken(address(usdc));
        
        vm.stopPrank();
        
        // Setup user with funds
        vm.startPrank(user);
        usdc.mint(user, INITIAL_BALANCE);
        usdc.approve(address(bucketManager), INITIAL_BALANCE);
        bucketManager.depositTokens(address(usdc), INITIAL_BALANCE);
        
        // Wait to avoid rate limiting
        vm.warp(block.timestamp + 400);
        bucketManager.createBucket(BUCKET_NAME, INITIAL_BALANCE);
        
        // Wait again before funding
        vm.warp(block.timestamp + 400);
        bucketManager.fundBucket(BUCKET_NAME, INITIAL_BALANCE, address(usdc));
        vm.stopPrank();
    }
    
    /**
     * @dev Test the complete Chainlink Automation flow
     * This simulates exactly what happens on Chainlink network
     */
    function testChainlinkAutomationFlow() public {
        console.log("=== CHAINLINK AUTOMATION INTEGRATION TEST ===");
        
        // Step 1: User creates subscription through frontend
        console.log("Step 1: User creates subscription...");
        
        // Wait to avoid subscription creation cooldown
        vm.warp(block.timestamp + 3601); // Wait 1+ hour
        
        vm.prank(user);
        uint256 subscriptionId = bucketManager.createBucketSubscription(
            BUCKET_NAME,
            SUBSCRIPTION_AMOUNT,
            PERIOD_DAYS,
            address(usdc),
            recipient,
            "Netflix Subscription",
            true // userConsent
        );
        console.log("SUCCESS: Subscription created with ID:", subscriptionId);
        
        // Step 2: Admin tracks subscription in automation (this would be automated)
        console.log("Step 2: Tracking subscription in automation...");
        vm.prank(deployer);
        automation.trackUserSubscription(user, subscriptionId);
        console.log("SUCCESS: Subscription tracked in automation");
        
        // Step 3: Verify initial state
        console.log("Step 3: Verifying initial state...");
        assertTrue(!automation.isSubscriptionDue(user, subscriptionId));
        console.log("SUCCESS: Subscription correctly shows as not due initially");
        
        // Step 4: Simulate time passing (30 days)
        console.log("Step 4: Fast forwarding 30 days...");
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        console.log("SUCCESS: Time advanced to payment due date");
        
        // Step 5: Chainlink calls checkUpkeep (this happens automatically on Chainlink)
        console.log("Step 5: Chainlink checking if upkeep is needed...");
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        
        assertTrue(upkeepNeeded);
        console.log("SUCCESS: Chainlink determined upkeep is needed");
        console.log("   Perform data length:", performData.length);
        
        // Decode what Chainlink found
        (address[] memory dueUsers, uint256[] memory dueSubscriptionIds) = abi.decode(
            performData,
            (address[], uint256[])
        );
        
        console.log("   Due subscriptions found:", dueUsers.length);
        assertEq(dueUsers.length, 1);
        assertEq(dueUsers[0], user);
        assertEq(dueSubscriptionIds[0], subscriptionId);
        
        // Step 6: Record balances before payment
        uint256 userBalanceBefore = bucketManager.getBucketBalance(user, BUCKET_NAME, address(usdc));
        uint256 recipientBalanceBefore = usdc.balanceOf(recipient);
        
        console.log("Step 6: Recording balances before payment...");
        console.log("   User bucket balance:", userBalanceBefore / 1e6, "USDC");
        console.log("   Recipient balance:", recipientBalanceBefore / 1e6, "USDC");
        
        // Step 7: Chainlink calls performUpkeep (this is the actual payment)
        console.log("Step 7: Chainlink executing payment...");
        
        uint256 gasStart = gasleft();
        
        vm.prank(chainlinkRegistry);
        automation.performUpkeep(performData);
        
        uint256 gasUsed = gasStart - gasleft();
        console.log("SUCCESS: Payment executed successfully");
        console.log("   Gas used:", gasUsed);
        
        // Step 8: Verify payment was processed
        console.log("Step 8: Verifying payment results...");
        
        uint256 userBalanceAfter = bucketManager.getBucketBalance(user, BUCKET_NAME, address(usdc));
        uint256 recipientBalanceAfter = usdc.balanceOf(recipient);
        
        assertEq(userBalanceAfter, userBalanceBefore - SUBSCRIPTION_AMOUNT);
        assertEq(recipientBalanceAfter, recipientBalanceBefore + SUBSCRIPTION_AMOUNT);
        
        console.log("   User bucket balance after:", userBalanceAfter / 1e6, "USDC");
        console.log("   Recipient balance after:", recipientBalanceAfter / 1e6, "USDC");
        console.log("   Payment amount:", SUBSCRIPTION_AMOUNT / 1e6, "USDC");
        console.log("SUCCESS: Payment amounts verified correctly");
        
        // Step 9: Verify automation stats
        console.log("Step 9: Checking automation statistics...");
        (
            uint256 totalPaymentsProcessed,
            uint256 totalFailedPayments,
            uint256 totalGasUsed,
            uint256 upkeepCount,
            uint256 trackedUsersCount,
            uint256 lastUpkeepTimestamp
        ) = automation.getAutomationStats();
        
        assertEq(totalPaymentsProcessed, 1);
        assertEq(totalFailedPayments, 0);
        assertEq(upkeepCount, 1);
        assertEq(trackedUsersCount, 1);
        assertEq(lastUpkeepTimestamp, block.timestamp);
        
        console.log("   Total payments processed:", totalPaymentsProcessed);
        console.log("   Total failed payments:", totalFailedPayments);
        console.log("   Total gas used:", totalGasUsed);
        console.log("   Upkeep count:", upkeepCount);
        console.log("SUCCESS: Automation stats verified");
        
        // Step 10: Verify next payment is scheduled
        console.log("Step 10: Verifying next payment schedule...");
        ExpendiBucketManager.SubscriptionInfo memory subInfo = bucketManager.getSubscriptionInfo(user, subscriptionId);
        
        uint256 expectedNextCharge = block.timestamp + PERIOD_DAYS * 1 days;
        // Allow for small timing differences (within 1 day is fine for this test)
        assertTrue(subInfo.nextChargeTimestamp >= expectedNextCharge - 1 days);
        assertTrue(subInfo.nextChargeTimestamp <= expectedNextCharge + 1 days);
        assertEq(subInfo.totalCharged, SUBSCRIPTION_AMOUNT);
        assertEq(subInfo.chargeCount, 1);
        
        console.log("   Next charge scheduled for:", subInfo.nextChargeTimestamp);
        console.log("   Total charged so far:", subInfo.totalCharged / 1e6, "USDC");
        console.log("   Charge count:", subInfo.chargeCount);
        console.log("SUCCESS: Next payment correctly scheduled");
        
        emit ChainlinkUpkeepPerformed(1, gasUsed, true);
        
        console.log("=== CHAINLINK AUTOMATION TEST COMPLETED SUCCESSFULLY ===");
    }
    
    /**
     * @dev Test what happens when payment fails
     */
    function testChainlinkAutomationPaymentFailure() public {
        console.log("=== TESTING PAYMENT FAILURE SCENARIO ===");
        
        // Create subscription
        vm.prank(user);
        uint256 subscriptionId = bucketManager.createBucketSubscription(
            BUCKET_NAME,
            SUBSCRIPTION_AMOUNT,
            PERIOD_DAYS,
            address(usdc),
            recipient,
            "Test Subscription",
            true
        );
        
        // Track subscription
        vm.prank(deployer);
        automation.trackUserSubscription(user, subscriptionId);
        
        // Drain user's bucket (simulate insufficient funds)
        vm.prank(user);
        uint256 bucketBalance = bucketManager.getBucketBalance(user, BUCKET_NAME, address(usdc));
        bucketManager.fundBucket(BUCKET_NAME, 0, address(usdc)); // This won't work, let's withdraw instead
        
        // Actually withdraw the funds
        vm.prank(user);
        bucketManager.withdrawTokens(address(usdc), bucketBalance);
        
        console.log("Drained user bucket balance");
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        // Chainlink checks upkeep
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        
        // Upkeep should still be needed (Chainlink doesn't pre-validate balances)
        assertTrue(upkeepNeeded);
        console.log("Chainlink still detects upkeep needed (balance check happens in performUpkeep)");
        
        // Chainlink tries to execute payment
        vm.prank(chainlinkRegistry);
        automation.performUpkeep(performData); // This should fail gracefully
        
        // Verify failure was recorded
        (
            uint256 totalPaymentsProcessed,
            uint256 totalFailedPayments,
            ,,,
        ) = automation.getAutomationStats();
        
        assertEq(totalPaymentsProcessed, 0);
        assertEq(totalFailedPayments, 1);
        
        console.log("SUCCESS: Payment failure handled gracefully");
        console.log("   Failed payments recorded:", totalFailedPayments);
        
        console.log("=== PAYMENT FAILURE TEST COMPLETED ===");
    }
    
    /**
     * @dev Test multiple subscriptions processing in batch
     */
    function testChainlinkAutomationBatchProcessing() public {
        console.log("=== TESTING BATCH PROCESSING ===");
        
        // Create multiple users with subscriptions
        address[] memory users = new address[](3);
        uint256[] memory subscriptionIds = new uint256[](3);
        
        for (uint256 i = 0; i < 3; i++) {
            users[i] = address(uint160(100 + i));
            
            // Setup user
            vm.startPrank(users[i]);
            usdc.mint(users[i], INITIAL_BALANCE);
            usdc.approve(address(bucketManager), INITIAL_BALANCE);
            bucketManager.depositTokens(address(usdc), INITIAL_BALANCE);
            bucketManager.createBucket(BUCKET_NAME, INITIAL_BALANCE);
            bucketManager.fundBucket(BUCKET_NAME, INITIAL_BALANCE, address(usdc));
            
            // Create subscription
            subscriptionIds[i] = bucketManager.createBucketSubscription(
                BUCKET_NAME,
                SUBSCRIPTION_AMOUNT,
                PERIOD_DAYS,
                address(usdc),
                recipient,
                string.concat("Subscription ", vm.toString(i)),
                true
            );
            vm.stopPrank();
            
            // Track subscription
            vm.prank(deployer);
            automation.trackUserSubscription(users[i], subscriptionIds[i]);
            
            console.log("Created subscription", i, "for user", users[i]);
        }
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        // Check upkeep
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        assertTrue(upkeepNeeded);
        
        (address[] memory dueUsers, uint256[] memory dueSubscriptionIds) = abi.decode(
            performData,
            (address[], uint256[])
        );
        
        assertEq(dueUsers.length, 3);
        console.log("Chainlink found", dueUsers.length, "due subscriptions");
        
        // Record initial recipient balance
        uint256 initialRecipientBalance = usdc.balanceOf(recipient);
        
        // Execute batch payment
        vm.prank(chainlinkRegistry);
        automation.performUpkeep(performData);
        
        // Verify all payments processed
        uint256 finalRecipientBalance = usdc.balanceOf(recipient);
        uint256 expectedTotal = SUBSCRIPTION_AMOUNT * 3;
        
        assertEq(finalRecipientBalance, initialRecipientBalance + expectedTotal);
        console.log("SUCCESS: Batch payment successful");
        console.log("   Recipient received:", (finalRecipientBalance - initialRecipientBalance) / 1e6, "USDC");
        console.log("   Expected:", expectedTotal / 1e6, "USDC");
        
        // Verify automation stats
        (uint256 totalPaymentsProcessed,,,,,) = automation.getAutomationStats();
        assertEq(totalPaymentsProcessed, 3);
        
        console.log("   Total payments processed:", totalPaymentsProcessed);
        console.log("=== BATCH PROCESSING TEST COMPLETED ===");
    }
    
    /**
     * @dev Simulate the exact registration flow for Chainlink Automation
     */
    function testChainlinkRegistrationFlow() public view {
        console.log("=== CHAINLINK REGISTRATION INFORMATION ===");
        console.log("When registering upkeep on https://automation.chain.link/:");
        console.log("");
        console.log("1. Trigger Type: CUSTOM LOGIC");
        console.log("2. Target Contract:", address(automation));
        console.log("3. Admin Address:", deployer);
        console.log("4. Gas Limit: 2,000,000");
        console.log("5. Check Data: 0x (empty)");
        console.log("6. Starting Balance: 5 LINK minimum");
        console.log("");
        console.log("Contract Functions:");
        console.log("- checkUpkeep(bytes): Returns bool upkeepNeeded, bytes performData");
        console.log("- performUpkeep(bytes): Executes subscription payments");
        console.log("");
        console.log("Monitoring Functions:");
        console.log("- getAutomationStats(): Returns performance metrics");
        console.log("- getTrackedUsers(): Returns tracked users array");
        console.log("- manualUpkeep(): Admin function for testing");
        console.log("=== END REGISTRATION INFO ===");
    }
}