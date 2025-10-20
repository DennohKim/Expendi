// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ExpendiBucketManager.sol";
import "../src/mocks/MockSubscriptionDataManager.sol";
import "../src/mocks/MockSubscriptionPaymentProcessor.sol";
import "../src/mocks/MockUSDC.sol";

contract ExpendiBucketSubscriptionManagerTest2 is Test {
    ExpendiBucketManager public manager;
    MockSubscriptionDataManager public mockDataManager;
    MockSubscriptionPaymentProcessor public mockPaymentProcessor;
    MockUSDC public mockUSDC;
    
    address public admin = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public recipient = address(0x4);
    address public subscriptionManager = address(0x5);
    
    uint256 public constant INITIAL_BALANCE = 10000e6; // 10,000 USDC
    uint256 public currentTime = 1000000; // Start at a fixed time
    
    function setUp() public {
        // Set initial time
        vm.warp(currentTime);
        
        // Deploy mock contracts
        mockDataManager = new MockSubscriptionDataManager();
        mockPaymentProcessor = new MockSubscriptionPaymentProcessor();
        mockUSDC = new MockUSDC();
        
        // Deploy main contract
        vm.startPrank(admin);
        manager = new ExpendiBucketManager(
            address(mockDataManager),
            address(mockPaymentProcessor)
        );
        
        // Grant subscription manager role
        manager.grantRole(manager.SUBSCRIPTION_MANAGER_ROLE(), subscriptionManager);
        
        // Add mock USDC as supported token for testing
        manager.addSupportedToken(address(mockUSDC));
        vm.stopPrank();
        
        // Setup user balances
        mockUSDC.mint(user1, INITIAL_BALANCE);
        mockUSDC.mint(user2, INITIAL_BALANCE);
        
        // Give users some ETH for gas
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        
        // Setup user token balances in contract
        vm.startPrank(user1);
        mockUSDC.approve(address(manager), INITIAL_BALANCE);
        manager.depositTokens(address(mockUSDC), INITIAL_BALANCE);
        vm.stopPrank();
        
        vm.startPrank(user2);
        mockUSDC.approve(address(manager), INITIAL_BALANCE);
        manager.depositTokens(address(mockUSDC), INITIAL_BALANCE);
        vm.stopPrank();
    }
    
    // Helper function to advance time and avoid rate limiting
    function advanceTime(uint256 timeToAdd) internal {
        currentTime += timeToAdd;
        vm.warp(currentTime);
    }

    // ============ BASIC FUNCTIONALITY TESTS ============
    
    function testCreateBucket() public {
        advanceTime(400); // Bypass rate limiting
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        (uint256 balance, uint256 monthlySpent, uint256 monthlyLimit, uint256 lastResetTimestamp, bool active, uint256 subscriptionCount) = 
            manager.getBucketInfo(user1, "entertainment");
        
        assertEq(balance, 0);
        assertEq(monthlySpent, 0);
        assertEq(monthlyLimit, 1000e6);
        assertEq(lastResetTimestamp, currentTime);
        assertTrue(active);
        assertEq(subscriptionCount, 0);
        
        vm.stopPrank();
    }
    
    function testFundBucket() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        uint256 bucketBalance = manager.getBucketBalance(user1, "entertainment", address(mockUSDC));
        assertEq(bucketBalance, 500e6);
        
        uint256 unallocatedBalance = manager.userTokenBalances(user1, address(mockUSDC));
        assertEq(unallocatedBalance, INITIAL_BALANCE - 500e6);
        vm.stopPrank();
    }
    
    function testMakeOneTimePayment() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        uint256 paymentAmount = 100e6;
        
        manager.makeOneTimePayment(
            "entertainment",
            paymentAmount,
            address(mockUSDC),
            recipient,
            "Netflix subscription"
        );
        
        uint256 bucketBalance = manager.getBucketBalance(user1, "entertainment", address(mockUSDC));
        assertEq(bucketBalance, 400e6);
        
        (,uint256 monthlySpent,,,,) = manager.getBucketInfo(user1, "entertainment");
        assertEq(monthlySpent, paymentAmount);
        
        uint256 recipientBalance = mockUSDC.balanceOf(recipient);
        assertEq(recipientBalance, paymentAmount);
        vm.stopPrank();
    }
    
    function testCreateBucketSubscription() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        advanceTime(3700); // Bypass subscription creation cooldown
        
        uint256 subscriptionAmount = 50e6;
        uint256 periodInDays = 30;
        
        uint256 subscriptionId = manager.createBucketSubscription(
            "entertainment",
            subscriptionAmount,
            periodInDays,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true // userConsent
        );
        
        assertEq(subscriptionId, 1);
        
        ExpendiBucketManager.SubscriptionInfo memory subscription = 
            manager.getSubscriptionInfo(user1, subscriptionId);
        
        assertEq(subscription.subscriptionId, subscriptionId);
        assertEq(subscription.bucketName, "entertainment");
        assertEq(subscription.amount, subscriptionAmount);
        assertEq(subscription.periodInDays, periodInDays);
        assertEq(subscription.token, address(mockUSDC));
        assertEq(subscription.recipient, recipient);
        assertTrue(subscription.isActive);
        assertTrue(subscription.userConsent);
        assertEq(subscription.totalCharged, 0);
        assertEq(subscription.chargeCount, 0);
        
        vm.stopPrank();
    }
    
    function testProcessSubscriptionPayment() public {
        advanceTime(400);
        
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        advanceTime(3700); // Bypass subscription creation cooldown
        
        uint256 subscriptionId = manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        vm.stopPrank();
        
        // Fast forward to charge time
        advanceTime(30 days);
        
        // Process payment as subscription manager
        vm.startPrank(subscriptionManager);
        manager.processSubscriptionPayment(user1, subscriptionId);
        vm.stopPrank();
        
        // Verify subscription was charged
        ExpendiBucketManager.SubscriptionInfo memory subscription = 
            manager.getSubscriptionInfo(user1, subscriptionId);
        
        assertEq(subscription.totalCharged, 50e6);
        assertEq(subscription.chargeCount, 1);
        
        // Verify bucket balance was reduced
        uint256 bucketBalance = manager.getBucketBalance(user1, "entertainment", address(mockUSDC));
        assertEq(bucketBalance, 450e6);
        
        // Verify recipient received payment
        uint256 recipientBalance = mockUSDC.balanceOf(recipient);
        assertEq(recipientBalance, 50e6);
    }
    
    function testCancelBucketSubscription() public {
        advanceTime(400);
        
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        advanceTime(3700); // Bypass subscription creation cooldown
        
        uint256 subscriptionId = manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        
        // Cancel subscription
        manager.cancelBucketSubscription(subscriptionId);
        
        // Verify subscription is inactive
        ExpendiBucketManager.SubscriptionInfo memory subscription = 
            manager.getSubscriptionInfo(user1, subscriptionId);
        
        assertFalse(subscription.isActive);
        vm.stopPrank();
    }
    
    function testMonthlyLimitReset() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        // Make a payment to update monthly spent
        manager.makeOneTimePayment(
            "entertainment",
            100e6,
            address(mockUSDC),
            recipient,
            "Payment"
        );
        
        (,uint256 monthlySpentBefore,,,,) = manager.getBucketInfo(user1, "entertainment");
        assertEq(monthlySpentBefore, 100e6);
        
        // Fast forward 30 days
        advanceTime(30 days);
        
        // Reset monthly limit
        manager.resetMonthlyLimit("entertainment");
        
        (,uint256 monthlySpentAfter,,,,) = manager.getBucketInfo(user1, "entertainment");
        assertEq(monthlySpentAfter, 0);
        vm.stopPrank();
    }
    
    function testDeleteEmptyBucket() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        // Delete empty bucket (should succeed)
        manager.deleteBucket("entertainment");
        
        // Verify bucket no longer exists
        vm.expectRevert("Bucket does not exist");
        manager.getBucketInfo(user1, "entertainment");
        vm.stopPrank();
    }

    // ============ ERROR CONDITION TESTS ============
    
    function testCreateBucketFailsWithInvalidName() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        
        vm.expectRevert("Bucket name cannot be empty");
        manager.createBucket("", 1000e6);
        
        advanceTime(400);
        
        vm.expectRevert("Bucket name too short");
        manager.createBucket("ab", 1000e6);
        
        advanceTime(400);
        
        vm.expectRevert("Bucket name too long");
        manager.createBucket("thisnameis waytoolongtobevalidformaxlengthtest", 1000e6);
        vm.stopPrank();
    }
    
    function testCreateBucketFailsWithExcessiveLimit() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        vm.expectRevert("Monthly limit too high");
        manager.createBucket("entertainment", 2000000e6); // Over 1M limit
        vm.stopPrank();
    }
    
    function testCreateBucketFailsWithExistingName() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        advanceTime(400);
        
        vm.expectRevert("Bucket already exists");
        manager.createBucket("entertainment", 2000e6);
        vm.stopPrank();
    }
    
    function testCreateSubscriptionFailsWithoutConsent() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        advanceTime(3700);
        
        vm.expectRevert("User must explicitly consent to recurring payments");
        manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            false // userConsent = false
        );
        vm.stopPrank();
    }
    
    function testCreateSubscriptionFailsWithInvalidAmount() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        advanceTime(3700);
        
        vm.expectRevert("Amount too low");
        manager.createBucketSubscription(
            "entertainment",
            0.5e6, // Below MIN_SUBSCRIPTION_AMOUNT
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        
        advanceTime(3700);
        
        vm.expectRevert("Amount too high");
        manager.createBucketSubscription(
            "entertainment",
            2000000e6, // Above MAX_SUBSCRIPTION_AMOUNT
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        vm.stopPrank();
    }
    
    function testOneTimePaymentFailsWithMonthlyLimitExceeded() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 150e6); // Low monthly limit
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        vm.expectRevert("Monthly limit exceeded");
        manager.makeOneTimePayment(
            "entertainment",
            200e6,
            address(mockUSDC),
            recipient,
            "Exceeds limit"
        );
        vm.stopPrank();
    }
    
    function testProcessSubscriptionPaymentFailsWhenTooEarly() public {
        advanceTime(400);
        
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        advanceTime(3700);
        
        uint256 subscriptionId = manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        vm.stopPrank();
        
        // Try to process immediately (should fail)
        vm.startPrank(subscriptionManager);
        vm.expectRevert("Too early to charge");
        manager.processSubscriptionPayment(user1, subscriptionId);
        vm.stopPrank();
    }
    
    function testDeleteBucketWithFundsFails() public {
        advanceTime(400);
        
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 100e6, address(mockUSDC));
        
        vm.expectRevert("Cannot delete bucket with token funds");
        manager.deleteBucket("entertainment");
        vm.stopPrank();
    }

    // ============ ACCESS CONTROL TESTS ============
    
    function testOnlySubscriptionManagerCanProcessPayments() public {
        advanceTime(400);
        
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        advanceTime(3700);
        
        uint256 subscriptionId = manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        vm.stopPrank();
        
        // Fast forward to charge time
        advanceTime(30 days);
        
        // Non-subscription manager should not be able to process
        vm.startPrank(user2);
        vm.expectRevert();
        manager.processSubscriptionPayment(user1, subscriptionId);
        vm.stopPrank();
    }
    
    function testEmergencyPauseUser() public {
        vm.startPrank(admin);
        manager.emergencyPauseUser(user1, true);
        
        assertTrue(manager.emergencyPausedUsers(user1));
        vm.stopPrank();
        
        advanceTime(400);
        
        // User should not be able to create buckets when paused
        vm.startPrank(user1);
        vm.expectRevert("User is emergency paused");
        manager.createBucket("entertainment", 1000e6);
        vm.stopPrank();
    }

    // ============ INTEGRATION TESTS ============
    
    function testFullSubscriptionLifecycle() public {
        advanceTime(400);
        
        // Create bucket and fund it
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        advanceTime(3700);
        
        // Create subscription
        uint256 subscriptionId = manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        vm.stopPrank();
        
        // Process multiple payments
        for (uint256 i = 0; i < 3; i++) {
            advanceTime(30 days);
            
            vm.startPrank(subscriptionManager);
            manager.processSubscriptionPayment(user1, subscriptionId);
            vm.stopPrank();
        }
        
        // Verify final state
        ExpendiBucketManager.SubscriptionInfo memory subscription = 
            manager.getSubscriptionInfo(user1, subscriptionId);
        
        assertEq(subscription.totalCharged, 150e6);
        assertEq(subscription.chargeCount, 3);
        
        uint256 bucketBalance = manager.getBucketBalance(user1, "entertainment", address(mockUSDC));
        assertEq(bucketBalance, 350e6);
        
        uint256 recipientBalance = mockUSDC.balanceOf(recipient);
        assertEq(recipientBalance, 150e6);
        
        // Cancel subscription
        vm.startPrank(user1);
        manager.cancelBucketSubscription(subscriptionId);
        vm.stopPrank();
        
        subscription = manager.getSubscriptionInfo(user1, subscriptionId);
        assertFalse(subscription.isActive);
    }
    
    function testMonthlyLimitResetForMonthlySubscription() public {
        advanceTime(400);
        
        // Setup monthly subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        // Make a payment to update monthly spent
        manager.makeOneTimePayment(
            "entertainment",
            100e6,
            address(mockUSDC),
            recipient,
            "Payment"
        );
        
        advanceTime(3700);
        
        uint256 subscriptionId = manager.createBucketSubscription(
            "entertainment",
            50e6,
            30, // Monthly subscription
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        vm.stopPrank();
        
        (,uint256 monthlySpentBefore,,,,) = manager.getBucketInfo(user1, "entertainment");
        assertEq(monthlySpentBefore, 100e6);
        
        // Fast forward 30 days
        advanceTime(30 days);
        
        // Process subscription payment (should reset monthly limit first)
        vm.startPrank(subscriptionManager);
        manager.processSubscriptionPayment(user1, subscriptionId);
        vm.stopPrank();
        
        // Monthly spent should be reset to 0, then subscription amount added
        (,uint256 monthlySpentAfter,,,,) = manager.getBucketInfo(user1, "entertainment");
        assertEq(monthlySpentAfter, 50e6);
    }
}