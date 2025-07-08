// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/SimpleBudgetWallet.sol";
import "../src/SimpleBudgetWalletFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Mock ERC20 token for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SimpleBudgetWalletTest is Test {
    SimpleBudgetWallet public wallet;
    SimpleBudgetWalletFactory public factory;
    MockToken public token;
    
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public recipient = makeAddr("recipient");
    address public delegate = makeAddr("delegate");
    
    uint256 public constant INITIAL_BALANCE = 10 ether;
    uint256 public constant MONTHLY_LIMIT = 1 ether;
    string public constant BUCKET_NAME = "groceries";
    
    event BucketCreated(address indexed user, string bucketName, uint256 monthlyLimit);
    event BucketFunded(address indexed user, string bucketName, uint256 amount, address token);
    event SpentFromBucket(address indexed user, string bucketName, uint256 amount, address recipient, address token);
    
    function setUp() public {
        // Deploy contracts
        wallet = new SimpleBudgetWallet();
        factory = new SimpleBudgetWalletFactory(0); // No creation fee
        token = new MockToken();
        
        // Fund accounts
        vm.deal(user1, INITIAL_BALANCE);
        vm.deal(user2, INITIAL_BALANCE);
        vm.deal(address(wallet), INITIAL_BALANCE);
        
        // Give tokens to users
        token.mint(user1, 1000 * 10**18);
        token.mint(address(wallet), 1000 * 10**18);
        
        // Label addresses for better trace output
        vm.label(address(wallet), "BudgetWallet");
        vm.label(address(factory), "Factory");
        vm.label(address(token), "MockToken");
        vm.label(user1, "User1");
        vm.label(user2, "User2");
        vm.label(recipient, "Recipient");
        vm.label(delegate, "Delegate");
    }
    
    // ============ FACTORY TESTS ============
    
    function testFactoryWalletCreation() public {
        vm.startPrank(user1);
        
        address walletAddress = factory.createWallet();
        
        assertEq(factory.getWallet(user1), walletAddress);
        assertEq(factory.getOwner(walletAddress), user1);
        assertTrue(factory.hasWallet(user1));
        assertEq(factory.totalWalletsCreated(), 1);
        
        vm.stopPrank();
    }
    
    function testFactoryDeterministicWallet() public {
        vm.startPrank(user1);
        
        uint256 salt = 12345;
        address predictedAddress = factory.getWalletAddress(salt);
        address actualAddress = factory.createWalletDeterministic(salt);
        
        assertEq(predictedAddress, actualAddress);
        assertEq(factory.getWallet(user1), actualAddress);
        
        vm.stopPrank();
    }
    
    function testFactoryCannotCreateDuplicate() public {
        vm.startPrank(user1);
        
        factory.createWallet();
        
        vm.expectRevert("Wallet already exists");
        factory.createWallet();
        
        vm.stopPrank();
    }
    
    // ============ DEPOSIT TESTS ============
    
    function testDepositETH() public {
        vm.startPrank(user1);
        
        uint256 depositAmount = 2 ether;
        
        vm.expectEmit(true, true, true, true);
        emit SimpleBudgetWallet.FundsDeposited(user1, depositAmount, address(0));
        
        wallet.depositETH{value: depositAmount}();
        
        assertEq(wallet.getUnallocatedBalance(user1, address(0)), depositAmount);
        
        vm.stopPrank();
    }
    
    function testDepositToken() public {
        vm.startPrank(user1);
        
        uint256 depositAmount = 100 * 10**18;
        token.approve(address(wallet), depositAmount);
        
        vm.expectEmit(true, true, true, true);
        emit SimpleBudgetWallet.FundsDeposited(user1, depositAmount, address(token));
        
        wallet.depositToken(address(token), depositAmount);
        
        assertEq(wallet.getUnallocatedBalance(user1, address(token)), depositAmount);
        
        vm.stopPrank();
    }
    
    function testReceiveETH() public {
        vm.startPrank(user1);
        
        uint256 sendAmount = 1 ether;
        (bool success, ) = address(wallet).call{value: sendAmount}("");
        assertTrue(success);
        
        assertEq(wallet.getUnallocatedBalance(user1, address(0)), sendAmount);
        
        vm.stopPrank();
    }
    
    // ============ BUCKET MANAGEMENT TESTS ============
    
    function testCreateBucket() public {
        vm.startPrank(user1);
        
        vm.expectEmit(true, true, true, true);
        emit BucketCreated(user1, BUCKET_NAME, MONTHLY_LIMIT);
        
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        (
            uint256 ethBalance,
            uint256 monthlySpent,
            uint256 monthlyLimit,
            uint256 timeUntilReset,
            bool active
        ) = wallet.getBucket(user1, BUCKET_NAME);
        
        assertEq(ethBalance, 0);
        assertEq(monthlySpent, 0);
        assertEq(monthlyLimit, MONTHLY_LIMIT);
        assertTrue(active);
        assertTrue(timeUntilReset > 0);
        
        string[] memory buckets = wallet.getUserBuckets(user1);
        assertEq(buckets.length, 1);
        assertEq(buckets[0], BUCKET_NAME);
        
        vm.stopPrank();
    }
    
    function testCreateDuplicateBucketFails() public {
        vm.startPrank(user1);
        
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        vm.expectRevert("Bucket already exists");
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        vm.stopPrank();
    }
    
    function testUpdateBucket() public {
        vm.startPrank(user1);
        
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        uint256 newLimit = 2 ether;
        wallet.updateBucket(BUCKET_NAME, newLimit, false);
        
        (, , uint256 monthlyLimit, , bool active) = wallet.getBucket(user1, BUCKET_NAME);
        assertEq(monthlyLimit, newLimit);
        assertFalse(active);
        
        vm.stopPrank();
    }
    
    // ============ FUNDING TESTS ============
    
    function testFundBucketWithETH() public {
        vm.startPrank(user1);
        
        // Deposit ETH first
        wallet.depositETH{value: 5 ether}();
        
        // Create bucket
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        // Fund bucket
        uint256 fundAmount = 1 ether;
        
        vm.expectEmit(true, true, true, true);
        emit BucketFunded(user1, BUCKET_NAME, fundAmount, address(0));
        
        wallet.fundBucket(BUCKET_NAME, fundAmount, address(0));
        
        (uint256 ethBalance, , , , ) = wallet.getBucket(user1, BUCKET_NAME);
        assertEq(ethBalance, fundAmount);
        assertEq(wallet.getUnallocatedBalance(user1, address(0)), 4 ether);
        
        vm.stopPrank();
    }
    
    function testFundBucketWithTokens() public {
        vm.startPrank(user1);
        
        // Deposit tokens first
        uint256 depositAmount = 100 * 10**18;
        token.approve(address(wallet), depositAmount);
        wallet.depositToken(address(token), depositAmount);
        
        // Create bucket
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        // Fund bucket
        uint256 fundAmount = 50 * 10**18;
        wallet.fundBucket(BUCKET_NAME, fundAmount, address(token));
        
        uint256 tokenBalance = wallet.getBucketBalance(user1, address(token), BUCKET_NAME);
        assertEq(tokenBalance, fundAmount);
        assertEq(wallet.getUnallocatedBalance(user1, address(token)), 50 * 10**18);
        
        vm.stopPrank();
    }
    
    function testTransferBetweenBuckets() public {
        vm.startPrank(user1);
        
        // Setup
        wallet.depositETH{value: 3 ether}();
        wallet.createBucket("bucket1", MONTHLY_LIMIT);
        wallet.createBucket("bucket2", MONTHLY_LIMIT);
        wallet.fundBucket("bucket1", 2 ether, address(0));
        
        // Transfer
        wallet.transferBetweenBuckets("bucket1", "bucket2", 1 ether, address(0));
        
        (uint256 balance1, , , , ) = wallet.getBucket(user1, "bucket1");
        (uint256 balance2, , , , ) = wallet.getBucket(user1, "bucket2");
        
        assertEq(balance1, 1 ether);
        assertEq(balance2, 1 ether);
        
        vm.stopPrank();
    }
    
    // ============ SPENDING TESTS ============
    
    function testSpendFromBucket() public {
        vm.startPrank(user1);
        
        // Setup
        wallet.depositETH{value: 3 ether}();
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        wallet.fundBucket(BUCKET_NAME, 2 ether, address(0));
        
        // Spend
        uint256 spendAmount = 0.5 ether;
        uint256 recipientBalanceBefore = recipient.balance;
        
        vm.expectEmit(true, true, true, true);
        emit SpentFromBucket(user1, BUCKET_NAME, spendAmount, recipient, address(0));
        
        wallet.spendFromBucket(user1, BUCKET_NAME, spendAmount, payable(recipient), address(0), "");
        
        // Verify
        (uint256 ethBalance, uint256 monthlySpent, , , ) = wallet.getBucket(user1, BUCKET_NAME);
        assertEq(ethBalance, 1.5 ether);
        assertEq(monthlySpent, spendAmount);
        assertEq(recipient.balance, recipientBalanceBefore + spendAmount);
        
        vm.stopPrank();
    }
    
    function testSpendFromBucketWithTokens() public {
        vm.startPrank(user1);
        
        // Setup
        uint256 depositAmount = 100 * 10**18;
        token.approve(address(wallet), depositAmount);
        wallet.depositToken(address(token), depositAmount);
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        wallet.fundBucket(BUCKET_NAME, 50 * 10**18, address(token));
        
        // Spend
        uint256 spendAmount = 5 * 10**17; // 0.5 tokens - stay within monthly limit of 1 ether
        wallet.spendFromBucket(user1, BUCKET_NAME, spendAmount, payable(recipient), address(token), "");
        
        // Verify
        uint256 bucketBalance = wallet.getBucketBalance(user1, address(token), BUCKET_NAME);
        assertEq(bucketBalance, 50 * 10**18 - spendAmount);
        assertEq(token.balanceOf(recipient), spendAmount);
        
        vm.stopPrank();
    }
    
    function testMonthlyLimitEnforcement() public {
        vm.startPrank(user1);
        
        // Setup with 1 ETH monthly limit
        wallet.depositETH{value: 3 ether}();
        wallet.createBucket(BUCKET_NAME, 1 ether);
        wallet.fundBucket(BUCKET_NAME, 2 ether, address(0));
        
        // First spending within limit
        wallet.spendFromBucket(user1, BUCKET_NAME, 0.8 ether, payable(recipient), address(0), "");
        
        // Second spending that would exceed limit should fail
        vm.expectRevert("Monthly limit exceeded");
        wallet.spendFromBucket(user1, BUCKET_NAME, 0.3 ether, payable(recipient), address(0), "");
        
        vm.stopPrank();
    }
    
    function testSpendingWithInsufficientBalance() public {
        vm.startPrank(user1);
        
        wallet.depositETH{value: 1 ether}();
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        wallet.fundBucket(BUCKET_NAME, 0.5 ether, address(0));
        
        vm.expectRevert("Insufficient bucket balance");
        wallet.spendFromBucket(user1, BUCKET_NAME, 1 ether, payable(recipient), address(0), "");
        
        vm.stopPrank();
    }
    
    function testBatchSpend() public {
        vm.startPrank(user1);
        
        // Setup
        wallet.depositETH{value: 5 ether}();
        wallet.createBucket("bucket1", 2 ether);
        wallet.createBucket("bucket2", 2 ether);
        wallet.fundBucket("bucket1", 2 ether, address(0));
        wallet.fundBucket("bucket2", 2 ether, address(0));
        
        // Prepare batch data
        string[] memory bucketNames = new string[](2);
        bucketNames[0] = "bucket1";
        bucketNames[1] = "bucket2";
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 0.5 ether;
        amounts[1] = 0.3 ether;
        
        address[] memory recipients = new address[](2);
        recipients[0] = recipient;
        recipients[1] = user2;
        
        address[] memory tokens = new address[](2);
        tokens[0] = address(0);
        tokens[1] = address(0);
        
        bytes[] memory datas = new bytes[](2);
        datas[0] = "";
        datas[1] = "";
        
        // Execute batch
        wallet.batchSpend(user1, bucketNames, amounts, recipients, tokens, datas);
        
        // Verify
        assertEq(recipient.balance, 0.5 ether);
        assertEq(user2.balance, INITIAL_BALANCE + 0.3 ether);
        
        vm.stopPrank();
    }
    
    // ============ DELEGATE TESTS ============
    
    function testAddAndRemoveDelegate() public {
        vm.startPrank(user1);
        
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        // Add delegate
        wallet.addDelegate(BUCKET_NAME, delegate);
        assertTrue(wallet.isDelegate(user1, BUCKET_NAME, delegate));
        
        // Remove delegate
        wallet.removeDelegate(BUCKET_NAME, delegate);
        assertFalse(wallet.isDelegate(user1, BUCKET_NAME, delegate));
        
        vm.stopPrank();
    }
    
    function testDelegateCanSpend() public {
        vm.startPrank(user1);
        
        // Setup
        wallet.depositETH{value: 2 ether}();
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        wallet.fundBucket(BUCKET_NAME, 1 ether, address(0));
        wallet.addDelegate(BUCKET_NAME, delegate);
        
        vm.stopPrank();
        
        // Delegate spends
        vm.startPrank(delegate);
        
        wallet.spendFromBucket(user1, BUCKET_NAME, 0.5 ether, payable(recipient), address(0), "");
        
        (uint256 ethBalance, , , , ) = wallet.getBucket(user1, BUCKET_NAME);
        assertEq(ethBalance, 0.5 ether);
        
        vm.stopPrank();
    }
    
    // ============ MONTHLY RESET TESTS ============
    
    function testMonthlySpendingReset() public {
        vm.startPrank(user1);
        
        // Setup
        wallet.depositETH{value: 3 ether}();
        wallet.createBucket(BUCKET_NAME, 1 ether);
        wallet.fundBucket(BUCKET_NAME, 2 ether, address(0));
        
        // Spend some amount
        wallet.spendFromBucket(user1, BUCKET_NAME, 0.8 ether, payable(recipient), address(0), "");
        
        (, uint256 monthlySpent, , , ) = wallet.getBucket(user1, BUCKET_NAME);
        assertEq(monthlySpent, 0.8 ether);
        
        // Fast forward time by more than 30 days
        vm.warp(block.timestamp + 31 days);
        
        // Spend again (should reset monthly counter)
        wallet.spendFromBucket(user1, BUCKET_NAME, 0.5 ether, payable(recipient), address(0), "");
        
        (, monthlySpent, , , ) = wallet.getBucket(user1, BUCKET_NAME);
        assertEq(monthlySpent, 0.5 ether); // Should be reset
        
        vm.stopPrank();
    }
    
    // ============ VIEW FUNCTION TESTS ============
    
    function testCanSpendFromBucket() public {
        vm.startPrank(user1);
        
        wallet.depositETH{value: 2 ether}();
        wallet.createBucket(BUCKET_NAME, 1 ether);
        wallet.fundBucket(BUCKET_NAME, 1.5 ether, address(0));
        
        // Can spend within limits
        (bool canSpend, string memory reason) = wallet.canSpendFromBucket(user1, BUCKET_NAME, 0.5 ether);
        assertTrue(canSpend);
        assertEq(reason, "");
        
        // Cannot spend more than monthly limit
        (canSpend, reason) = wallet.canSpendFromBucket(user1, BUCKET_NAME, 1.2 ether);
        assertFalse(canSpend);
        assertEq(reason, "Would exceed monthly limit");
        
        vm.stopPrank();
    }
    
    function testGetTotalBalance() public {
        vm.startPrank(user1);
        
        wallet.depositETH{value: 5 ether}();
        wallet.createBucket("bucket1", MONTHLY_LIMIT);
        wallet.createBucket("bucket2", MONTHLY_LIMIT);
        wallet.fundBucket("bucket1", 2 ether, address(0));
        wallet.fundBucket("bucket2", 1 ether, address(0));
        
        uint256 totalBalance = wallet.getTotalBalance(user1, address(0));
        assertEq(totalBalance, 5 ether); // 2 + 1 + 2 (unallocated)
        
        vm.stopPrank();
    }
    
    // ============ ACCESS CONTROL TESTS ============
    
    function testUnauthorizedCannotSpend() public {
        vm.startPrank(user1);
        
        wallet.depositETH{value: 2 ether}();
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        wallet.fundBucket(BUCKET_NAME, 1 ether, address(0));
        
        vm.stopPrank();
        
        // User2 tries to spend from user1's bucket
        vm.startPrank(user2);
        
        vm.expectRevert("Not authorized");
        wallet.spendFromBucket(user1, BUCKET_NAME, 0.5 ether, payable(recipient), address(0), "");
        
        vm.stopPrank();
    }
    
    // ============ EMERGENCY TESTS ============
    
    function testEmergencyPause() public {
        // Admin pauses the contract
        wallet.pause();
        
        vm.startPrank(user1);
        
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        vm.stopPrank();
        
        // Admin unpauses
        wallet.unpause();
        
        vm.startPrank(user1);
        
        // Should work now
        wallet.createBucket(BUCKET_NAME, MONTHLY_LIMIT);
        
        vm.stopPrank();
    }
    
    // ============ FUZZ TESTS ============
    
    function testFuzzBucketCreation(string memory bucketName, uint256 monthlyLimit) public {
        vm.assume(bytes(bucketName).length > 0 && bytes(bucketName).length <= 32);
        vm.assume(monthlyLimit < type(uint128).max);
        
        vm.startPrank(user1);
        
        wallet.createBucket(bucketName, monthlyLimit);
        
        (, , uint256 retrievedLimit, , bool active) = wallet.getBucket(user1, bucketName);
        assertEq(retrievedLimit, monthlyLimit);
        assertTrue(active);
        
        vm.stopPrank();
    }
    
    function testFuzzSpending(uint256 fundAmount, uint256 spendAmount) public {
        fundAmount = bound(fundAmount, 1 ether, 10 ether);
        spendAmount = bound(spendAmount, 0.1 ether, fundAmount);
        
        vm.startPrank(user1);
        
        // Setup
        wallet.depositETH{value: fundAmount}();
        wallet.createBucket(BUCKET_NAME, type(uint256).max); // No monthly limit
        wallet.fundBucket(BUCKET_NAME, fundAmount, address(0));
        
        // Spend
        wallet.spendFromBucket(user1, BUCKET_NAME, spendAmount, payable(recipient), address(0), "");
        
        // Verify
        (uint256 ethBalance, uint256 monthlySpent, , , ) = wallet.getBucket(user1, BUCKET_NAME);
        assertEq(ethBalance, fundAmount - spendAmount);
        assertEq(monthlySpent, spendAmount);
        assertEq(recipient.balance, spendAmount);
        
        vm.stopPrank();
    }
}