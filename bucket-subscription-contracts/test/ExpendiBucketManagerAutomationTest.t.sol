// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ExpendiBucketManager.sol";
import "../src/automation/ExpendiBucketManagerAutomation.sol";
import "../src/automation/AutomationSubscriptionTracker.sol";
import "../src/mocks/MockSubscriptionDataManager.sol";
import "../src/mocks/MockSubscriptionPaymentProcessor.sol";
import "../src/mocks/MockUSDC.sol";

contract ExpendiBucketManagerAutomationTest is Test {
    
    // Contracts
    ExpendiBucketManager public bucketManager;
    ExpendiBucketManagerAutomation public automation;
    AutomationSubscriptionTracker public tracker;
    MockSubscriptionDataManager public dataManager;
    MockSubscriptionPaymentProcessor public paymentProcessor;
    MockUSDC public usdc;
    
    // Test accounts
    address public deployer = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public recipient = address(0x4);
    address public automationRegistry = address(0x5); // Simulates Chainlink registry
    
    // Test constants
    string constant BUCKET_NAME = "test-bucket";
    uint256 constant SUBSCRIPTION_AMOUNT = 100e6; // 100 USDC
    uint256 constant PERIOD_DAYS = 30;
    uint256 constant MONTHLY_LIMIT = 1000e6; // 1000 USDC
    uint256 constant INITIAL_USDC_BALANCE = 10000e6; // 10,000 USDC
    
    // Events for testing
    event AutomationUpkeepPerformed(
        uint256 indexed upkeepId,
        uint256 subscriptionsChecked,
        uint256 paymentsProcessed,
        uint256 gasUsed,
        uint256 timestamp
    );
    
    event SubscriptionPaymentProcessed(
        address indexed user,
        uint256 indexed subscriptionId,
        bool success,
        string reason,
        uint256 gasUsed
    );
    
    function setUp() public {
        // Start with a reasonable timestamp to avoid rate limiting issues
        vm.warp(100000);
        
        vm.startPrank(deployer);
        
        // Deploy mock contracts
        dataManager = new MockSubscriptionDataManager();
        paymentProcessor = new MockSubscriptionPaymentProcessor();
        usdc = new MockUSDC();
        
        // Deploy main contracts
        bucketManager = new ExpendiBucketManager(
            address(dataManager),
            address(paymentProcessor)
        );
        
        automation = new ExpendiBucketManagerAutomation(
            address(bucketManager)
        );
        
        tracker = new AutomationSubscriptionTracker(
            address(bucketManager),
            address(automation)
        );
        
        // Grant automation contract the SUBSCRIPTION_MANAGER_ROLE
        bucketManager.grantRole(
            keccak256("SUBSCRIPTION_MANAGER_ROLE"),
            address(automation)
        );
        
        // Grant automation role to registry (simulating Chainlink)
        automation.grantRole(
            keccak256("AUTOMATION_ROLE"),
            automationRegistry
        );
        
        // Set up test tokens
        bucketManager.addSupportedToken(address(usdc));
        
        vm.stopPrank();
        
        // Setup users with USDC (with time delays to avoid rate limiting)
        _setupUser(user1);
        
        // Wait before setting up second user
        vm.warp(block.timestamp + 400); // Extra buffer
        _setupUser(user2);
    }
    
    function _setupUser(address user) internal {
        vm.startPrank(deployer);
        
        // Mint USDC to user
        usdc.mint(user, INITIAL_USDC_BALANCE);
        
        vm.stopPrank();
        vm.startPrank(user);
        
        // Approve USDC spending
        usdc.approve(address(bucketManager), INITIAL_USDC_BALANCE);
        
        // Deposit USDC to contract
        bucketManager.depositTokens(address(usdc), INITIAL_USDC_BALANCE);
        
        // Create a bucket
        bucketManager.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        // Wait to avoid rate limiting
        vm.warp(block.timestamp + 400); // Wait extra to be safe
        
        // Fund the bucket
        bucketManager.fundBucket(BUCKET_NAME, INITIAL_USDC_BALANCE / 2, address(usdc));
        
        vm.stopPrank();
    }
    
    function _createSubscription(address user) internal returns (uint256) {
        // Wait to avoid subscription creation cooldown
        vm.warp(block.timestamp + 3601); // Wait 1+ hour
        
        vm.prank(user);
        return bucketManager.createBucketSubscription(
            BUCKET_NAME,
            SUBSCRIPTION_AMOUNT,
            PERIOD_DAYS,
            address(usdc),
            recipient,
            "Test subscription",
            true // userConsent
        );
    }
    
    function _trackSubscription(address user, uint256 subscriptionId) internal {
        vm.prank(deployer);
        automation.trackUserSubscription(user, subscriptionId);
    }
    
    // ============ BASIC AUTOMATION TESTS ============
    
    function testAutomationContractDeployment() public view {
        assertEq(address(automation.bucketManager()), address(bucketManager));
        assertEq(automation.checkInterval(), 300); // 5 minutes
        assertEq(automation.maxBatchSize(), 5);
    }
    
    function testTrackUserSubscription() public {
        uint256 subscriptionId = _createSubscription(user1);
        
        vm.prank(deployer);
        automation.trackUserSubscription(user1, subscriptionId);
        
        uint256[] memory trackedSubs = automation.getTrackedUserSubscriptions(user1);
        assertEq(trackedSubs.length, 1);
        assertEq(trackedSubs[0], subscriptionId);
        
        address[] memory trackedUsers = automation.getTrackedUsers();
        assertEq(trackedUsers.length, 1);
        assertEq(trackedUsers[0], user1);
    }
    
    function testUntrackUserSubscription() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        vm.prank(deployer);
        automation.untrackUserSubscription(user1, subscriptionId);
        
        uint256[] memory trackedSubs = automation.getTrackedUserSubscriptions(user1);
        assertEq(trackedSubs.length, 0);
        
        address[] memory trackedUsers = automation.getTrackedUsers();
        assertEq(trackedUsers.length, 0);
    }
    
    // ============ CHECKUPKEEP TESTS ============
    
    function testCheckUpkeepNoSubscriptions() public view {
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        
        assertFalse(upkeepNeeded);
        assertEq(performData.length, 0);
    }
    
    function testCheckUpkeepSubscriptionNotDue() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        // Subscription is not due yet (just created)
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        
        assertFalse(upkeepNeeded);
        assertEq(performData.length, 0);
    }
    
    function testCheckUpkeepSubscriptionDue() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        // Fast forward time to make subscription due
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        
        assertTrue(upkeepNeeded);
        assertTrue(performData.length > 0);
        
        // Decode performData
        (address[] memory users, uint256[] memory subscriptionIds) = abi.decode(
            performData,
            (address[], uint256[])
        );
        
        assertEq(users.length, 1);
        assertEq(users[0], user1);
        assertEq(subscriptionIds[0], subscriptionId);
    }
    
    function testCheckUpkeepMultipleSubscriptionsDue() public {
        uint256 subscriptionId1 = _createSubscription(user1);
        uint256 subscriptionId2 = _createSubscription(user2);
        
        _trackSubscription(user1, subscriptionId1);
        _trackSubscription(user2, subscriptionId2);
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        
        assertTrue(upkeepNeeded);
        
        (address[] memory users, uint256[] memory subscriptionIds) = abi.decode(
            performData,
            (address[], uint256[])
        );
        
        assertEq(users.length, 2);
    }
    
    function testCheckUpkeepRespectsBatchLimit() public {
        // Create more subscriptions than batch limit
        uint256[] memory subscriptionIds = new uint256[](10);
        
        for (uint256 i = 0; i < 10; i++) {
            address user = address(uint160(100 + i)); // Create unique users
            _setupUser(user);
            subscriptionIds[i] = _createSubscription(user);
            _trackSubscription(user, subscriptionIds[i]);
        }
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        
        assertTrue(upkeepNeeded);
        
        (address[] memory users,) = abi.decode(
            performData,
            (address[], uint256[])
        );
        
        // Should be limited to maxBatchSize (5)
        assertEq(users.length, 5);
    }
    
    // ============ PERFORMUPKEEP TESTS ============
    
    function testPerformUpkeepSuccessfulPayment() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        // Get upkeep data
        (, bytes memory performData) = automation.checkUpkeep("");
        
        // Record initial balances
        uint256 initialRecipientBalance = usdc.balanceOf(recipient);
        uint256 initialBucketBalance = bucketManager.getBucketBalance(user1, BUCKET_NAME, address(usdc));
        
        // Expect events
        vm.expectEmit(true, true, false, true);
        emit SubscriptionPaymentProcessed(user1, subscriptionId, true, "Payment successful", 0);
        
        vm.expectEmit(false, false, false, true);
        emit AutomationUpkeepPerformed(1, 1, 1, 0, block.timestamp);
        
        // Perform upkeep
        vm.prank(automationRegistry);
        automation.performUpkeep(performData);
        
        // Verify payment was processed
        assertEq(usdc.balanceOf(recipient), initialRecipientBalance + SUBSCRIPTION_AMOUNT);
        assertEq(
            bucketManager.getBucketBalance(user1, BUCKET_NAME, address(usdc)),
            initialBucketBalance - SUBSCRIPTION_AMOUNT
        );
        
        // Verify automation stats
        (
            uint256 totalPaymentsProcessed,
            uint256 totalFailedPayments,
            ,
            uint256 upkeepCount,
            ,
        ) = automation.getAutomationStats();
        
        assertEq(totalPaymentsProcessed, 1);
        assertEq(totalFailedPayments, 0);
        assertEq(upkeepCount, 1);
    }
    
    function testPerformUpkeepInsufficientBalance() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        // Drain bucket balance
        vm.prank(user1);
        bucketManager.withdrawTokens(address(usdc), bucketManager.getBucketBalance(user1, BUCKET_NAME, address(usdc)));
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        (, bytes memory performData) = automation.checkUpkeep("");
        
        // Expect failed payment event
        vm.expectEmit(true, true, false, false);
        emit SubscriptionPaymentProcessed(user1, subscriptionId, false, "", 0);
        
        vm.prank(automationRegistry);
        automation.performUpkeep(performData);
        
        // Verify stats show failed payment
        (
            uint256 totalPaymentsProcessed,
            uint256 totalFailedPayments,
            ,,,
        ) = automation.getAutomationStats();
        
        assertEq(totalPaymentsProcessed, 0);
        assertEq(totalFailedPayments, 1);
    }
    
    function testPerformUpkeepBatchProcessing() public {
        uint256 subscriptionId1 = _createSubscription(user1);
        uint256 subscriptionId2 = _createSubscription(user2);
        
        _trackSubscription(user1, subscriptionId1);
        _trackSubscription(user2, subscriptionId2);
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        (, bytes memory performData) = automation.checkUpkeep("");
        
        // Record initial recipient balance
        uint256 initialRecipientBalance = usdc.balanceOf(recipient);
        
        vm.prank(automationRegistry);
        automation.performUpkeep(performData);
        
        // Verify both payments were processed
        assertEq(usdc.balanceOf(recipient), initialRecipientBalance + (SUBSCRIPTION_AMOUNT * 2));
        
        (uint256 totalPaymentsProcessed,,,,,) = automation.getAutomationStats();
        assertEq(totalPaymentsProcessed, 2);
    }
    
    // ============ EMERGENCY CONTROLS TESTS ============
    
    function testEmergencyPauseUser() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        // Pause user
        vm.prank(deployer);
        automation.emergencyPauseUser(user1, true);
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        // Should not find any due subscriptions
        (bool upkeepNeeded,) = automation.checkUpkeep("");
        assertFalse(upkeepNeeded);
    }
    
    function testEmergencyPauseSubscription() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        // Pause subscription
        vm.prank(deployer);
        automation.emergencyPauseSubscription(subscriptionId, true);
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        // Should not find any due subscriptions
        (bool upkeepNeeded,) = automation.checkUpkeep("");
        assertFalse(upkeepNeeded);
    }
    
    function testPauseEntireAutomation() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        // Pause automation
        vm.prank(deployer);
        automation.pauseAutomation();
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        (, bytes memory performData) = automation.checkUpkeep("");
        
        // Should revert when trying to perform upkeep
        vm.expectRevert("Pausable: paused");
        vm.prank(automationRegistry);
        automation.performUpkeep(performData);
    }
    
    // ============ ADMIN FUNCTION TESTS ============
    
    function testUpdateAutomationConfig() public {
        vm.prank(deployer);
        automation.updateAutomationConfig(600, 10); // 10 minutes, batch size 10
        
        assertEq(automation.checkInterval(), 600);
        assertEq(automation.maxBatchSize(), 10);
    }
    
    function testUpdateAutomationConfigInvalidValues() public {
        // Invalid check interval (too short)
        vm.expectRevert("Invalid check interval");
        vm.prank(deployer);
        automation.updateAutomationConfig(30, 5);
        
        // Invalid batch size (too large)
        vm.expectRevert("Invalid batch size");
        vm.prank(deployer);
        automation.updateAutomationConfig(300, 20);
    }
    
    function testManualUpkeep() public {
        uint256 subscriptionId = _createSubscription(user1);
        _trackSubscription(user1, subscriptionId);
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        uint256 initialRecipientBalance = usdc.balanceOf(recipient);
        
        // Trigger manual upkeep
        vm.prank(deployer);
        automation.manualUpkeep();
        
        // Verify payment was processed
        assertEq(usdc.balanceOf(recipient), initialRecipientBalance + SUBSCRIPTION_AMOUNT);
    }
    
    // ============ SUBSCRIPTION TRACKING TESTS ============
    
    function testIsSubscriptionDue() public {
        uint256 subscriptionId = _createSubscription(user1);
        
        // Should not be due initially
        assertFalse(automation.isSubscriptionDue(user1, subscriptionId));
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        // Should be due now
        assertTrue(automation.isSubscriptionDue(user1, subscriptionId));
    }
    
    function testGetAutomationStats() public {
        (
            uint256 totalPaymentsProcessed,
            uint256 totalFailedPayments,
            uint256 totalGasUsed,
            uint256 upkeepCount,
            uint256 trackedUsersCount,
            uint256 lastUpkeepTimestamp
        ) = automation.getAutomationStats();
        
        assertEq(totalPaymentsProcessed, 0);
        assertEq(totalFailedPayments, 0);
        assertEq(totalGasUsed, 0);
        assertEq(upkeepCount, 0);
        assertEq(trackedUsersCount, 0);
        assertEq(lastUpkeepTimestamp, block.timestamp); // Set in constructor
    }
    
    // ============ ACCESS CONTROL TESTS ============
    
    function testUnauthorizedTrackSubscription() public {
        uint256 subscriptionId = _createSubscription(user1);
        
        vm.expectRevert();
        vm.prank(user1); // Not admin
        automation.trackUserSubscription(user1, subscriptionId);
    }
    
    function testUnauthorizedPerformUpkeep() public {
        vm.expectRevert("Unauthorized automation caller");
        vm.prank(user1); // Not automation registry
        automation.performUpkeep("");
    }
    
    function testUnauthorizedConfigUpdate() public {
        vm.expectRevert();
        vm.prank(user1); // Not admin
        automation.updateAutomationConfig(600, 10);
    }
    
    // ============ INTEGRATION TESTS ============
    
    function testFullSubscriptionLifecycle() public {
        // Create subscription
        uint256 subscriptionId = _createSubscription(user1);
        
        // Track in automation
        _trackSubscription(user1, subscriptionId);
        
        // Verify tracking
        assertTrue(automation.isSubscriptionDue(user1, subscriptionId) == false);
        
        // Fast forward to payment time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        // Verify due
        assertTrue(automation.isSubscriptionDue(user1, subscriptionId));
        
        // Check upkeep finds it
        (bool upkeepNeeded, bytes memory performData) = automation.checkUpkeep("");
        assertTrue(upkeepNeeded);
        
        // Process payment
        vm.prank(automationRegistry);
        automation.performUpkeep(performData);
        
        // Verify payment processed
        (uint256 totalPaymentsProcessed,,,,,) = automation.getAutomationStats();
        assertEq(totalPaymentsProcessed, 1);
        
        // Verify next payment time updated
        ExpendiBucketManager.SubscriptionInfo memory subInfo = bucketManager.getSubscriptionInfo(user1, subscriptionId);
        assertEq(subInfo.nextChargeTimestamp, block.timestamp + PERIOD_DAYS * 1 days);
        
        // Cancel subscription
        vm.prank(user1);
        bucketManager.cancelBucketSubscription(subscriptionId);
        
        // Untrack from automation
        vm.prank(deployer);
        automation.untrackUserSubscription(user1, subscriptionId);
        
        // Verify no longer tracked
        uint256[] memory trackedSubs = automation.getTrackedUserSubscriptions(user1);
        assertEq(trackedSubs.length, 0);
    }
    
    // ============ GAS OPTIMIZATION TESTS ============
    
    function testGasLimitPreventsOutOfGas() public {
        // Create many subscriptions (more than gas allows)
        for (uint256 i = 0; i < 20; i++) {
            address user = address(uint160(200 + i));
            _setupUser(user);
            uint256 subscriptionId = _createSubscription(user);
            _trackSubscription(user, subscriptionId);
        }
        
        // Fast forward time
        vm.warp(block.timestamp + PERIOD_DAYS * 1 days + 1);
        
        // Should still respect batch limits
        (, bytes memory performData) = automation.checkUpkeep("");
        
        (address[] memory users,) = abi.decode(performData, (address[], uint256[]));
        assertLe(users.length, automation.maxBatchSize());
    }
}