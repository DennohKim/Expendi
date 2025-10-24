// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { IMetaMorpho } from "./interfaces/IMetaMorpho.sol";
import "./GoalzTokenMorpho.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract GoalzSimple is ERC721, ERC721Enumerable, ReentrancyGuard {
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
        uint256 shareBalance;
    }

    mapping(address => IMetaMorpho) public morphoVaults;
    mapping(address => GoalzTokenMorpho) public goalzTokens;
    mapping(uint => SavingsGoal) public savingsGoals;

    event GoalCreated(address indexed saver, uint indexed goalId, string what, string why, uint targetAmount, uint targetDate, address depositToken);
    event GoalDeleted(address indexed saver, uint indexed goalId);
    event GoalzTokenCreated(address indexed depositToken, address indexed goalzToken);
    event DepositMade(address indexed saver, uint indexed goalId, uint amount, uint256 shares);
    event WithdrawMade(address indexed saver, uint indexed goalId, uint amount);
    event GoalCompleted(address indexed saver, uint indexed goalId, uint targetAmount);

    constructor(
        address[] memory _initialDepositTokens, 
        address[] memory _initialMorphoVaults
    ) 
        ERC721("Goalz", "GOALZ") 
    {
        require(_initialDepositTokens.length == _initialMorphoVaults.length, "Deposit tokens and vaults should be the same length");
        for (uint i = 0; i < _initialDepositTokens.length; i++) {
            _addDepositToken(_initialDepositTokens[i], _initialMorphoVaults[i]);
        }
    }

    function _addDepositToken(address _depositToken, address _morphoVault) internal {
        ERC20 _token = ERC20(_depositToken);
        IMetaMorpho vault = IMetaMorpho(_morphoVault);
        
        morphoVaults[_depositToken] = vault;
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
        _burn(goalId);
        
        emit GoalDeleted(msg.sender, goalId);
    }

    function deposit(uint goalId, uint amount) external goalExists(goalId) {
        require(amount > 0, "Deposit amount should be greater than 0");
        require(msg.sender != address(0), "Invalid sender address");

        SavingsGoal storage goal = savingsGoals[goalId];
        require(goal.depositToken != address(0), "Invalid deposit token");

        uint256 currentValue = _getGoalValue(goalId);
        
        if(currentValue + amount >= goal.targetAmount) {
            goal.complete = true;
            emit GoalCompleted(msg.sender, goalId, goal.targetAmount);
        }

        _deposit(msg.sender, goal, amount, goalId);
    }

    function withdraw(uint goalId) public goalExists(goalId) isGoalOwner(goalId) nonReentrant {
        SavingsGoal storage goal = savingsGoals[goalId];
        require(goal.shareBalance > 0, "No funds to withdraw");
        require(goal.depositToken != address(0), "Invalid deposit token");
        
        address depositToken = goal.depositToken;
        GoalzTokenMorpho goalzToken = goalzTokens[depositToken];
        IMetaMorpho vault = morphoVaults[depositToken];

        uint256 sharesToWithdraw = goal.shareBalance;
        uint256 assetsToWithdraw = vault.convertToAssets(sharesToWithdraw);
        
        uint256 interest = assetsToWithdraw > goal.currentAmount ? assetsToWithdraw - goal.currentAmount : 0;
        
        if (interest > 0) {
            goalzToken.mint(msg.sender, interest);
        }
        
        goalzToken.burn(msg.sender, goal.currentAmount);
        
        _withdrawFromMorpho(depositToken, assetsToWithdraw);
        
        IERC20(depositToken).safeTransfer(msg.sender, assetsToWithdraw);
        
        goal.currentAmount = 0;
        goal.shareBalance = 0;

        emit WithdrawMade(msg.sender, goalId, assetsToWithdraw);
    }

    function _deposit(address account, SavingsGoal storage goal, uint amount, uint goalId) internal nonReentrant {
        address _depositToken = goal.depositToken;
        require(_depositToken != address(0), "Invalid deposit token");
        require(account != address(0), "Invalid account address");
        require(amount > 0, "Deposit amount should be greater than 0");
        require(IERC20(_depositToken).balanceOf(account) >= amount, "Insufficient balance");

        GoalzTokenMorpho goalzToken = goalzTokens[_depositToken];

        IERC20(_depositToken).safeTransferFrom(account, address(this), amount);
        
        uint256 shares = _depositToMorpho(_depositToken, amount);
        
        goalzToken.mint(account, amount);
        
        goal.currentAmount += amount;
        goal.shareBalance += shares;

        emit DepositMade(account, goalId, amount, shares);
    }

    function _depositToMorpho(address token, uint amount) internal returns (uint256 shares) {
        IMetaMorpho vault = morphoVaults[token];
        require(address(vault) != address(0), "Morpho vault not found");
        
        IERC20(token).approve(address(vault), amount);
        shares = vault.deposit(amount, address(this));
    }

    function _withdrawFromMorpho(address token, uint amount) internal {
        IMetaMorpho vault = morphoVaults[token];
        require(address(vault) != address(0), "Morpho vault not found");
        
        vault.withdraw(amount, address(this), address(this));
    }

    function _getGoalValue(uint goalId) internal view returns (uint256) {
        SavingsGoal storage goal = savingsGoals[goalId];
        if (goal.shareBalance == 0) {
            return 0;
        }
        
        IMetaMorpho vault = morphoVaults[goal.depositToken];
        return vault.convertToAssets(goal.shareBalance);
    }

    function getGoalValue(uint goalId) external view goalExists(goalId) returns (uint256) {
        return _getGoalValue(goalId);
    }

    function getGoalInterest(uint goalId) external view goalExists(goalId) returns (uint256) {
        SavingsGoal storage goal = savingsGoals[goalId];
        uint256 currentValue = _getGoalValue(goalId);
        return currentValue > goal.currentAmount ? currentValue - goal.currentAmount : 0;
    }

    function _getGoalId(SavingsGoal storage goal) internal view returns (uint) {
        for (uint i = 0; i < _tokenIdCounter; i++) {
            if (keccak256(abi.encode(savingsGoals[i])) == keccak256(abi.encode(goal))) {
                return i;
            }
        }
        revert("Goal ID not found");
    }

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