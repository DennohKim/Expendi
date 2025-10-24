// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/Goalz_Morpho.sol";
import "../src/GoalzTokenMorpho.sol";
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockMetaMorphoVault.sol";

// Mock Gelato Automate contract
contract MockAutomate {
    mapping(bytes32 => bool) public tasks;
    uint256 private taskCounter;
    
    function createTask(
        address,
        bytes calldata,
        ModuleData calldata,
        address
    ) external returns (bytes32 taskId) {
        taskId = keccak256(abi.encode(++taskCounter, block.timestamp));
        tasks[taskId] = true;
        return taskId;
    }
    
    function cancelTask(bytes32 taskId) external {
        tasks[taskId] = false;
    }
    
    function getFeeDetails() external pure returns (uint256, address) {
        return (0, address(0));
    }
    
    function gelato() external pure returns (address payable) {
        return payable(address(0));
    }
    
    function taskModuleAddresses(Module) external pure returns (address) {
        return address(0);
    }
}

contract GoalzAutomationTest is Test {
    Goalz public goalz;
    MockERC20 public usdc;
    MockMetaMorphoVault public morphoVault;
    MockAutomate public mockAutomate;
    
    address public user1;
    address public gelatoExecutor;
    
    uint256 constant INITIAL_BALANCE = 10000 * 1e6;
    uint256 constant GOAL_AMOUNT = 1000 * 1e6;
    
    function setUp() public {
        user1 = makeAddr("user1");
        gelatoExecutor = makeAddr("gelato");
        
        // Deploy mocks
        usdc = new MockERC20("USD Coin", "USDC", 6);
        morphoVault = new MockMetaMorphoVault(address(usdc));
        mockAutomate = new MockAutomate();
        
        // Mint tokens
        usdc.mint(user1, INITIAL_BALANCE);
        
        // Deploy Goalz with mock automate
        address[] memory depositTokens = new address[](1);
        address[] memory vaults = new address[](1);
        depositTokens[0] = address(usdc);
        vaults[0] = address(morphoVault);
        
        goalz = new Goalz(depositTokens, vaults, address(mockAutomate));
    }
    
    function testCreateAutomatedDeposit() public {
        // Create goal first
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto Savings", "Weekly savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6; // 50 USDC
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        // Verify automation was set up
        (uint autoAmount, uint autoFreq, uint lastDeposit, bytes32 taskId) = goalz.automatedDeposits(0);
        assertEq(autoAmount, amount);
        assertEq(autoFreq, frequency);
        assertEq(lastDeposit, block.timestamp);
        assertNotEq(taskId, bytes32(0));
        
        // Verify task was created in mock Gelato
        assertTrue(mockAutomate.tasks(taskId));
    }
    
    function testExecuteAutomatedDeposit() public {
        // Setup automation
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto Savings", "Weekly savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6;
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        // Approve tokens for automation
        vm.prank(user1);
        usdc.approve(address(goalz), amount);
        
        // Fast forward time to after frequency period
        vm.warp(block.timestamp + frequency);
        
        // Simulate Gelato calling the automated deposit
        goalz.automatedDeposit(0);
        
        // Verify deposit was made
        (, , , uint currentAmount, , , ,) = goalz.savingsGoals(0);
        assertEq(currentAmount, amount);
        
        // Verify timestamp was updated
        (, , uint lastDeposit,) = goalz.automatedDeposits(0);
        assertEq(lastDeposit, block.timestamp);
        
        // Verify GoalzTokens were minted
        GoalzTokenMorpho goalzToken = goalz.goalzTokens(address(usdc));
        assertEq(goalzToken.balanceOf(user1), amount);
    }
    
    function testCannotExecuteAutomatedDepositTooEarly() public {
        // Setup automation
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto Savings", "Weekly savings", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6;
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        // Try to execute immediately (should fail)
        vm.expectRevert("Deposit frequency not reached yet");
        goalz.automatedDeposit(0);
    }
    
    function testAutomatedDepositStopsAtTarget() public {
        // Create small goal for easy completion
        uint256 futureDate = block.timestamp + 30 days;
        uint256 smallGoal = 100 * 1e6;
        vm.prank(user1);
        goalz.setGoal("Small Goal", "Quick completion", smallGoal, futureDate, address(usdc));
        
        uint256 amount = 150 * 1e6; // More than target
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        vm.prank(user1);
        usdc.approve(address(goalz), amount);
        
        vm.warp(block.timestamp + frequency);
        
        // Should fail because deposit would exceed target
        vm.expectRevert("Automated deposit exceeds the goal target amount");
        goalz.automatedDeposit(0);
    }
    
    function testCancelAutomatedDeposit() public {
        // Setup automation
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Auto Savings", "To be canceled", GOAL_AMOUNT, futureDate, address(usdc));
        
        uint256 amount = 50 * 1e6;
        uint256 frequency = 7 days;
        
        vm.prank(user1);
        goalz.automateDeposit(0, amount, frequency);
        
        // Get task ID
        (, , , bytes32 taskId) = goalz.automatedDeposits(0);
        assertTrue(mockAutomate.tasks(taskId));
        
        // Cancel automation
        vm.prank(user1);
        goalz.cancelAutomatedDeposit(0);
        
        // Verify automation was canceled
        (uint autoAmount, , , bytes32 newTaskId) = goalz.automatedDeposits(0);
        assertEq(autoAmount, 0);
        assertEq(newTaskId, bytes32(0));
        
        // Verify task was canceled in Gelato
        assertFalse(mockAutomate.tasks(taskId));
    }
    
    function testAutomationValidations() public {
        uint256 futureDate = block.timestamp + 30 days;
        vm.prank(user1);
        goalz.setGoal("Test", "Validation tests", GOAL_AMOUNT, futureDate, address(usdc));
        
        // Test zero amount
        vm.startPrank(user1);
        vm.expectRevert("Automated deposit amount should be greater than 0");
        goalz.automateDeposit(0, 0, 7 days);
        
        // Test zero frequency
        vm.expectRevert("Automated deposit frequency should be greater than 0");
        goalz.automateDeposit(0, 50 * 1e6, 0);
        
        // Create valid automation
        goalz.automateDeposit(0, 50 * 1e6, 7 days);
        
        // Test duplicate automation
        vm.expectRevert("Automated deposit already exists for this goal");
        goalz.automateDeposit(0, 100 * 1e6, 14 days);
        
        vm.stopPrank();
    }
}