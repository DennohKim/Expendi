// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/ExpendiBucketManagerV2.sol";
import "../src/interfaces/ISubscriptionDataManager.sol";
import "../src/interfaces/ISubscriptionPaymentProcessor.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock smart wallet contract to test AA functionality
contract MockSmartWallet {
    address public owner;
    ExpendiBucketManagerV2 public bucketManager;
    
    constructor(address _owner, address _bucketManager) {
        owner = _owner;
        bucketManager = ExpendiBucketManagerV2(_bucketManager);
    }
    
    // Forward calls to bucket manager with sponsored gas simulation
    function createBucket(string memory bucketName, uint256 monthlyLimit) external {
        require(msg.sender == owner, "Only owner can call");
        bucketManager.createBucket(bucketName, monthlyLimit);
    }
    
    function fundBucket(string memory bucketName, uint256 amount, address token) external {
        require(msg.sender == owner, "Only owner can call");
        bucketManager.fundBucket(bucketName, amount, token);
    }
    
    function makeOneTimePayment(
        string memory bucketName,
        uint256 amount,
        address token,
        address recipient,
        string memory description
    ) external {
        require(msg.sender == owner, "Only owner can call");
        bucketManager.makeOneTimePayment(bucketName, amount, token, recipient, description);
    }
    
    function depositTokens(address token, uint256 amount) external payable {
        require(msg.sender == owner, "Only owner can call");
        bucketManager.depositTokens{value: msg.value}(token, amount);
    }
    
    function createBucketSubscription(
        string memory bucketName,
        uint256 amount,
        uint256 periodInDays,
        address token,
        address recipient,
        string memory metadata,
        bool userConsent
    ) external returns (uint256) {
        require(msg.sender == owner, "Only owner can call");
        return bucketManager.createBucketSubscription(
            bucketName,
            amount,
            periodInDays,
            token,
            recipient,
            metadata,
            userConsent
        );
    }
    
    // Receive ETH
    receive() external payable {}
}

// Mock token contract
contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000e6); // Mint 1M tokens
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock subscription contracts
contract MockSubscriptionDataManager is ISubscriptionDataManager {
    uint256 private nextSubscriptionId = 1;
    
    function createSubscription(
        address user,
        uint256 amount,
        uint256 periodInDays,
        address token,
        address recipient,
        string memory metadata
    ) external returns (uint256) {
        return nextSubscriptionId++;
    }
    
    function cancelSubscription(uint256 subscriptionId) external {
        // Mock implementation
    }
    
    function pauseSubscription(uint256 subscriptionId) external {
        // Mock implementation
    }
}

contract MockSubscriptionPaymentProcessor is ISubscriptionPaymentProcessor {
    function processPayment(
        uint256 subscriptionId,
        uint256 amount,
        address recipient
    ) external {
        // Mock implementation
    }
}

/**
 * @title ExpendiBucketManagerV2Test
 * @dev Comprehensive tests for Account Abstraction functionality
 */
contract ExpendiBucketManagerV2Test is Test {
    ExpendiBucketManagerV2 public bucketManager;
    MockToken public mockUSDC;
    MockSubscriptionDataManager public subscriptionDataManager;
    MockSubscriptionPaymentProcessor public subscriptionPaymentProcessor;
    
    // Test accounts
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public recipient = makeAddr("recipient");
    address public admin = makeAddr("admin");
    
    // Smart wallets
    MockSmartWallet public aliceSmartWallet;
    MockSmartWallet public bobSmartWallet;
    
    // Constants
    uint256 constant MONTHLY_LIMIT = 1000e6; // 1000 USDC
    uint256 constant DEPOSIT_AMOUNT = 500e6; // 500 USDC
    uint256 constant PAYMENT_AMOUNT = 100e6; // 100 USDC
    
    event BucketCreated(
        address indexed smartWallet,
        string indexed bucketName,
        uint256 monthlyLimit,
        bool isSmartWallet,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketFunded(
        address indexed smartWallet,
        string indexed bucketName,
        uint256 amount,
        address indexed token,
        uint256 newBalance,
        bool isSmartWallet,
        uint256 timestamp,
        uint256 blockNumber
    );

    // Helper to avoid rate limiting in tests
    uint256 private timeOffset = 0;
    
    function avoidRateLimit() internal {
        timeOffset += 301; // Add 5+ minutes
        vm.warp(block.timestamp + timeOffset);
    }

    function setUp() public {
        // Deploy mock contracts
        subscriptionDataManager = new MockSubscriptionDataManager();
        subscriptionPaymentProcessor = new MockSubscriptionPaymentProcessor();
        
        // Deploy bucket manager
        bucketManager = new ExpendiBucketManagerV2(
            address(subscriptionDataManager),
            address(subscriptionPaymentProcessor)
        );
        
        // Deploy mock token
        mockUSDC = new MockToken("Mock USDC", "USDC");
        
        // Deploy smart wallets
        aliceSmartWallet = new MockSmartWallet(alice, address(bucketManager));
        bobSmartWallet = new MockSmartWallet(bob, address(bucketManager));
        
        // Setup token balances
        mockUSDC.mint(alice, 10000e6);
        mockUSDC.mint(bob, 10000e6);
        mockUSDC.mint(address(aliceSmartWallet), 5000e6);
        mockUSDC.mint(address(bobSmartWallet), 5000e6);
        
        // Fund smart wallets with ETH
        vm.deal(address(aliceSmartWallet), 10 ether);
        vm.deal(address(bobSmartWallet), 10 ether);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        
        // Grant admin roles
        bucketManager.grantRole(bucketManager.ADMIN_ROLE(), admin);
        bucketManager.grantRole(bucketManager.SUBSCRIPTION_MANAGER_ROLE(), admin);
        
        // Disable rate limiting for tests
        bucketManager.disableRateLimiting();
    }

    // ============ SMART WALLET TESTS ============

    function test_SmartWalletDetection() public {
        // EOA should not be detected as smart wallet
        vm.prank(alice);
        bucketManager.createBucket("test-bucket", MONTHLY_LIMIT);
        
        // Smart wallet should be detected as smart wallet
        vm.prank(alice);
        aliceSmartWallet.createBucket("smart-wallet-bucket", MONTHLY_LIMIT);
        
        // Both should create buckets successfully
        (,,,, bool aliceExists,,) = bucketManager.getBucketInfo(alice, "test-bucket");
        (,,,, bool smartWalletExists,,) = bucketManager.getBucketInfo(address(aliceSmartWallet), "smart-wallet-bucket");
        assertTrue(aliceExists);
        assertTrue(smartWalletExists);
    }

    function test_SmartWalletCreateBucket() public {
        vm.expectEmit(true, true, false, true);
        emit BucketCreated(
            address(aliceSmartWallet),
            "test-bucket",
            MONTHLY_LIMIT,
            true, // isSmartWallet should be true
            block.timestamp,
            block.number
        );
        
        vm.prank(alice);
        aliceSmartWallet.createBucket("test-bucket", MONTHLY_LIMIT);
        
        // Verify bucket was created with smart wallet as owner
        (,, uint256 monthlyLimit,, bool exists, bool active,) = bucketManager.getBucketInfo(address(aliceSmartWallet), "test-bucket");
        assertTrue(exists);
        assertTrue(active);
        assertEq(monthlyLimit, MONTHLY_LIMIT);
    }

    function test_SmartWalletFundBucket() public {
        // Create bucket first
        vm.prank(alice);
        aliceSmartWallet.createBucket("test-bucket", MONTHLY_LIMIT);
        
        // Deposit tokens to smart wallet's unallocated balance
        vm.startPrank(address(aliceSmartWallet));
        mockUSDC.approve(address(bucketManager), DEPOSIT_AMOUNT);
        bucketManager.depositTokens(address(mockUSDC), DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        // Fund bucket from smart wallet
        vm.expectEmit(true, true, true, true);
        emit BucketFunded(
            address(aliceSmartWallet),
            "test-bucket",
            DEPOSIT_AMOUNT,
            address(mockUSDC),
            DEPOSIT_AMOUNT,
            true, // isSmartWallet should be true
            block.timestamp,
            block.number
        );
        
        vm.prank(alice);
        aliceSmartWallet.fundBucket("test-bucket", DEPOSIT_AMOUNT, address(mockUSDC));
        
        // Verify bucket balance
        uint256 bucketBalance = bucketManager.getBucketBalance(
            address(aliceSmartWallet), 
            "test-bucket", 
            address(mockUSDC)
        );
        assertEq(bucketBalance, DEPOSIT_AMOUNT);
    }

    function test_SmartWalletOneTimePayment() public {
        // Setup: Create and fund bucket
        vm.prank(alice);
        aliceSmartWallet.createBucket("test-bucket", MONTHLY_LIMIT);
        
        vm.startPrank(address(aliceSmartWallet));
        mockUSDC.approve(address(bucketManager), DEPOSIT_AMOUNT);
        bucketManager.depositTokens(address(mockUSDC), DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        vm.prank(alice);
        aliceSmartWallet.fundBucket("test-bucket", DEPOSIT_AMOUNT, address(mockUSDC));
        
        // Make payment from smart wallet
        uint256 recipientBalanceBefore = mockUSDC.balanceOf(recipient);
        
        vm.prank(alice);
        aliceSmartWallet.makeOneTimePayment(
            "test-bucket",
            PAYMENT_AMOUNT,
            address(mockUSDC),
            recipient,
            "Test payment"
        );
        
        // Verify payment was processed
        uint256 recipientBalanceAfter = mockUSDC.balanceOf(recipient);
        assertEq(recipientBalanceAfter - recipientBalanceBefore, PAYMENT_AMOUNT);
        
        // Verify bucket balance decreased
        uint256 bucketBalance = bucketManager.getBucketBalance(
            address(aliceSmartWallet), 
            "test-bucket", 
            address(mockUSDC)
        );
        assertEq(bucketBalance, DEPOSIT_AMOUNT - PAYMENT_AMOUNT);
    }

    function test_SmartWalletCreateSubscription() public {
        // Setup: Create and fund bucket
        vm.prank(alice);
        aliceSmartWallet.createBucket("subscription-bucket", MONTHLY_LIMIT);
        
        vm.startPrank(address(aliceSmartWallet));
        mockUSDC.approve(address(bucketManager), DEPOSIT_AMOUNT);
        bucketManager.depositTokens(address(mockUSDC), DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        vm.prank(alice);
        aliceSmartWallet.fundBucket("subscription-bucket", DEPOSIT_AMOUNT, address(mockUSDC));
        
        // Create subscription from smart wallet
        vm.prank(alice);
        uint256 subscriptionId = aliceSmartWallet.createBucketSubscription(
            "subscription-bucket",
            PAYMENT_AMOUNT,
            30, // 30 days
            address(mockUSDC),
            recipient,
            "Test subscription",
            true // user consent
        );
        
        // Verify subscription was created
        assertGt(subscriptionId, 0);
        
        (,, uint256 amount,,, address subscriptionRecipient, bool isActive,,,,,, bool userConsent) = 
            bucketManager.getSubscriptionInfo(address(aliceSmartWallet), subscriptionId);
        
        assertTrue(isActive);
        assertEq(amount, PAYMENT_AMOUNT);
        assertEq(subscriptionRecipient, recipient);
        assertTrue(userConsent);
    }

    // ============ GAS SPONSORSHIP SIMULATION TESTS ============

    function test_GasSponsorshipSimulation() public {
        // Record initial gas
        uint256 gasStart = gasleft();
        
        // Smart wallet operation (simulates sponsored gas)
        vm.prank(alice);
        aliceSmartWallet.createBucket("sponsored-bucket", MONTHLY_LIMIT);
        
        uint256 gasUsed = gasStart - gasleft();
        console.log("Gas used for smart wallet createBucket:", gasUsed);
        
        // Verify operation succeeded despite potential gas complexity
        (,,,, bool exists,,) = bucketManager.getBucketInfo(address(aliceSmartWallet), "sponsored-bucket");
        assertTrue(exists);
    }

    // ============ CONSISTENCY TESTS ============

    function test_SmartWalletConsistency() public {
        // Same user should get same smart wallet address across operations
        vm.prank(alice);
        aliceSmartWallet.createBucket("bucket1", MONTHLY_LIMIT);
        
        
        vm.prank(alice);
        aliceSmartWallet.createBucket("bucket2", MONTHLY_LIMIT);
        
        // Both buckets should be owned by the same smart wallet
        (,,,, bool bucket1Exists,,) = bucketManager.getBucketInfo(address(aliceSmartWallet), "bucket1");
        (,,,, bool bucket2Exists,,) = bucketManager.getBucketInfo(address(aliceSmartWallet), "bucket2");
        assertTrue(bucket1Exists);
        assertTrue(bucket2Exists);
        
        // Verify bucket names are tracked correctly
        string[] memory bucketNames = bucketManager.getUserBucketNames(address(aliceSmartWallet));
        assertEq(bucketNames.length, 2);
    }

    function test_IsolationBetweenSmartWallets() public {
        // Create buckets with different smart wallets
        vm.prank(alice);
        aliceSmartWallet.createBucket("alice-bucket", MONTHLY_LIMIT);
        
        
        vm.prank(bob);
        bobSmartWallet.createBucket("bob-bucket", MONTHLY_LIMIT);
        
        // Verify isolation
        (,,,, bool aliceBucketExists,,) = bucketManager.getBucketInfo(address(aliceSmartWallet), "alice-bucket");
        (,,,, bool aliceBobBucketExists,,) = bucketManager.getBucketInfo(address(aliceSmartWallet), "bob-bucket");
        assertTrue(aliceBucketExists);
        assertFalse(aliceBobBucketExists);
        
        (,,,, bool bobBucketExists,,) = bucketManager.getBucketInfo(address(bobSmartWallet), "bob-bucket");
        (,,,, bool bobAliceBucketExists,,) = bucketManager.getBucketInfo(address(bobSmartWallet), "alice-bucket");
        assertTrue(bobBucketExists);
        assertFalse(bobAliceBucketExists);
    }

    // ============ SUBSCRIPTION PROCESSING TESTS ============

    function test_SubscriptionProcessingWithSmartWallet() public {
        // Setup: Create subscription
        vm.prank(alice);
        aliceSmartWallet.createBucket("sub-bucket", MONTHLY_LIMIT);
        
        vm.startPrank(address(aliceSmartWallet));
        mockUSDC.approve(address(bucketManager), DEPOSIT_AMOUNT);
        bucketManager.depositTokens(address(mockUSDC), DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        vm.prank(alice);
        aliceSmartWallet.fundBucket("sub-bucket", DEPOSIT_AMOUNT, address(mockUSDC));
        
        vm.prank(alice);
        uint256 subscriptionId = aliceSmartWallet.createBucketSubscription(
            "sub-bucket",
            PAYMENT_AMOUNT,
            30,
            address(mockUSDC),
            recipient,
            "Test subscription",
            true
        );
        
        // Fast forward time to make subscription due
        vm.warp(block.timestamp + 31 days);
        
        // Process subscription payment (admin function)
        uint256 recipientBalanceBefore = mockUSDC.balanceOf(recipient);
        
        vm.prank(admin);
        bucketManager.processSubscriptionPayment(address(aliceSmartWallet), subscriptionId);
        
        // Verify payment was processed
        uint256 recipientBalanceAfter = mockUSDC.balanceOf(recipient);
        assertEq(recipientBalanceAfter - recipientBalanceBefore, PAYMENT_AMOUNT);
        
        // Verify subscription state updated
        (,,,,,,,, uint256 totalCharged, uint256 chargeCount,,,) = 
            bucketManager.getSubscriptionInfo(address(aliceSmartWallet), subscriptionId);
        
        assertEq(totalCharged, PAYMENT_AMOUNT);
        assertEq(chargeCount, 1);
    }

    // ============ RATE LIMITING TESTS ============

    function test_RateLimitingWithSmartWallet() public {
        // Create a fresh address for this test
        address testUser = makeAddr("rateLimitTestUser");
        
        // Enable rate limiting for this test
        bucketManager.enableRateLimiting();
        
        // First operation should succeed
        vm.prank(testUser);
        bucketManager.createBucket("rate-limit-test", MONTHLY_LIMIT);
        
        // Second operation immediately should fail due to rate limiting
        vm.prank(testUser);
        vm.expectRevert("Operation too frequent");
        bucketManager.createBucket("rate-limit-test-2", MONTHLY_LIMIT);
        
        // After waiting, should succeed
        vm.warp(block.timestamp + 301); // Wait for rate limit to pass
        
        vm.prank(testUser);
        bucketManager.createBucket("rate-limit-test-2", MONTHLY_LIMIT);
        
        (,,,, bool exists,,) = bucketManager.getBucketInfo(testUser, "rate-limit-test-2");
        assertTrue(exists);
        
        // Disable rate limiting again for other tests
        bucketManager.disableRateLimiting();
    }

    // ============ EDGE CASE TESTS ============

    function test_EOAStillWorks() public {
        // Verify EOA transactions still work alongside smart wallet transactions
        vm.prank(alice);
        bucketManager.createBucket("eoa-bucket", MONTHLY_LIMIT);
        
        (,,,, bool eoaBucketExists,,) = bucketManager.getBucketInfo(alice, "eoa-bucket");
        assertTrue(eoaBucketExists);
        
        // Smart wallet and EOA should be separate
        (,,,, bool smartWalletEoaBucketExists,,) = bucketManager.getBucketInfo(address(aliceSmartWallet), "eoa-bucket");
        (,,,, bool eoaSmartWalletBucketExists,,) = bucketManager.getBucketInfo(alice, "smart-wallet-bucket");
        assertFalse(smartWalletEoaBucketExists);
        assertFalse(eoaSmartWalletBucketExists);
    }

    function test_LargeScaleOperations() public {
        // Test with multiple buckets and operations
        for (uint256 i = 0; i < 5; i++) {
            if (i > 0) {
            }
            
            vm.prank(alice);
            aliceSmartWallet.createBucket(
                string.concat("bucket-", vm.toString(i)), 
                MONTHLY_LIMIT
            );
        }
        
        // Verify all buckets were created
        string[] memory bucketNames = bucketManager.getUserBucketNames(address(aliceSmartWallet));
        assertEq(bucketNames.length, 5);
    }

    // ============ HELPER FUNCTIONS ============

    function _fundSmartWalletBucket(
        MockSmartWallet wallet,
        address user,
        string memory bucketName,
        uint256 amount,
        address token
    ) internal {
        vm.startPrank(address(wallet));
        if (token == address(0)) {
            bucketManager.depositTokens{value: amount}(token, amount);
        } else {
            IERC20(token).approve(address(bucketManager), amount);
            bucketManager.depositTokens(token, amount);
        }
        vm.stopPrank();
        
        vm.prank(user);
        wallet.fundBucket(bucketName, amount, token);
    }
}