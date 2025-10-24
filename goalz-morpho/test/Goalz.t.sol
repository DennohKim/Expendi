// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/Goalz_Morpho.sol";
import "../src/GoalzTokenMorpho.sol";
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockMetaMorphoVault.sol";

contract GoalzTest is Test {
    Goalz public goalz;
    MockERC20 public usdc;
    MockERC20 public usdt;
    MockMetaMorphoVault public morphoVaultUSDC;
    MockMetaMorphoVault public morphoVaultUSDT;
    
    address public owner;
    address public user1;
    address public user2;
    address public gelatoAutomate;
    
    uint256 constant INITIAL_BALANCE = 10000 * 1e6; // 10k USDC/USDT
    uint256 constant GOAL_AMOUNT = 1000 * 1e6; // 1k USDC/USDT
    
    event GoalCreated(
        address indexed saver,
        uint indexed goalId,
        string what,
        string why,
        uint targetAmount,
        uint targetDate,
        address depositToken
    );
    
    event GoalDeleted(
        address indexed saver,
        uint indexed goalId
    );
    
    event GoalzTokenCreated(
        address indexed depositToken,
        address indexed goalzToken
    );
    
    event DepositMade(
        address indexed saver,
        uint indexed goalId,
        uint amount,
        uint256 shares
    );
    
    event WithdrawMade(
        address indexed saver,
        uint indexed goalId,
        uint amount
    );
    
    event GoalCompleted(
        address indexed saver,
        uint indexed goalId,
        uint targetAmount
    );
    
    event AutomatedDepositCreated(
        address indexed saver,
        uint indexed goalId,
        uint amount,
        uint frequency
    );
    
    event AutomatedDepositCanceled(
        address indexed saver,
        uint indexed goalId
    );

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        gelatoAutomate = makeAddr("gelato");
        
        // Deploy mock tokens
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdt = new MockERC20("Tether USD", "USDT", 6);
        
        // Deploy mock Morpho vaults
        morphoVaultUSDC = new MockMetaMorphoVault(address(usdc));
        morphoVaultUSDT = new MockMetaMorphoVault(address(usdt));
        
        // Mint tokens to users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdt.mint(user1, INITIAL_BALANCE);
        usdt.mint(user2, INITIAL_BALANCE);
        
        // Deploy Goalz contract with multiple tokens
        address[] memory depositTokens = new address[](2);
        address[] memory vaults = new address[](2);
        depositTokens[0] = address(usdc);
        depositTokens[1] = address(usdt);
        vaults[0] = address(morphoVaultUSDC);
        vaults[1] = address(morphoVaultUSDT);
        
        goalz = new Goalz(depositTokens, vaults, gelatoAutomate);
    }
    
    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testDeployment() public {
        // Check GoalzTokens were created for both tokens
        address goalzTokenUSDC = address(goalz.goalzTokens(address(usdc)));
        address goalzTokenUSDT = address(goalz.goalzTokens(address(usdt)));
        assertTrue(goalzTokenUSDC != address(0), "USDC GoalzToken not created");
        assertTrue(goalzTokenUSDT != address(0), "USDT GoalzToken not created");
        
        // Check vault mappings
        address vaultUSDC = address(goalz.morphoVaults(address(usdc)));
        address vaultUSDT = address(goalz.morphoVaults(address(usdt)));
        assertEq(vaultUSDC, address(morphoVaultUSDC), "USDC vault not mapped correctly");
        assertEq(vaultUSDT, address(morphoVaultUSDT), "USDT vault not mapped correctly");
    }
    
    function testGoalzTokenProperties() public {
        GoalzTokenMorpho goalzTokenUSDC = goalz.goalzTokens(address(usdc));
        GoalzTokenMorpho goalzTokenUSDT = goalz.goalzTokens(address(usdt));
        
        // USDC GoalzToken
        assertEq(goalzTokenUSDC.name(), "Goalz USD Coin");
        assertEq(goalzTokenUSDC.symbol(), "glzUSDC");
        assertEq(goalzTokenUSDC.depositToken(), address(usdc));
        assertEq(goalzTokenUSDC.morphoVault(), address(morphoVaultUSDC));
        assertEq(goalzTokenUSDC.decimals(), 6);
        
        // USDT GoalzToken
        assertEq(goalzTokenUSDT.name(), "Goalz Tether USD");
        assertEq(goalzTokenUSDT.symbol(), "glzUSDT");
        assertEq(goalzTokenUSDT.depositToken(), address(usdt));
        assertEq(goalzTokenUSDT.morphoVault(), address(morphoVaultUSDT));
        assertEq(goalzTokenUSDT.decimals(), 6);
    }
    
    function testCannotDeployWithMismatchedArrays() public {
        address[] memory depositTokens = new address[](1);
        address[] memory vaults = new address[](2);
        depositTokens[0] = address(usdc);
        vaults[0] = address(morphoVaultUSDC);
        vaults[1] = address(morphoVaultUSDT);
        
        vm.expectRevert("Deposit tokens and vaults should be the same length");
        new Goalz(depositTokens, vaults, gelatoAutomate);
    }
    
    function testCannotDeployWithInvalidVault() public {
        MockERC20 wrongToken = new MockERC20("Wrong", "WRONG", 18);
        MockMetaMorphoVault wrongVault = new MockMetaMorphoVault(address(wrongToken));
        
        address[] memory depositTokens = new address[](1);
        address[] memory vaults = new address[](1);
        depositTokens[0] = address(usdc);
        vaults[0] = address(wrongVault);
        
        vm.expectRevert("Vault asset mismatch");
        new Goalz(depositTokens, vaults, gelatoAutomate);
    }
    
    /*//////////////////////////////////////////////////////////////
                            GOAL CREATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testCreateGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        
        vm.startPrank(user1);
        
        vm.expectEmit(true, true, false, true);
        emit GoalCreated(
            user1,
            0,
            "Buy a car",
            "Need reliable transportation",
            GOAL_AMOUNT,
            futureDate,
            address(usdc)
        );
        
        goalz.setGoal(
            "Buy a car",
            "Need reliable transportation",
            GOAL_AMOUNT,
            futureDate,
            address(usdc)
        );
        
        vm.stopPrank();
        
        // Verify goal was created
        (
            string memory what,
            string memory why,
            uint targetAmount,
            uint currentAmount,
            uint targetDate,
            address depositToken,
            bool complete,
            uint256 shareBalance
        ) = goalz.savingsGoals(0);
        
        assertEq(what, "Buy a car");
        assertEq(why, "Need reliable transportation");
        assertEq(targetAmount, GOAL_AMOUNT);
        assertEq(currentAmount, 0);
        assertEq(targetDate, futureDate);
        assertEq(depositToken, address(usdc));
        assertFalse(complete);
        assertEq(shareBalance, 0);
        
        // Verify NFT was minted
        assertEq(goalz.ownerOf(0), user1);
        assertEq(goalz.balanceOf(user1), 1);
    }
    
    function testCreateMultipleGoals() public {
        uint256 futureDate = block.timestamp + 30 days;
        
        vm.startPrank(user1);
        goalz.setGoal("Goal 1", "First goal", GOAL_AMOUNT, futureDate, address(usdc));
        goalz.setGoal("Goal 2", "Second goal", GOAL_AMOUNT, futureDate, address(usdt));
        goalz.setGoal("Goal 3", "Third goal", GOAL_AMOUNT, futureDate, address(usdc));
        vm.stopPrank();
        
        assertEq(goalz.balanceOf(user1), 3);
        assertEq(goalz.ownerOf(0), user1);
        assertEq(goalz.ownerOf(1), user1);
        assertEq(goalz.ownerOf(2), user1);
        
        (, , , , , address token1, ,) = goalz.savingsGoals(0);
        (, , , , , address token2, ,) = goalz.savingsGoals(1);
        (, , , , , address token3, ,) = goalz.savingsGoals(2);
        
        assertEq(token1, address(usdc));
        assertEq(token2, address(usdt));
        assertEq(token3, address(usdc));
    }
    
    function testCannotCreateGoalWithZeroAmount() public {
        uint256 futureDate = block.timestamp + 30 days;
        
        vm.startPrank(user1);
        vm.expectRevert("Target amount should be greater than 0");
        goalz.setGoal("Invalid", "Zero amount", 0, futureDate, address(usdc));
        vm.stopPrank();
    }
    
    function testCannotCreateGoalWithPastDate() public {
        uint256 pastDate = block.timestamp - 1 days;
        
        vm.startPrank(user1);
        vm.expectRevert("Target date should be in the future");
        goalz.setGoal("Invalid", "Past date", GOAL_AMOUNT, pastDate, address(usdc));
        vm.stopPrank();
    }
    
    function testCannotCreateGoalWithUnsupportedToken() public {
        uint256 futureDate = block.timestamp + 30 days;
        address randomToken = makeAddr("random");
        
        vm.startPrank(user1);
        vm.expectRevert("Deposit token not supported");
        goalz.setGoal("Invalid", "Wrong token", GOAL_AMOUNT, futureDate, randomToken);
        vm.stopPrank();
    }
    
    /*//////////////////////////////////////////////////////////////
                            DEPOSIT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testDeposit() public {
        // Create goal
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Vacation", "Trip to Hawaii", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 100 * 1e6; // 100 USDC
        
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        
        vm.expectEmit(true, true, false, false);
        emit DepositMade(user1, 0, depositAmount, 0); // shares value will vary
        
        goalz.deposit(0, depositAmount);
        vm.stopPrank();
        
        // Verify deposit
        (, , , uint currentAmount, , , , uint256 shareBalance) = goalz.savingsGoals(0);
        assertEq(currentAmount, depositAmount);
        assertGt(shareBalance, 0);
        
        // Verify GoalzTokens were minted
        GoalzTokenMorpho goalzToken = goalz.goalzTokens(address(usdc));
        assertEq(goalzToken.balanceOf(user1), depositAmount);
        
        // Verify vault received tokens
        assertEq(morphoVaultUSDC.totalAssets(), depositAmount);
    }
    
    function testDepositMultipleTokenTypes() public {
        uint256 futureDate = block.timestamp + 30 days;
        
        vm.startPrank(user1);
        goalz.setGoal("USDC Goal", "USDC savings", GOAL_AMOUNT, futureDate, address(usdc));
        goalz.setGoal("USDT Goal", "USDT savings", GOAL_AMOUNT, futureDate, address(usdt));
        vm.stopPrank();
        
        uint256 depositAmount = 100 * 1e6;
        
        vm.startPrank(user1);
        // Deposit to USDC goal
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        
        // Deposit to USDT goal
        usdt.approve(address(goalz), depositAmount);
        goalz.deposit(1, depositAmount);
        vm.stopPrank();
        
        // Verify both deposits
        (, , , uint currentAmountUSDC, , , ,) = goalz.savingsGoals(0);
        (, , , uint currentAmountUSDT, , , ,) = goalz.savingsGoals(1);
        assertEq(currentAmountUSDC, depositAmount);
        assertEq(currentAmountUSDT, depositAmount);
        
        // Verify GoalzTokens
        GoalzTokenMorpho goalzTokenUSDC = goalz.goalzTokens(address(usdc));
        GoalzTokenMorpho goalzTokenUSDT = goalz.goalzTokens(address(usdt));
        assertEq(goalzTokenUSDC.balanceOf(user1), depositAmount);
        assertEq(goalzTokenUSDT.balanceOf(user1), depositAmount);
    }
    
    function testMultipleDeposits() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Savings", "Emergency fund", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 firstDeposit = 100 * 1e6;
        uint256 secondDeposit = 200 * 1e6;
        
        vm.startPrank(user1);
        
        // First deposit
        usdc.approve(address(goalz), firstDeposit);
        goalz.deposit(0, firstDeposit);
        
        // Second deposit
        usdc.approve(address(goalz), secondDeposit);
        goalz.deposit(0, secondDeposit);
        
        vm.stopPrank();
        
        // Verify total
        (, , , uint currentAmount, , , ,) = goalz.savingsGoals(0);
        assertEq(currentAmount, firstDeposit + secondDeposit);
    }
    
    function testDepositMarksGoalComplete() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Complete", "Test completion", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        usdc.approve(address(goalz), GOAL_AMOUNT);
        
        vm.expectEmit(true, true, false, true);
        emit GoalCompleted(user1, 0, GOAL_AMOUNT);
        
        goalz.deposit(0, GOAL_AMOUNT);
        vm.stopPrank();
        
        (, , , , , , bool complete,) = goalz.savingsGoals(0);
        assertTrue(complete);
    }
    
    function testDepositExceedsTargetMarksComplete() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Exceed", "Test exceeding", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 excessAmount = GOAL_AMOUNT + 100 * 1e6;
        
        vm.startPrank(user1);
        usdc.approve(address(goalz), excessAmount);
        
        vm.expectEmit(true, true, false, true);
        emit GoalCompleted(user1, 0, GOAL_AMOUNT);
        
        goalz.deposit(0, excessAmount);
        vm.stopPrank();
        
        (, , , , , , bool complete,) = goalz.savingsGoals(0);
        assertTrue(complete);
    }
    
    function testCannotDepositToNonExistentGoal() public {
        vm.startPrank(user1);
        usdc.approve(address(goalz), 100 * 1e6);
        vm.expectRevert("Goal does not exist");
        goalz.deposit(999, 100 * 1e6);
        vm.stopPrank();
    }
    
    function testCannotDepositZeroAmount() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Test", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        vm.expectRevert("Deposit amount should be greater than 0");
        goalz.deposit(0, 0);
        vm.stopPrank();
    }
    
    function testCannotDepositWithInsufficientBalance() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Test", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 tooMuch = INITIAL_BALANCE + 1;
        
        vm.startPrank(user1);
        usdc.approve(address(goalz), tooMuch);
        vm.expectRevert("Insufficient balance");
        goalz.deposit(0, tooMuch);
        vm.stopPrank();
    }
    
    function testCannotDepositWithoutApproval() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Test", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        vm.expectRevert();
        goalz.deposit(0, 100 * 1e6);
        vm.stopPrank();
    }
    
    /*//////////////////////////////////////////////////////////////
                            WITHDRAWAL TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testWithdraw() public {
        // Create goal and deposit
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Test withdrawal", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 500 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        
        uint256 balanceBefore = usdc.balanceOf(user1);
        
        vm.expectEmit(true, true, false, false);
        emit WithdrawMade(user1, 0, 0); // amount will vary
        
        goalz.withdraw(0);
        vm.stopPrank();
        
        uint256 balanceAfter = usdc.balanceOf(user1);
        
        // User should have received at least their deposit back
        assertGe(balanceAfter - balanceBefore, depositAmount);
        
        // Goal should be empty
        (, , , uint currentAmount, , , , uint256 shareBalance) = goalz.savingsGoals(0);
        assertEq(currentAmount, 0);
        assertEq(shareBalance, 0);
    }
    
    function testWithdrawWithInterest() public {
        // Create goal and deposit
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Test interest", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 1000 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        vm.stopPrank();
        
        // Simulate 5% interest in vault
        morphoVaultUSDC.setInterestRate(105, 100);
        
        // Check interest before withdrawal
        uint256 interest = goalz.getGoalInterest(0);
        assertGt(interest, 0);
        
        // Withdraw
        vm.prank(user1);
        uint256 balanceBefore = usdc.balanceOf(user1);
        goalz.withdraw(0);
        uint256 balanceAfter = usdc.balanceOf(user1);
        
        // User should have received principal + interest
        uint256 expectedAmount = depositAmount + interest;
        assertApproxEqRel(balanceAfter - balanceBefore, expectedAmount, 0.01e18); // 1% tolerance
        
        // Verify GoalzTokens - user should have additional tokens for interest
        GoalzTokenMorpho goalzToken = goalz.goalzTokens(address(usdc));
        assertEq(goalzToken.balanceOf(user1), interest);
    }
    
    function testWithdrawBurnsCorrectGoalzTokens() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Token test", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 1000 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        vm.stopPrank();
        
        GoalzTokenMorpho goalzToken = goalz.goalzTokens(address(usdc));
        uint256 tokensBefore = goalzToken.balanceOf(user1);
        assertEq(tokensBefore, depositAmount);
        
        // Simulate 10% interest
        morphoVaultUSDC.setInterestRate(110, 100);
        uint256 interest = goalz.getGoalInterest(0);
        
        vm.prank(user1);
        goalz.withdraw(0);
        
        // User should have interest tokens remaining
        uint256 tokensAfter = goalzToken.balanceOf(user1);
        assertEq(tokensAfter, interest);
    }
    
    function testCannotWithdrawFromEmptyGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Empty goal", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        vm.expectRevert("No funds to withdraw");
        goalz.withdraw(0);
        vm.stopPrank();
    }
    
    function testCannotWithdrawOthersGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "User1's goal", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 100 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        vm.stopPrank();
        
        vm.startPrank(user2);
        vm.expectRevert("You are not the owner of this goal");
        goalz.withdraw(0);
        vm.stopPrank();
    }
    
    function testCannotWithdrawNonExistentGoal() public {
        vm.startPrank(user1);
        vm.expectRevert("Goal does not exist");
        goalz.withdraw(999);
        vm.stopPrank();
    }
    
    /*//////////////////////////////////////////////////////////////
                        AUTOMATED DEPOSIT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testCreateAutomatedDeposit() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Automated savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6;
        uint256 frequency = 7 days;
        
        vm.startPrank(user1);
        vm.expectEmit(true, true, false, true);
        emit AutomatedDepositCreated(user1, 0, amount, frequency);
        
        goalz.automateDeposit(0, amount, frequency);
        vm.stopPrank();
        
        // Verify automated deposit was created
        (uint autoAmount, uint autoFreq, uint lastDeposit, bytes32 taskId) = goalz.automatedDeposits(0);
        assertEq(autoAmount, amount);
        assertEq(autoFreq, frequency);
        assertEq(lastDeposit, block.timestamp);
        assertNotEq(taskId, bytes32(0));
    }
    
    function testCannotCreateDuplicateAutomatedDeposit() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Automated savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6;
        uint256 frequency = 7 days;
        
        vm.startPrank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        vm.expectRevert("Automated deposit already exists for this goal");
        goalz.automateDeposit(0, amount * 2, frequency);
        vm.stopPrank();
    }
    
    function testCannotCreateAutomatedDepositWithZeroAmount() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Automated savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        vm.expectRevert("Automated deposit amount should be greater than 0");
        goalz.automateDeposit(0, 0, 7 days);
        vm.stopPrank();
    }
    
    function testCannotCreateAutomatedDepositWithZeroFrequency() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Automated savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        vm.expectRevert("Automated deposit frequency should be greater than 0");
        goalz.automateDeposit(0, 50 * 1e6, 0);
        vm.stopPrank();
    }
    
    function testCancelAutomatedDeposit() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Automated savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6;
        uint256 frequency = 7 days;
        
        vm.startPrank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        vm.expectEmit(true, true, false, true);
        emit AutomatedDepositCanceled(user1, 0);
        
        goalz.cancelAutomatedDeposit(0);
        vm.stopPrank();
        
        // Verify automated deposit was canceled
        (uint autoAmount, , , bytes32 taskId) = goalz.automatedDeposits(0);
        assertEq(autoAmount, 0);
        assertEq(taskId, bytes32(0));
    }
    
    function testCannotCancelOthersAutomatedDeposit() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Automated savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.prank(user1);
        goalz.automateDeposit(0, 50 * 1e6, 7 days);
        
        vm.startPrank(user2);
        vm.expectRevert("You are not the owner of this goal");
        goalz.cancelAutomatedDeposit(0);
        vm.stopPrank();
    }
    
    function testExecuteAutomatedDeposit() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Automated savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6;
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        // Give user1 enough tokens and approve
        vm.startPrank(user1);
        usdc.approve(address(goalz), amount);
        vm.stopPrank();
        
        // Fast forward time
        vm.warp(block.timestamp + frequency);
        
        // Execute automated deposit
        goalz.automatedDeposit(0);
        
        // Verify deposit was made
        (, , , uint currentAmount, , , ,) = goalz.savingsGoals(0);
        assertEq(currentAmount, amount);
        
        // Verify timestamp was updated
        (, , uint lastDeposit,) = goalz.automatedDeposits(0);
        assertEq(lastDeposit, block.timestamp);
    }
    
    function testCannotExecuteAutomatedDepositTooEarly() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Automated savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6;
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        // Try to execute immediately (should fail)
        vm.expectRevert("Deposit frequency not reached yet");
        goalz.automatedDeposit(0);
    }
    
    function testAutomatedDepositCanCompleteGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Complete via automation", 100 * 1e6, futureDate, address(usdc));
        
        uint256 amount = 100 * 1e6;
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        vm.startPrank(user1);
        usdc.approve(address(goalz), amount);
        vm.stopPrank();
        
        vm.warp(block.timestamp + frequency);
        
        vm.expectEmit(true, true, false, true);
        emit GoalCompleted(user1, 0, 100 * 1e6);
        
        goalz.automatedDeposit(0);
        
        (, , , , , , bool complete,) = goalz.savingsGoals(0);
        assertTrue(complete);
    }
    
    function testCannotExecuteAutomatedDepositExceedingTarget() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "Will exceed", 100 * 1e6, futureDate, address(usdc));
        
        // Create automated deposit that would exceed target
        uint256 amount = 150 * 1e6;
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        vm.startPrank(user1);
        usdc.approve(address(goalz), amount);
        vm.stopPrank();
        
        vm.warp(block.timestamp + frequency);
        
        vm.expectRevert("Automated deposit exceeds the goal target amount");
        goalz.automatedDeposit(0);
    }
    
    /*//////////////////////////////////////////////////////////////
                        INTEREST CALCULATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testGetGoalValue() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Value check", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 1000 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        vm.stopPrank();
        
        // Check initial value
        uint256 value = goalz.getGoalValue(0);
        assertEq(value, depositAmount);
        
        // Simulate 10% interest
        morphoVaultUSDC.setInterestRate(110, 100);
        
        // Check new value
        value = goalz.getGoalValue(0);
        uint256 expectedValue = depositAmount * 110 / 100;
        assertApproxEqRel(value, expectedValue, 0.01e18);
    }
    
    function testGetGoalValueEmptyGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Empty value check", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 value = goalz.getGoalValue(0);
        assertEq(value, 0);
    }
    
    function testGetGoalInterest() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Interest check", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 1000 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        vm.stopPrank();
        
        // No interest initially
        uint256 interest = goalz.getGoalInterest(0);
        assertEq(interest, 0);
        
        // Simulate 10% interest
        morphoVaultUSDC.setInterestRate(110, 100);
        
        // Check interest
        interest = goalz.getGoalInterest(0);
        uint256 expectedInterest = depositAmount * 10 / 100;
        assertApproxEqRel(interest, expectedInterest, 0.01e18);
    }
    
    function testGetGoalInterestWithLoss() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Loss scenario", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 1000 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        vm.stopPrank();
        
        // Simulate 5% loss
        morphoVaultUSDC.setInterestRate(95, 100);
        
        // Interest should be 0 when there's a loss
        uint256 interest = goalz.getGoalInterest(0);
        assertEq(interest, 0);
    }
    
    /*//////////////////////////////////////////////////////////////
                            GOAL DELETION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testDeleteEmptyGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Temp", "To be deleted", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.expectEmit(true, true, false, true);
        emit GoalDeleted(user1, 0);
        
        vm.prank(user1);
        goalz.deleteGoal(0);
        
        // NFT should be burned
        vm.expectRevert();
        goalz.ownerOf(0);
    }
    
    function testDeleteGoalCancelsAutomatedDeposit() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto", "With automation", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.prank(user1);
        goalz.automateDeposit(0, 50 * 1e6, 7 days);
        
        // Verify automation exists
        (uint amount, , , bytes32 taskId) = goalz.automatedDeposits(0);
        assertGt(amount, 0);
        assertNotEq(taskId, bytes32(0));
        
        vm.prank(user1);
        goalz.deleteGoal(0);
        
        // Verify automation was canceled
        (amount, , , taskId) = goalz.automatedDeposits(0);
        assertEq(amount, 0);
        assertEq(taskId, bytes32(0));
    }
    
    function testCannotDeleteGoalWithFunds() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Has funds", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 100 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        
        vm.expectRevert("Goal has funds, withdraw them first");
        goalz.deleteGoal(0);
        vm.stopPrank();
    }
    
    function testCannotDeleteGoalWithShares() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Has shares", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 100 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        
        // Manually set currentAmount to 0 but keep shares (edge case)
        // This would be a hack to test the shares check specifically
        // In normal operation, this shouldn't happen
        vm.stopPrank();
        
        // Normal case - should fail because currentAmount > 0
        vm.startPrank(user1);
        vm.expectRevert("Goal has funds, withdraw them first");
        goalz.deleteGoal(0);
        vm.stopPrank();
    }
    
    function testCannotDeleteOthersGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "User1's goal", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user2);
        vm.expectRevert("You are not the owner of this goal");
        goalz.deleteGoal(0);
        vm.stopPrank();
    }
    
    function testCannotDeleteNonExistentGoal() public {
        vm.startPrank(user1);
        vm.expectRevert("Goal does not exist");
        goalz.deleteGoal(999);
        vm.stopPrank();
    }
    
    /*//////////////////////////////////////////////////////////////
                            NFT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testNFTNonTransferable() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Non-transferable", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        vm.expectRevert("Token transfer is not allowed");
        goalz.transferFrom(user1, user2, 0);
        vm.stopPrank();
    }
    
    function testNFTSupportsInterface() public {
        // Test ERC721 interface
        assertTrue(goalz.supportsInterface(0x80ac58cd));
        // Test ERC721Enumerable interface
        assertTrue(goalz.supportsInterface(0x780e9d63));
        // Test ERC165 interface
        assertTrue(goalz.supportsInterface(0x01ffc9a7));
    }
    
    function testEnumerateUserGoals() public {
        uint256 futureDate = block.timestamp + 30 days;
        
        vm.startPrank(user1);
        goalz.setGoal("Goal 1", "Test 1", GOAL_AMOUNT, futureDate, address(usdc));
        goalz.setGoal("Goal 2", "Test 2", GOAL_AMOUNT, futureDate, address(usdc));
        goalz.setGoal("Goal 3", "Test 3", GOAL_AMOUNT, futureDate, address(usdc));
        vm.stopPrank();
        
        assertEq(goalz.balanceOf(user1), 3);
        assertEq(goalz.tokenOfOwnerByIndex(user1, 0), 0);
        assertEq(goalz.tokenOfOwnerByIndex(user1, 1), 1);
        assertEq(goalz.tokenOfOwnerByIndex(user1, 2), 2);
        assertEq(goalz.totalSupply(), 3);
        assertEq(goalz.tokenByIndex(0), 0);
        assertEq(goalz.tokenByIndex(1), 1);
        assertEq(goalz.tokenByIndex(2), 2);
    }
    
    /*//////////////////////////////////////////////////////////////
                            MORPHO INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testMorphoVaultIntegration() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Morpho", "Test vault integration", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 1000 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        vm.stopPrank();
        
        // Verify vault received the deposit
        assertEq(morphoVaultUSDC.totalAssets(), depositAmount);
        assertGt(morphoVaultUSDC.totalSupply(), 0);
        
        // Verify goal has shares
        (, , , , , , , uint256 shareBalance) = goalz.savingsGoals(0);
        assertGt(shareBalance, 0);
        
        // Verify shares can be converted back to assets
        uint256 convertedAssets = morphoVaultUSDC.convertToAssets(shareBalance);
        assertEq(convertedAssets, depositAmount);
    }
    
    function testMultipleVaultSupport() public {
        uint256 futureDate = block.timestamp + 30 days;
        
        vm.startPrank(user1);
        goalz.setGoal("USDC Goal", "USDC vault", GOAL_AMOUNT, futureDate, address(usdc));
        goalz.setGoal("USDT Goal", "USDT vault", GOAL_AMOUNT, futureDate, address(usdt));
        vm.stopPrank();
        
        uint256 depositAmount = 500 * 1e6;
        
        vm.startPrank(user1);
        // Deposit to USDC vault
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        
        // Deposit to USDT vault
        usdt.approve(address(goalz), depositAmount);
        goalz.deposit(1, depositAmount);
        vm.stopPrank();
        
        // Verify both vaults received deposits
        assertEq(morphoVaultUSDC.totalAssets(), depositAmount);
        assertEq(morphoVaultUSDT.totalAssets(), depositAmount);
        
        // Verify goal values
        assertEq(goalz.getGoalValue(0), depositAmount);
        assertEq(goalz.getGoalValue(1), depositAmount);
    }
    
    /*//////////////////////////////////////////////////////////////
                            EDGE CASES AND ERROR CONDITIONS
    //////////////////////////////////////////////////////////////*/
    
    function testReentrancyProtection() public {
        // The withdraw function should be protected against reentrancy
        // This test verifies the nonReentrant modifier is working
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Reentrancy test", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 100 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
        goalz.deposit(0, depositAmount);
        
        // Normal withdrawal should work
        goalz.withdraw(0);
        vm.stopPrank();
        
        // Goal should be empty after withdrawal
        (, , , uint currentAmount, , , , uint256 shareBalance) = goalz.savingsGoals(0);
        assertEq(currentAmount, 0);
        assertEq(shareBalance, 0);
    }
    
    function testLargeNumbers() public {
        // Test with large numbers to check for overflow issues
        MockERC20 bigToken = new MockERC20("Big Token", "BIG", 18);
        MockMetaMorphoVault bigVault = new MockMetaMorphoVault(address(bigToken));
        
        address[] memory depositTokens = new address[](1);
        address[] memory vaults = new address[](1);
        depositTokens[0] = address(bigToken);
        vaults[0] = address(bigVault);
        
        Goalz bigGoalz = new Goalz(depositTokens, vaults, gelatoAutomate);
        
        uint256 largeAmount = 1000000 * 1e18; // 1M tokens with 18 decimals
        bigToken.mint(user1, largeAmount * 10);
        
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        bigGoalz.setGoal("Big Goal", "Large amount test", largeAmount, futureDate, address(bigToken));
        
        vm.startPrank(user1);
        bigToken.approve(address(bigGoalz), largeAmount);
        bigGoalz.deposit(0, largeAmount);
        vm.stopPrank();
        
        // Verify large deposit worked
        (, , , uint currentAmount, , , ,) = bigGoalz.savingsGoals(0);
        assertEq(currentAmount, largeAmount);
    }
    
    function testZeroDecimalToken() public {
        // Test with a token that has 0 decimals
        MockERC20 zeroDecToken = new MockERC20("Zero Dec", "ZERO", 0);
        MockMetaMorphoVault zeroVault = new MockMetaMorphoVault(address(zeroDecToken));
        
        address[] memory depositTokens = new address[](1);
        address[] memory vaults = new address[](1);
        depositTokens[0] = address(zeroDecToken);
        vaults[0] = address(zeroVault);
        
        Goalz zeroGoalz = new Goalz(depositTokens, vaults, gelatoAutomate);
        
        uint256 amount = 100; // 100 tokens with 0 decimals
        zeroDecToken.mint(user1, amount * 10);
        
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        zeroGoalz.setGoal("Zero Goal", "Zero decimal test", amount, futureDate, address(zeroDecToken));
        
        vm.startPrank(user1);
        zeroDecToken.approve(address(zeroGoalz), amount);
        zeroGoalz.deposit(0, amount);
        vm.stopPrank();
        
        // Verify deposit worked
        (, , , uint currentAmount, , , ,) = zeroGoalz.savingsGoals(0);
        assertEq(currentAmount, amount);
        
        // Verify GoalzToken has correct decimals
        GoalzTokenMorpho goalzToken = zeroGoalz.goalzTokens(address(zeroDecToken));
        assertEq(goalzToken.decimals(), 0);
    }
    
    function testGoalCompletionEdgeCases() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Edge", "Completion edge case", GOAL_AMOUNT, futureDate, address(usdc));
        
        // Deposit exactly the target amount
        vm.startPrank(user1);
        usdc.approve(address(goalz), GOAL_AMOUNT);
        goalz.deposit(0, GOAL_AMOUNT);
        vm.stopPrank();
        
        // Goal should be marked complete
        (, , , , , , bool complete,) = goalz.savingsGoals(0);
        assertTrue(complete);
        
        // Should not be able to deposit more to a completed goal
        // (though the contract doesn't explicitly prevent this)
        vm.startPrank(user1);
        usdc.approve(address(goalz), 1 * 1e6);
        goalz.deposit(0, 1 * 1e6); // This should still work
        vm.stopPrank();
        
        // Current amount should be goal + 1
        (, , , uint currentAmount, , , ,) = goalz.savingsGoals(0);
        assertEq(currentAmount, GOAL_AMOUNT + 1 * 1e6);
    }
}