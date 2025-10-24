// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { IMetaMorpho } from "./interfaces/IMetaMorpho.sol";
import "./GoalzTokenMorpho.sol";
import "./gelato/AutomateTaskCreator.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract Goalz is ERC721, ERC721Enumerable, AutomateTaskCreator, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 private _tokenIdCounter;

    struct SavingsGoal {
        string what;
        string why;
        uint targetAmount;
        uint currentAmount;
        uint targetDate;
        address depositToken;
        bool complete;
        uint256 shareBalance; // Morpho vault shares owned by this goal
    }

    struct AutomatedDeposit {
        uint amount;
        uint frequency;
        uint lastDeposit;
        bytes32 gelatoTaskId;
    }

    uint256 constant CHECK_DURATION = 10 minutes * 1000; // 10 min as milliseconds
    
    // Mapping from deposit token to its Morpho vault
    mapping(address => IMetaMorpho) public morphoVaults;
    
    // Mapping from deposit token to GoalzToken
    mapping(address => GoalzTokenMorpho) public goalzTokens;
    
    mapping(uint => SavingsGoal) public savingsGoals;
    mapping(uint => AutomatedDeposit) public automatedDeposits;

    event GoalCreated(address indexed saver, uint indexed goalId, string what, string why, uint targetAmount, uint targetDate, address depositToken);
    event GoalDeleted(address indexed saver, uint indexed goalId);
    event GoalzTokenCreated(address indexed depositToken, address indexed goalzToken);
    event DepositMade(address indexed saver, uint indexed goalId, uint amount, uint256 shares);
    event WithdrawMade(address indexed saver, uint indexed goalId, uint amount);
    event AutomatedDepositCreated(address indexed saver, uint indexed goalId, uint amount, uint frequency);
    event AutomatedDepositCanceled(address indexed saver, uint indexed goalId);
    event GoalCompleted(address indexed saver, uint indexed goalId, uint targetAmount);

    constructor(
        address[] memory _initialDepositTokens, 
        address[] memory _initialMorphoVaults, 
        address _automate
    ) 
        ERC721("Goalz", "GOALZ") 
        AutomateTaskCreator(_automate) 
    {
        require(_initialDepositTokens.length == _initialMorphoVaults.length, "Deposit tokens and vaults should be the same length");
        for (uint i = 0; i < _initialDepositTokens.length; i++) {
            _addDepositToken(_initialDepositTokens[i], _initialMorphoVaults[i]);
        }
    }

    function _addDepositToken(address _depositToken, address _morphoVault) internal {
        ERC20 _token = ERC20(_depositToken);
        IMetaMorpho vault = IMetaMorpho(_morphoVault);
        
        // Store the Morpho vault mapping
        morphoVaults[_depositToken] = vault;
        
        // Verify the vault's asset matches the deposit token
        require(vault.asset() == _depositToken, "Vault asset mismatch");
        
        GoalzTokenMorpho _goalzToken = new GoalzTokenMorpho(
            string.concat("Goalz ", _token.name()), 
            string.concat("glz", _token.symbol()),
            _depositToken,
            _morphoVault
        );
        goalzTokens[_depositToken] = _goalzToken;
        emit GoalzTokenCreated(_depositToken, address(_goalzToken));
    }

    modifier goalExists(uint goalId) {
        require(goalId < _tokenIdCounter, "Goal does not exist");
        _;
    }

    modifier isGoalOwner(uint goalId) {
        require(msg.sender == ownerOf(goalId), "You are not the owner of this goal");
        _;
    }

    /// @dev Override to activate ERC721Enumerable functionality
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function setGoal(
        string memory what, 
        string memory why, 
        uint targetAmount, 
        uint targetDate,
        address depositToken
    ) external {
        require(targetAmount > 0, "Target amount should be greater than 0");
        require(targetDate > block.timestamp, "Target date should be in the future");
        require(address(goalzTokens[depositToken]) != address(0), "Deposit token not supported");
        require(address(morphoVaults[depositToken]) != address(0), "Morpho vault not found");

        uint goalId = _tokenIdCounter;
        savingsGoals[goalId] = SavingsGoal(what, why, targetAmount, 0, targetDate, depositToken, false, 0);
        _mint(msg.sender, goalId);
        _tokenIdCounter++;

        emit GoalCreated(msg.sender, goalId, what, why, targetAmount, targetDate, depositToken);
    }

    function deleteGoal(uint goalId) external goalExists(goalId) isGoalOwner(goalId) {
        require(savingsGoals[goalId].currentAmount == 0, "Goal has funds, withdraw them first");
        require(savingsGoals[goalId].shareBalance == 0, "Goal has shares, withdraw them first");
        delete savingsGoals[goalId];
        _cancelAutomatedDeposit(goalId);
        _burn(goalId);
        
        emit GoalDeleted(msg.sender, goalId);
    }

    function deposit(uint goalId, uint amount) external goalExists(goalId) {
        require(amount > 0, "Deposit amount should be greater than 0");
        require(msg.sender != address(0), "Invalid sender address");

        SavingsGoal storage goal = savingsGoals[goalId];
        require(goal.depositToken != address(0), "Invalid deposit token");

        // Get current value including interest
        uint256 currentValue = _getGoalValue(goalId);
        
        if(currentValue + amount >= goal.targetAmount) {
            goal.complete = true;
            emit GoalCompleted(msg.sender, goalId, goal.targetAmount);
        }

        _deposit(msg.sender, goal, amount);
    }

    function withdraw(uint goalId) public goalExists(goalId) isGoalOwner(goalId) nonReentrant {
        SavingsGoal storage goal = savingsGoals[goalId];
        require(goal.shareBalance > 0, "No funds to withdraw");
        require(goal.depositToken != address(0), "Invalid deposit token");
        
        address depositToken = goal.depositToken;
        GoalzTokenMorpho goalzToken = goalzTokens[depositToken];
        IMetaMorpho vault = morphoVaults[depositToken];

        // Calculate current value of shares (includes earned interest)
        uint256 sharesToWithdraw = goal.shareBalance;
        uint256 assetsToWithdraw = vault.convertToAssets(sharesToWithdraw);
        
        // Calculate interest earned
        uint256 interest = assetsToWithdraw > goal.currentAmount ? assetsToWithdraw - goal.currentAmount : 0;
        
        // Mint GoalzTokens for interest earned
        if (interest > 0) {
            goalzToken.mint(msg.sender, interest);
        }
        
        // Burn GoalzTokens for principal
        goalzToken.burn(msg.sender, goal.currentAmount);
        
        // Withdraw from Morpho vault
        _withdrawFromMorpho(depositToken, assetsToWithdraw);
        
        // Transfer assets to user
        IERC20(depositToken).safeTransfer(msg.sender, assetsToWithdraw);
        
        // Reset goal balances
        goal.currentAmount = 0;
        goal.shareBalance = 0;

        emit WithdrawMade(msg.sender, goalId, assetsToWithdraw);
    }

    function automateDeposit(uint goalId, uint amount, uint frequency) external goalExists(goalId) {
        require(amount > 0, "Automated deposit amount should be greater than 0");
        require(frequency > 0, "Automated deposit frequency should be greater than 0");
        require(automatedDeposits[goalId].amount == 0, "Automated deposit already exists for this goal");

        AutomatedDeposit storage autoDeposit = automatedDeposits[goalId];
        autoDeposit.amount = amount;
        autoDeposit.frequency = frequency;
        autoDeposit.lastDeposit = block.timestamp; 

        bytes memory execData = abi.encodeWithSelector(this.automatedDeposit.selector, goalId);
        ModuleData memory moduleData = ModuleData({
            modules: new Module[](2), 
            args: new bytes[](2) 
        });

        moduleData.modules[0] = Module.PROXY;
        moduleData.modules[1] = Module.TRIGGER;
        moduleData.args[0] = _proxyModuleArg();
        moduleData.args[1] = _timeTriggerModuleArg(uint128(block.timestamp), uint128(CHECK_DURATION));

        bytes32 taskId = _createTask(
            address(this),
            execData,
            moduleData,
            address(0)
        );

        autoDeposit.gelatoTaskId = taskId;

        emit AutomatedDepositCreated(msg.sender, goalId, amount, frequency);
    }

    function cancelAutomatedDeposit(uint goalId) external goalExists(goalId) isGoalOwner(goalId) {
        _cancelAutomatedDeposit(goalId);
    }

    function _cancelAutomatedDeposit(uint goalId) internal {
        AutomatedDeposit memory autoDeposit = automatedDeposits[goalId];
        if (autoDeposit.gelatoTaskId != bytes32(0)) {
            _cancelTask(autoDeposit.gelatoTaskId);
            delete automatedDeposits[goalId];
            emit AutomatedDepositCanceled(msg.sender, goalId);
        }
    }

    function automatedDeposit(uint goalId) external goalExists(goalId) {
        AutomatedDeposit storage _automatedDeposit = automatedDeposits[goalId];
        uint amount = _automatedDeposit.amount;
        require(amount > 0, "No automated deposit for this goal");
        require(block.timestamp >= _automatedDeposit.lastDeposit + _automatedDeposit.frequency, "Deposit frequency not reached yet");

        SavingsGoal storage goal = savingsGoals[goalId];
        
        // Get current value including interest
        uint256 currentValue = _getGoalValue(goalId);
        require(currentValue + amount <= goal.targetAmount, "Automated deposit exceeds the goal target amount");

        _deposit(ownerOf(goalId), goal, amount);

        if(currentValue + amount >= goal.targetAmount) {
            goal.complete = true;
            emit GoalCompleted(ownerOf(goalId), goalId, goal.targetAmount);
        }

        _automatedDeposit.lastDeposit = block.timestamp;

        emit DepositMade(ownerOf(goalId), goalId, amount, goal.shareBalance);
    }

    function _deposit(address account, SavingsGoal storage goal, uint amount) internal nonReentrant {
        address _depositToken = goal.depositToken;
        require(_depositToken != address(0), "Invalid deposit token");
        require(account != address(0), "Invalid account address");
        require(amount > 0, "Deposit amount should be greater than 0");
        require(IERC20(_depositToken).balanceOf(account) >= amount, "Insufficient balance");

        GoalzTokenMorpho goalzToken = goalzTokens[_depositToken];

        // Transfer tokens from user
        IERC20(_depositToken).safeTransferFrom(account, address(this), amount);
        
        // Deposit to Morpho and get shares
        uint256 shares = _depositToMorpho(_depositToken, amount);
        
        // Mint GoalzTokens to user
        goalzToken.mint(account, amount);
        
        // Update goal balances
        goal.currentAmount += amount;
        goal.shareBalance += shares;

        emit DepositMade(account, _getGoalId(goal), amount, shares);
    }

    function _depositToMorpho(address token, uint amount) internal returns (uint256 shares) {
        IMetaMorpho vault = morphoVaults[token];
        require(address(vault) != address(0), "Morpho vault not found");
        
        IERC20(token).approve(address(vault), amount);
        // Deposit to Morpho vault - shares are minted to this contract
        shares = vault.deposit(amount, address(this));
    }

    function _withdrawFromMorpho(address token, uint amount) internal {
        IMetaMorpho vault = morphoVaults[token];
        require(address(vault) != address(0), "Morpho vault not found");
        
        // Withdraw from Morpho vault - need to convert amount to shares
        // Using withdraw instead of redeem to specify exact asset amount
        vault.withdraw(amount, address(this), address(this));
    }

    /// @notice Get the current value of a goal including accrued interest
    /// @param goalId The ID of the goal
    /// @return The current value in underlying assets
    function _getGoalValue(uint goalId) internal view returns (uint256) {
        SavingsGoal storage goal = savingsGoals[goalId];
        if (goal.shareBalance == 0) {
            return 0;
        }
        
        IMetaMorpho vault = morphoVaults[goal.depositToken];
        return vault.convertToAssets(goal.shareBalance);
    }

    /// @notice Public function to get the current value of a goal
    /// @param goalId The ID of the goal
    /// @return The current value in underlying assets
    function getGoalValue(uint goalId) external view goalExists(goalId) returns (uint256) {
        return _getGoalValue(goalId);
    }

    /// @notice Get the interest earned on a goal
    /// @param goalId The ID of the goal
    /// @return The interest earned
    function getGoalInterest(uint goalId) external view goalExists(goalId) returns (uint256) {
        SavingsGoal storage goal = savingsGoals[goalId];
        uint256 currentValue = _getGoalValue(goalId);
        return currentValue > goal.currentAmount ? currentValue - goal.currentAmount : 0;
    }

    /// @notice Helper function to get goal ID from storage reference
    function _getGoalId(SavingsGoal storage goal) internal view returns (uint) {
        // This is a workaround to get the goal ID from storage
        // In practice, you might want to pass the goalId directly
        for (uint i = 0; i < _tokenIdCounter; i++) {
            if (keccak256(abi.encode(savingsGoals[i])) == keccak256(abi.encode(goal))) {
                return i;
            }
        }
        revert("Goal ID not found");
    }

    /// @notice Disable transfers of tokens except for minting and burning
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Token transfer is not allowed");
        }
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

}
