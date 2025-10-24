// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/GoalzSimple.sol";
import "../src/GoalzTokenMorpho.sol";
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockMetaMorphoVault.sol";

contract GoalzSimpleTest is Test {
    GoalzSimple public goalz;
    MockERC20 public usdc;
    MockMetaMorphoVault public morphoVault;
    
    address public user1;
    address public user2;
    
    uint256 constant INITIAL_BALANCE = 10000 * 1e6; // 10k USDC
    uint256 constant GOAL_AMOUNT = 1000 * 1e6; // 1k USDC
    
    function setUp() public {
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Deploy mock USDC and vault
        usdc = new MockERC20("USD Coin", "USDC", 6);
        morphoVault = new MockMetaMorphoVault(address(usdc));
        
        // Mint tokens to users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        
        // Deploy Goalz contract
        address[] memory depositTokens = new address[](1);
        address[] memory vaults = new address[](1);
        depositTokens[0] = address(usdc);
        vaults[0] = address(morphoVault);
        
        goalz = new GoalzSimple(depositTokens, vaults);
    }
    
    function testDeployment() public {
        // Check GoalzToken was created
        address goalzTokenAddress = address(goalz.goalzTokens(address(usdc)));
        assertTrue(goalzTokenAddress != address(0), "GoalzToken not created");
        
        // Check vault mapping
        address vaultAddress = address(goalz.morphoVaults(address(usdc)));
        assertEq(vaultAddress, address(morphoVault), "Vault not mapped correctly");
    }
    
    function testCreateGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        
        vm.prank(user1);
        goalz.setGoal(
            "Buy a car",
            "Need reliable transportation",
            GOAL_AMOUNT,
            futureDate,
            address(usdc)
        );
        
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
    
    function testDeposit() public {
        // Create goal
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Vacation", "Trip to Hawaii", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 depositAmount = 100 * 1e6; // 100 USDC
        
        vm.startPrank(user1);
        usdc.approve(address(goalz), depositAmount);
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
        assertEq(morphoVault.totalAssets(), depositAmount);
    }
    
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
        morphoVault.setInterestRate(105, 100);
        // Mint additional tokens to vault to simulate earned interest
        uint256 expectedInterest = depositAmount * 5 / 100;
        usdc.mint(address(morphoVault), expectedInterest);
        
        // Check interest before withdrawal
        uint256 interest = goalz.getGoalInterest(0);
        assertGt(interest, 0);
        
        // Withdraw
        vm.startPrank(user1);
        uint256 balanceBefore = usdc.balanceOf(user1);
        goalz.withdraw(0);
        uint256 balanceAfter = usdc.balanceOf(user1);
        vm.stopPrank();
        
        // User should have received principal + interest
        uint256 expectedAmount = depositAmount + interest;
        assertApproxEqRel(balanceAfter - balanceBefore, expectedAmount, 0.01e18); // 1% tolerance
        
        // Verify GoalzTokens - user should have additional tokens for interest
        GoalzTokenMorpho goalzToken = goalz.goalzTokens(address(usdc));
        assertEq(goalzToken.balanceOf(user1), interest);
    }
    
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
        morphoVault.setInterestRate(110, 100);
        
        // Check new value
        value = goalz.getGoalValue(0);
        uint256 expectedValue = depositAmount * 110 / 100;
        assertApproxEqRel(value, expectedValue, 0.01e18);
    }
    
    function testGoalCompletion() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Complete", "Test completion", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        usdc.approve(address(goalz), GOAL_AMOUNT);
        goalz.deposit(0, GOAL_AMOUNT);
        vm.stopPrank();
        
        (, , , , , , bool complete,) = goalz.savingsGoals(0);
        assertTrue(complete);
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
    
    function testCannotWithdrawFromEmptyGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Empty goal", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        vm.expectRevert("No funds to withdraw");
        goalz.withdraw(0);
        vm.stopPrank();
    }
    
    function testNFTNonTransferable() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Non-transferable", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.startPrank(user1);
        vm.expectRevert("Token transfer is not allowed");
        goalz.transferFrom(user1, user2, 0);
        vm.stopPrank();
    }
    
    function testDeleteEmptyGoal() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Temp", "To be deleted", GOAL_AMOUNT, futureDate, address(usdc));
        
        vm.prank(user1);
        goalz.deleteGoal(0);
        
        // NFT should be burned
        vm.expectRevert();
        goalz.ownerOf(0);
    }
}