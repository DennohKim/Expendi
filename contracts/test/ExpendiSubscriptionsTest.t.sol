// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/ExpendiSubscriptions.sol";
import "../src/MockUSDC.sol";

contract ExpendiSubscriptionsTest is Test {
    ExpendiSubscriptions public subscriptions;
    MockUSDC public usdc;
    
    address public owner = address(this);
    address public feeRecipient = makeAddr("feeRecipient");
    address public payer = makeAddr("payer");
    address public recipient = makeAddr("recipient");
    address public spender = makeAddr("spender");
    
    uint256 constant INITIAL_USDC_SUPPLY = 1000000 * 1e6; // 1M USDC
    uint256 constant TEST_AMOUNT = 100 * 1e6; // 100 USDC
    uint256 constant TEST_PERIOD = 30; // 30 days

    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        uint256 periodInDays,
        uint256 nextChargeTimestamp
    );

    function setUp() public {
        // Deploy MockUSDC
        usdc = new MockUSDC();
        
        // Deploy subscription contract
        subscriptions = new ExpendiSubscriptions(address(usdc), feeRecipient);
        
        
        // Mint USDC to test accounts
        usdc.mint(payer, INITIAL_USDC_SUPPLY);
        usdc.mint(address(this), INITIAL_USDC_SUPPLY);
        
        // Approve subscription contract to spend USDC
        vm.prank(payer);
        usdc.approve(address(subscriptions), type(uint256).max);
    }

    function testPermissionGranting() public {
        uint256 allowedAmount = 1000 * 1e6; // 1000 USDC
        uint256 periodInSeconds = 30 days;
        uint256 expiryTimestamp = block.timestamp + 365 days;

        vm.prank(payer);
        subscriptions.grantPermission(
            spender,
            address(usdc),
            allowedAmount,
            periodInSeconds,
            expiryTimestamp
        );

        // Permission memory permission = subscriptions.getPermission(payer, spender);
        
        assertEq(permission.token, address(usdc));
        assertEq(permission.allowedAmount, allowedAmount);
        assertEq(permission.periodInSeconds, periodInSeconds);
        assertEq(permission.expiryTimestamp, expiryTimestamp);
        assertTrue(permission.isActive);
    }

    function testSubscriptionCreation() public {
        // First grant permission
        uint256 allowedAmount = 1000 * 1e6;
        uint256 periodInSeconds = 30 days;
        uint256 expiryTimestamp = block.timestamp + 365 days;

        vm.prank(payer);
        subscriptions.grantPermission(
            spender,
            address(usdc),
            allowedAmount,
            periodInSeconds,
            expiryTimestamp
        );

        // Create subscription
        uint256 nextChargeTimestamp = block.timestamp + 1 days;
        string memory metadata = '{"name":"Test Subscription","description":"Test"}';

        vm.expectEmit(true, true, true, false);
        emit SubscriptionCreated(
            bytes32(0), // Will be generated
            payer,
            recipient,
            TEST_AMOUNT,
            TEST_PERIOD,
            nextChargeTimestamp
        );

        vm.prank(spender);
        bytes32 subscriptionId = subscriptions.createSubscription(
            payer,
            recipient,
            TEST_AMOUNT,
            TEST_PERIOD,
            nextChargeTimestamp,
            metadata
        );

        // Verify subscription
        IExpendiSubscriptions.Subscription memory sub = subscriptions.getSubscription(subscriptionId);
        
        assertEq(sub.payer, payer);
        assertEq(sub.recipient, recipient);
        assertEq(sub.amount, TEST_AMOUNT);
        assertEq(sub.periodInDays, TEST_PERIOD);
        assertEq(sub.nextChargeTimestamp, nextChargeTimestamp);
        assertTrue(sub.isActive);
        assertFalse(sub.isPaused);
        assertEq(sub.metadata, metadata);
    }

    function testSubscriptionCharging() public {
        // Setup subscription
        bytes32 subscriptionId = _createTestSubscription();
        
        // Fast forward to charge time
        vm.warp(block.timestamp + 1 days);
        
        uint256 initialPayerBalance = usdc.balanceOf(payer);
        uint256 initialRecipientBalance = usdc.balanceOf(recipient);
        uint256 initialFeeBalance = usdc.balanceOf(feeRecipient);
        
        // Charge subscription
        vm.prank(spender);
        subscriptions.chargeSubscription(subscriptionId);
        
        // Calculate expected amounts (1% fee)
        uint256 expectedFee = (TEST_AMOUNT * 100) / 10000; // 1% fee
        uint256 expectedNetAmount = TEST_AMOUNT - expectedFee;
        
        // Verify balances
        assertEq(usdc.balanceOf(payer), initialPayerBalance - TEST_AMOUNT);
        assertEq(usdc.balanceOf(recipient), initialRecipientBalance + expectedNetAmount);
        assertEq(usdc.balanceOf(feeRecipient), initialFeeBalance + expectedFee);
        
        // Verify subscription state
        IExpendiSubscriptions.Subscription memory sub = subscriptions.getSubscription(subscriptionId);
        assertEq(sub.totalCharged, TEST_AMOUNT);
        assertEq(sub.chargeCount, 1);
        assertEq(sub.lastChargeTimestamp, block.timestamp);
        assertEq(sub.nextChargeTimestamp, block.timestamp + TEST_PERIOD * 1 days);
    }

    function testOneTimePayment() public {
        // Grant permission
        vm.prank(payer);
        subscriptions.grantPermission(
            spender,
            address(usdc),
            1000 * 1e6,
            30 days,
            block.timestamp + 365 days
        );

        // Create one-time subscription (period = 0)
        uint256 nextChargeTimestamp = block.timestamp + 1 hours;
        
        vm.prank(spender);
        bytes32 subscriptionId = subscriptions.createSubscription(
            payer,
            recipient,
            TEST_AMOUNT,
            0, // One-time payment
            nextChargeTimestamp,
            '{"type":"one-time"}'
        );

        // Fast forward and charge
        vm.warp(nextChargeTimestamp);
        
        vm.prank(spender);
        subscriptions.chargeSubscription(subscriptionId);
        
        // Verify subscription is deactivated
        IExpendiSubscriptions.Subscription memory sub = subscriptions.getSubscription(subscriptionId);
        assertFalse(sub.isActive);
    }

    function testSubscriptionPauseResume() public {
        bytes32 subscriptionId = _createTestSubscription();
        
        // Pause subscription
        vm.prank(payer);
        subscriptions.pauseSubscription(subscriptionId);
        
        IExpendiSubscriptions.Subscription memory sub = subscriptions.getSubscription(subscriptionId);
        assertTrue(sub.isPaused);
        
        // Resume subscription
        vm.prank(payer);
        subscriptions.resumeSubscription(subscriptionId);
        
        sub = subscriptions.getSubscription(subscriptionId);
        assertFalse(sub.isPaused);
    }

    function testSubscriptionCancellation() public {
        bytes32 subscriptionId = _createTestSubscription();
        
        // Cancel subscription
        vm.prank(payer);
        subscriptions.cancelSubscription(subscriptionId);
        
        IExpendiSubscriptions.Subscription memory sub = subscriptions.getSubscription(subscriptionId);
        assertFalse(sub.isActive);
    }

    function testPermissionRevocation() public {
        // Grant permission
        vm.prank(payer);
        subscriptions.grantPermission(
            spender,
            address(usdc),
            1000 * 1e6,
            30 days,
            block.timestamp + 365 days
        );
        
        // Verify permission exists
        // Permission memory permission = subscriptions.getPermission(payer, spender);
        assertTrue(permission.isActive);
        
        // Revoke permission
        vm.prank(payer);
        subscriptions.revokePermission(spender);
        
        // Verify permission is revoked
        permission = subscriptions.getPermission(payer, spender);
        assertFalse(permission.isActive);
    }

    function testFactoryDeployment() public {
        address newContract = factory.deploySubscriptionContract(feeRecipient);
        
        // Verify deployment
        assertTrue(newContract != address(0));
        
        // Check if it's in the deployed contracts list
        address[] memory deployedContracts = factory.getDeployedContracts(address(this));
        assertEq(deployedContracts[deployedContracts.length - 1], newContract);
        
        // Verify owner is transferred
        assertEq(ExpendiSubscriptions(newContract).owner(), address(this));
    }

    function testInvalidPermissionParameters() public {
        // Test invalid amount (too low)
        vm.expectRevert("Invalid amount");
        vm.prank(payer);
        subscriptions.grantPermission(
            spender,
            address(usdc),
            1e5, // 0.1 USDC, below minimum
            30 days,
            block.timestamp + 365 days
        );
        
        // Test invalid period (too short)
        vm.expectRevert("Invalid period");
        vm.prank(payer);
        subscriptions.grantPermission(
            spender,
            address(usdc),
            1000 * 1e6,
            1 hours, // Too short
            block.timestamp + 365 days
        );
        
        // Test expired permission
        vm.expectRevert("Invalid expiry");
        vm.prank(payer);
        subscriptions.grantPermission(
            spender,
            address(usdc),
            1000 * 1e6,
            30 days,
            block.timestamp - 1 // Already expired
        );
    }

    function testChargeWithoutPermission() public {
        // Create subscription without proper permission
        uint256 nextChargeTimestamp = block.timestamp + 1 days;
        
        vm.expectRevert("No permission granted");
        vm.prank(spender);
        subscriptions.createSubscription(
            payer,
            recipient,
            TEST_AMOUNT,
            TEST_PERIOD,
            nextChargeTimestamp,
            "{}"
        );
    }

    function testChargeBeforeTime() public {
        bytes32 subscriptionId = _createTestSubscription();
        
        // Try to charge before time
        vm.expectRevert("Too early to charge");
        vm.prank(spender);
        subscriptions.chargeSubscription(subscriptionId);
    }

    // Helper function to create a test subscription
    function _createTestSubscription() internal returns (bytes32) {
        // Grant permission
        vm.prank(payer);
        subscriptions.grantPermission(
            spender,
            address(usdc),
            1000 * 1e6,
            30 days,
            block.timestamp + 365 days
        );

        // Create subscription
        uint256 nextChargeTimestamp = block.timestamp + 1 days;
        
        vm.prank(spender);
        return subscriptions.createSubscription(
            payer,
            recipient,
            TEST_AMOUNT,
            TEST_PERIOD,
            nextChargeTimestamp,
            '{"name":"Test Subscription"}'
        );
    }
}