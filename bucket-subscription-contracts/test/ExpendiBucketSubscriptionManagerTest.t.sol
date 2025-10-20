// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ExpendiBucketManager.sol";
import "../src/mocks/MockSubscriptionDataManager.sol";
import "../src/mocks/MockSubscriptionPaymentProcessor.sol";
import "../src/mocks/MockUSDC.sol";

contract ExpendiBucketManagerTest is Test {
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
    
    event BucketCreated(
        address indexed user,
        string indexed bucketName,
        uint256 monthlyLimit,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketFunded(
        address indexed user,
        string indexed bucketName,
        uint256 amount,
        address indexed token,
        uint256 newBalance,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event OneTimePaymentMade(
        address indexed user,
        string indexed bucketName,
        uint256 amount,
        address indexed token,
        address recipient,
        string description,
        uint256 newBucketBalance,
        uint256 monthlySpent,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketSubscriptionCreated(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 amount,
        uint256 periodInDays,
        address recipient,
        address token,
        uint256 nextChargeTimestamp,
        bool userConsent,
        string metadata,
        uint256 timestamp,
        uint256 blockNumber
    );

    function setUp() public {
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

    // ============ BUCKET CREATION TESTS ============
    
    function testCreateBucket() public {
        vm.startPrank(user1);
        
        vm.expectEmit(true, true, false, true);
        emit BucketCreated(user1, "entertainment", 1000e6, block.timestamp, block.number);
        
        manager.createBucket("entertainment", 1000e6);
        
        (uint256 balance, uint256 monthlySpent, uint256 monthlyLimit, uint256 lastResetTimestamp, bool active, uint256 subscriptionCount) = 
            manager.getBucketInfo(user1, "entertainment");
        
        assertEq(balance, 0);
        assertEq(monthlySpent, 0);
        assertEq(monthlyLimit, 1000e6);
        assertEq(lastResetTimestamp, block.timestamp);
        assertTrue(active);
        assertEq(subscriptionCount, 0);
        
        vm.stopPrank();
    }
    
    function testCreateBucketFailsWithExistingName() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        vm.expectRevert("Bucket already exists");
        manager.createBucket("entertainment", 2000e6);
        vm.stopPrank();
    }
    
    function testCreateBucketFailsWithInvalidName() public {
        vm.startPrank(user1);
        
        vm.expectRevert("Bucket name cannot be empty");
        manager.createBucket("", 1000e6);
        
        vm.expectRevert("Bucket name too short");
        manager.createBucket("ab", 1000e6);
        
        vm.expectRevert("Bucket name too long");
        manager.createBucket("thisnameis waytoolongtobevalid", 1000e6);
        vm.stopPrank();
    }
    
    function testCreateBucketFailsWithExcessiveLimit() public {
        vm.startPrank(user1);
        vm.expectRevert("Monthly limit too high");
        manager.createBucket("entertainment", 2000000e6); // Over 1M limit
        vm.stopPrank();
    }

    // ============ BUCKET FUNDING TESTS ============
    
    function testFundBucket() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        vm.expectEmit(true, true, true, true);
        emit BucketFunded(user1, "entertainment", 500e6, address(mockUSDC), 500e6, block.timestamp, block.number);
        
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        uint256 bucketBalance = manager.getBucketBalance(user1, "entertainment", address(mockUSDC));
        assertEq(bucketBalance, 500e6);
        
        uint256 unallocatedBalance = manager.userTokenBalances(user1, address(mockUSDC));
        assertEq(unallocatedBalance, INITIAL_BALANCE - 500e6);
        vm.stopPrank();
    }
    
    function testFundBucketFailsWithInsufficientBalance() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        vm.expectRevert("Insufficient unallocated balance");
        manager.fundBucket("entertainment", INITIAL_BALANCE + 1, address(mockUSDC));
        vm.stopPrank();
    }
    
    function testFundNonexistentBucket() public {
        vm.startPrank(user1);
        vm.expectRevert("Bucket does not exist");
        manager.fundBucket("nonexistent", 500e6, address(mockUSDC));
        vm.stopPrank();
    }

    // ============ ONE-TIME PAYMENT TESTS ============
    
    function testMakeOneTimePayment() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        uint256 paymentAmount = 100e6;
        
        vm.expectEmit(true, true, true, true);
        emit OneTimePaymentMade(
            user1,
            "entertainment",
            paymentAmount,
            address(mockUSDC),
            recipient,
            "Netflix subscription",
            400e6, // newBucketBalance
            paymentAmount, // monthlySpent
            block.timestamp,
            block.number
        );
        
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
    
    function testOneTimePaymentFailsWithInsufficientBalance() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 100e6, address(mockUSDC));
        
        vm.expectRevert("Insufficient bucket balance");
        manager.makeOneTimePayment(
            "entertainment",
            200e6,
            address(mockUSDC),
            recipient,
            "Large payment"
        );
        vm.stopPrank();
    }
    
    function testOneTimePaymentFailsWithMonthlyLimitExceeded() public {
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

    // ============ SUBSCRIPTION CREATION TESTS ============
    
    function testCreateBucketSubscription() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        uint256 subscriptionAmount = 50e6;
        uint256 periodInDays = 30;
        
        vm.expectEmit(true, true, true, false);
        emit BucketSubscriptionCreated(
            user1,
            "entertainment",
            1, // subscriptionId from mock
            subscriptionAmount,
            periodInDays,
            recipient,
            address(mockUSDC),
            block.timestamp + (periodInDays * 1 days),
            true, // userConsent
            "Monthly streaming",
            block.timestamp,
            block.number
        );
        
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
    
    function testCreateSubscriptionFailsWithoutConsent() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
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
    
    function testCreateSubscriptionFailsWithInsufficientBalance() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 30e6, address(mockUSDC));
        
        vm.expectRevert("Insufficient bucket balance");
        manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        vm.stopPrank();
    }
    
    function testCreateSubscriptionFailsWithInvalidAmount() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
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

    // ============ SUBSCRIPTION PROCESSING TESTS ============
    
    function testProcessSubscriptionPayment() public {
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
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
        vm.warp(block.timestamp + 30 days);
        
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
    
    function testProcessSubscriptionPaymentFailsWhenTooEarly() public {
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
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
    
    function testProcessSubscriptionPaymentFailsWithInsufficientBalance() public {
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 100e6, address(mockUSDC));
        
        uint256 subscriptionId = manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        
        // Spend most of the bucket balance
        manager.makeOneTimePayment(
            "entertainment",
            60e6,
            address(mockUSDC),
            recipient,
            "Large payment"
        );
        vm.stopPrank();
        
        // Fast forward to charge time
        vm.warp(block.timestamp + 30 days);
        
        // Try to process payment (should fail due to insufficient balance)
        vm.startPrank(subscriptionManager);
        vm.expectRevert("Insufficient bucket balance");
        manager.processSubscriptionPayment(user1, subscriptionId);
        vm.stopPrank();
    }

    // ============ SUBSCRIPTION CANCELLATION TESTS ============
    
    function testCancelBucketSubscription() public {
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
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
    
    function testCancelInactiveSubscriptionFails() public {
        vm.startPrank(user1);
        vm.expectRevert("Subscription not active");
        manager.cancelBucketSubscription(999); // Non-existent subscription
        vm.stopPrank();
    }

    // ============ MONTHLY LIMIT RESET TESTS ============
    
    function testMonthlyLimitReset() public {
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
        vm.warp(block.timestamp + 30 days);
        
        // Reset monthly limit
        manager.resetMonthlyLimit("entertainment");
        
        (,uint256 monthlySpentAfter,,,,) = manager.getBucketInfo(user1, "entertainment");
        assertEq(monthlySpentAfter, 0);
        vm.stopPrank();
    }
    
    function testMonthlyLimitResetForMonthlySubscription() public {
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
        vm.warp(block.timestamp + 30 days);
        
        // Process subscription payment (should reset monthly limit first)
        vm.startPrank(subscriptionManager);
        manager.processSubscriptionPayment(user1, subscriptionId);
        vm.stopPrank();
        
        // Monthly spent should be reset to 0, then subscription amount added
        (,uint256 monthlySpentAfter,,,,) = manager.getBucketInfo(user1, "entertainment");
        assertEq(monthlySpentAfter, 50e6);
    }

    // ============ BUCKET DELETION TESTS ============
    
    function testDeleteEmptyBucket() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        // Delete empty bucket (should succeed)
        manager.deleteBucket("entertainment");
        
        // Verify bucket no longer exists
        vm.expectRevert("Bucket does not exist");
        manager.getBucketInfo(user1, "entertainment");
        vm.stopPrank();
    }
    
    function testDeleteBucketWithFundsFails() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 100e6, address(mockUSDC));
        
        vm.expectRevert("Cannot delete bucket with token funds");
        manager.deleteBucket("entertainment");
        vm.stopPrank();
    }
    
    function testDeleteBucketWithActiveSubscriptionsFails() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        
        vm.expectRevert("Cannot delete bucket with active subscriptions");
        manager.deleteBucket("entertainment");
        vm.stopPrank();
    }

    // ============ EMERGENCY FUNCTIONS TESTS ============
    
    function testEmergencyPauseUser() public {
        vm.startPrank(admin);
        manager.emergencyPauseUser(user1, true);
        
        assertTrue(manager.emergencyPausedUsers(user1));
        vm.stopPrank();
        
        // User should not be able to create buckets when paused
        vm.startPrank(user1);
        vm.expectRevert("User is emergency paused");
        manager.createBucket("entertainment", 1000e6);
        vm.stopPrank();
    }
    
    function testEmergencyPauseUserSubscriptions() public {
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
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
        
        // Emergency pause all subscriptions
        vm.startPrank(admin);
        manager.emergencyPauseUserSubscriptions(user1);
        vm.stopPrank();
        
        // Verify subscription is inactive
        ExpendiBucketManager.SubscriptionInfo memory subscription = 
            manager.getSubscriptionInfo(user1, subscriptionId);
        
        assertFalse(subscription.isActive);
    }

    // ============ ACCESS CONTROL TESTS ============
    
    function testOnlySubscriptionManagerCanProcessPayments() public {
        // Setup subscription
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
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
        vm.warp(block.timestamp + 30 days);
        
        // Non-subscription manager should not be able to process
        vm.startPrank(user2);
        vm.expectRevert();
        manager.processSubscriptionPayment(user1, subscriptionId);
        vm.stopPrank();
    }
    
    function testOnlyEmergencyRoleCanPauseUsers() public {
        vm.startPrank(user1);
        vm.expectRevert();
        manager.emergencyPauseUser(user2, true);
        vm.stopPrank();
    }

    // ============ RATE LIMITING TESTS ============
    
    function testRateLimitingForBucketCreation() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        // Should fail due to rate limiting
        vm.expectRevert("Operation too frequent");
        manager.createBucket("food", 1000e6);
        vm.stopPrank();
    }
    
    function testRateLimitingForSubscriptionCreation() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 1000e6, address(mockUSDC));
        
        manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        
        // Should fail due to subscription creation cooldown
        vm.expectRevert("Subscription creation too frequent");
        manager.createBucketSubscription(
            "entertainment",
            25e6,
            7,
            address(mockUSDC),
            recipient,
            "Weekly payment",
            true
        );
        vm.stopPrank();
    }

    // ============ TOKEN DEPOSIT/WITHDRAWAL TESTS ============
    
    function testDepositTokens() public {
        uint256 depositAmount = 1000e6;
        
        vm.startPrank(user1);
        mockUSDC.mint(user1, depositAmount);
        mockUSDC.approve(address(manager), depositAmount);
        
        uint256 balanceBefore = manager.userTokenBalances(user1, address(mockUSDC));
        
        manager.depositTokens(address(mockUSDC), depositAmount);
        
        uint256 balanceAfter = manager.userTokenBalances(user1, address(mockUSDC));
        assertEq(balanceAfter, balanceBefore + depositAmount);
        vm.stopPrank();
    }
    
    function testWithdrawTokens() public {
        uint256 withdrawAmount = 500e6;
        
        vm.startPrank(user1);
        uint256 balanceBefore = manager.userTokenBalances(user1, address(mockUSDC));
        require(balanceBefore >= withdrawAmount, "Insufficient balance for test");
        
        uint256 userTokenBalanceBefore = mockUSDC.balanceOf(user1);
        
        manager.withdrawTokens(address(mockUSDC), withdrawAmount);
        
        uint256 balanceAfter = manager.userTokenBalances(user1, address(mockUSDC));
        uint256 userTokenBalanceAfter = mockUSDC.balanceOf(user1);
        
        assertEq(balanceAfter, balanceBefore - withdrawAmount);
        assertEq(userTokenBalanceAfter, userTokenBalanceBefore + withdrawAmount);
        vm.stopPrank();
    }
    
    function testWithdrawTokensFailsWithInsufficientBalance() public {
        vm.startPrank(user1);
        uint256 balance = manager.userTokenBalances(user1, address(mockUSDC));
        
        vm.expectRevert("Insufficient balance");
        manager.withdrawTokens(address(mockUSDC), balance + 1);
        vm.stopPrank();
    }

    // ============ VIEW FUNCTION TESTS ============
    
    function testGetBucketBalance() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
        uint256 balance = manager.getBucketBalance(user1, "entertainment", address(mockUSDC));
        assertEq(balance, 500e6);
        vm.stopPrank();
    }
    
    function testGetUserSubscriptions() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 1000e6, address(mockUSDC));
        
        // Wait for rate limiting to pass
        vm.warp(block.timestamp + 1 hours);
        
        uint256 subscriptionId1 = manager.createBucketSubscription(
            "entertainment",
            50e6,
            30,
            address(mockUSDC),
            recipient,
            "Monthly streaming",
            true
        );
        
        // Wait for rate limiting to pass
        vm.warp(block.timestamp + 1 hours);
        
        uint256 subscriptionId2 = manager.createBucketSubscription(
            "entertainment",
            25e6,
            7,
            address(mockUSDC),
            recipient,
            "Weekly payment",
            true
        );
        
        uint256[] memory subscriptions = manager.getUserSubscriptions(user1);
        assertEq(subscriptions.length, 2);
        assertEq(subscriptions[0], subscriptionId1);
        assertEq(subscriptions[1], subscriptionId2);
        vm.stopPrank();
    }
    
    function testCanDeleteBucket() public {
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        
        (bool canDelete, string memory reason) = manager.canDeleteBucket(user1, "entertainment");
        assertTrue(canDelete);
        assertEq(reason, "Bucket can be deleted");
        
        // Fund bucket and check again
        manager.fundBucket("entertainment", 100e6, address(mockUSDC));
        
        (canDelete, reason) = manager.canDeleteBucket(user1, "entertainment");
        assertFalse(canDelete);
        assertEq(reason, "Bucket has token funds");
        vm.stopPrank();
    }

    // ============ INTEGRATION TESTS ============
    
    function testFullSubscriptionLifecycle() public {
        // Create bucket and fund it
        vm.startPrank(user1);
        manager.createBucket("entertainment", 1000e6);
        manager.fundBucket("entertainment", 500e6, address(mockUSDC));
        
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
            vm.warp(block.timestamp + 30 days);
            
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
}