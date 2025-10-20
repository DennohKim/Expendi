// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ExpendiSubscriptions
 * @dev Custom subscription contract compatible with Privy smart accounts
 * Implements ERC-7715 style permissions for recurring payments
 */
contract ExpendiSubscriptions is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Events
    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        uint256 periodInDays,
        uint256 nextChargeTimestamp
    );
    
    event SubscriptionCharged(
        bytes32 indexed subscriptionId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event SubscriptionPaused(bytes32 indexed subscriptionId, address indexed payer);
    event SubscriptionResumed(bytes32 indexed subscriptionId, address indexed payer);
    event SubscriptionCancelled(bytes32 indexed subscriptionId, address indexed payer);
    
    event PermissionGranted(
        address indexed owner,
        address indexed spender,
        address indexed token,
        uint256 allowedAmount,
        uint256 periodInSeconds,
        uint256 expiryTimestamp
    );
    
    event PermissionRevoked(
        address indexed owner,
        address indexed spender,
        address indexed token
    );
    
    event SecurityLimitTriggered(
        address indexed user,
        string limitType,
        uint256 amount,
        uint256 limit
    );
    
    event SubscriptionCompleted(
        bytes32 indexed subscriptionId,
        address indexed payer,
        address indexed recipient
    );

    // Structs
    struct Subscription {
        address payer;
        address recipient;
        address token;
        uint256 amount;
        uint256 periodInDays;
        uint256 lastChargeTimestamp;
        uint256 nextChargeTimestamp;
        uint256 maxAllowedAmount; // Security limit per period
        bool isActive;
        bool isPaused;
        uint256 totalCharged;
        uint256 chargeCount;
        string metadata; // JSON metadata for frontend
    }

    struct Permission {
        address token;
        uint256 allowedAmount;
        uint256 usedAmount;
        uint256 periodInSeconds;
        uint256 lastResetTimestamp;
        uint256 expiryTimestamp;
        bool isActive;
    }

    // State variables
    mapping(bytes32 => Subscription) public subscriptions;
    mapping(address => mapping(address => Permission)) public permissions; // owner => spender => permission
    mapping(address => bytes32[]) public userSubscriptions;
    mapping(address => bytes32[]) public recipientSubscriptions;
    
    IERC20 public immutable USDC;
    
    // Security constants
    uint256 public constant MAX_PERIOD_DAYS = 365; // 1 year max
    uint256 public constant MIN_AMOUNT = 1e6; // 1 USDC (6 decimals)
    uint256 public constant MAX_AMOUNT = 1e12; // 1M USDC
    uint256 public constant MAX_PERMISSION_AMOUNT = 1e12; // 1M USDC max permission
    uint256 public constant MIN_PERMISSION_PERIOD = 300; // 5 minutes for testing
    uint256 public constant MAX_PERMISSION_PERIOD = 365 days;
    uint256 public constant MIN_CHARGE_INTERVAL = 300; // 5 minutes between charges
    
    // Per-user limits
    mapping(address => uint256) public lastChargeTimestamp;
    mapping(address => uint256) public dailySpentAmount;
    mapping(address => uint256) public lastDailyResetTimestamp;
    uint256 public constant MAX_DAILY_SPEND = 10000e6; // 10,000 USDC per day per user
    
    // Subscription management fee (in basis points)
    uint256 public subscriptionFee = 100; // 1%
    address public feeRecipient;

    constructor(address _usdcAddress, address _feeRecipient) Ownable(msg.sender) {
        require(_usdcAddress != address(0), "Invalid USDC address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        USDC = IERC20(_usdcAddress);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Grant spending permission to a spender (ERC-7715 style)
     * @param spender Address that can spend tokens
     * @param token Token address
     * @param allowedAmount Amount allowed per period
     * @param periodInSeconds Period duration in seconds
     * @param expiryTimestamp When permission expires
     */
    function grantPermission(
        address spender,
        address token,
        uint256 allowedAmount,
        uint256 periodInSeconds,
        uint256 expiryTimestamp
    ) external {
        require(spender != address(0), "Invalid spender");
        require(token == address(USDC), "Only USDC supported");
        // Enhanced amount validation
        require(allowedAmount >= MIN_AMOUNT, "Amount too low");
        require(allowedAmount <= MAX_PERMISSION_AMOUNT, "Amount exceeds maximum");
        
        // Enhanced period validation
        require(periodInSeconds >= MIN_PERMISSION_PERIOD, "Period too short");
        require(periodInSeconds <= MAX_PERMISSION_PERIOD, "Period too long");
        
        // Enhanced expiry validation
        require(expiryTimestamp > block.timestamp, "Already expired");
        require(expiryTimestamp <= block.timestamp + MAX_PERMISSION_PERIOD, "Expiry too far in future");

        permissions[msg.sender][spender] = Permission({
            token: token,
            allowedAmount: allowedAmount,
            usedAmount: 0,
            periodInSeconds: periodInSeconds,
            lastResetTimestamp: block.timestamp,
            expiryTimestamp: expiryTimestamp,
            isActive: true
        });

        emit PermissionGranted(msg.sender, spender, token, allowedAmount, periodInSeconds, expiryTimestamp);
    }

    /**
     * @dev Revoke spending permission
     * @param spender Address to revoke permission from
     */
    function revokePermission(address spender) external {
        require(permissions[msg.sender][spender].isActive, "Permission not active");
        
        delete permissions[msg.sender][spender];
        
        emit PermissionRevoked(msg.sender, spender, address(USDC));
    }

    /**
     * @dev Create a new subscription
     * @param payer Address that will be charged
     * @param recipient Address that will receive payments
     * @param amount Amount to charge per period
     * @param periodInDays Period between charges in days (0 for one-time)
     * @param nextChargeTimestamp When to execute first/only charge
     * @param metadata JSON metadata string
     */
    function createSubscription(
        address payer,
        address recipient,
        uint256 amount,
        uint256 periodInDays,
        uint256 nextChargeTimestamp,
        string memory metadata
    ) external nonReentrant whenNotPaused returns (bytes32 subscriptionId) {
        require(payer != address(0) && recipient != address(0), "Invalid addresses");
        require(amount >= MIN_AMOUNT && amount <= MAX_AMOUNT, "Invalid amount");
        require(periodInDays <= MAX_PERIOD_DAYS, "Period too long");
        require(nextChargeTimestamp > block.timestamp, "Invalid charge time");

        // Enhanced permission checks
        if (payer != msg.sender) {
            _checkPermission(payer, msg.sender, amount, periodInDays);
            
            // Additional security: Ensure permission covers reasonable duration
            if (periodInDays > 0) {
                Permission storage perm = permissions[payer][msg.sender];
                uint256 totalPeriods = (perm.expiryTimestamp - block.timestamp) / (periodInDays * 1 days);
                uint256 maxExpectedSpend = amount * totalPeriods;
                
                require(
                    maxExpectedSpend <= perm.allowedAmount * 2, // Allow some buffer
                    "Permission insufficient for subscription duration"
                );
            }
        }

        subscriptionId = keccak256(abi.encodePacked(
            payer,
            recipient,
            amount,
            periodInDays,
            nextChargeTimestamp,
            block.timestamp,
            block.number
        ));

        subscriptions[subscriptionId] = Subscription({
            payer: payer,
            recipient: recipient,
            token: address(USDC),
            amount: amount,
            periodInDays: periodInDays,
            lastChargeTimestamp: 0,
            nextChargeTimestamp: nextChargeTimestamp,
            maxAllowedAmount: amount * 2, // Allow 2x amount as safety buffer
            isActive: true,
            isPaused: false,
            totalCharged: 0,
            chargeCount: 0,
            metadata: metadata
        });

        userSubscriptions[payer].push(subscriptionId);
        recipientSubscriptions[recipient].push(subscriptionId);

        emit SubscriptionCreated(
            subscriptionId,
            payer,
            recipient,
            amount,
            periodInDays,
            nextChargeTimestamp
        );
    }

    /**
     * @dev Execute a subscription charge
     * @param subscriptionId ID of subscription to charge
     */
    function chargeSubscription(bytes32 subscriptionId) external nonReentrant whenNotPaused {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.isActive && !sub.isPaused, "Subscription not active");
        require(block.timestamp >= sub.nextChargeTimestamp, "Too early to charge");

        // Check permission if not self-charge
        if (sub.payer != msg.sender) {
            _checkAndUpdatePermission(sub.payer, msg.sender, sub.amount);
        }

        // Calculate fee
        uint256 fee = (sub.amount * subscriptionFee) / 10000;
        uint256 netAmount = sub.amount - fee;

        // Execute transfer
        USDC.safeTransferFrom(sub.payer, sub.recipient, netAmount);
        if (fee > 0) {
            USDC.safeTransferFrom(sub.payer, feeRecipient, fee);
        }

        // Update subscription state
        sub.lastChargeTimestamp = block.timestamp;
        sub.totalCharged += sub.amount;
        sub.chargeCount += 1;

        // CEI Pattern: Effects first, then Interactions
        // Calculate next charge time BEFORE external calls
        if (sub.periodInDays > 0) {
            sub.nextChargeTimestamp = block.timestamp + (sub.periodInDays * 1 days);
        } else {
            // One-time payment, deactivate
            sub.isActive = false;
            emit SubscriptionCompleted(subscriptionId, sub.payer, sub.recipient);
        }

        emit SubscriptionCharged(subscriptionId, sub.payer, sub.recipient, sub.amount, block.timestamp);
    }

    /**
     * @dev Pause a subscription (only payer can pause)
     */
    function pauseSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.payer == msg.sender || owner() == msg.sender, "Not authorized");
        require(sub.isActive && !sub.isPaused, "Cannot pause");

        sub.isPaused = true;
        emit SubscriptionPaused(subscriptionId, sub.payer);
    }

    /**
     * @dev Resume a subscription (only payer can resume)
     */
    function resumeSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.payer == msg.sender || owner() == msg.sender, "Not authorized");
        require(sub.isActive && sub.isPaused, "Cannot resume");

        sub.isPaused = false;
        emit SubscriptionResumed(subscriptionId, sub.payer);
    }

    /**
     * @dev Cancel a subscription (only payer can cancel)
     */
    function cancelSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.payer == msg.sender || owner() == msg.sender, "Not authorized");
        require(sub.isActive, "Already cancelled");

        sub.isActive = false;
        sub.isPaused = false;
        
        emit SubscriptionCancelled(subscriptionId, sub.payer);
    }

    /**
     * @dev Check if permission allows spending amount
     */
    function _checkPermission(address owner, address spender, uint256 amount, uint256 periodInDays) internal view {
        Permission storage perm = permissions[owner][spender];
        require(perm.isActive, "No permission granted");
        require(block.timestamp <= perm.expiryTimestamp, "Permission expired");
        require(amount <= perm.allowedAmount, "Amount exceeds allowance");
        
        // For recurring payments, check period compatibility
        if (periodInDays > 0) {
            uint256 expectedPeriod = periodInDays * 1 days;
            require(expectedPeriod >= perm.periodInSeconds, "Period too short");
        }
    }

    /**
     * @dev Check and update permission usage
     */
    function _checkAndUpdatePermission(address owner, address spender, uint256 amount) internal {
        Permission storage perm = permissions[owner][spender];
        require(perm.isActive, "No permission granted");
        require(block.timestamp <= perm.expiryTimestamp, "Permission expired");

        // Anti-spam: Minimum time between charges for same user
        if (lastChargeTimestamp[owner] + MIN_CHARGE_INTERVAL > block.timestamp) {
            emit SecurityLimitTriggered(owner, "CHARGE_FREQUENCY", block.timestamp - lastChargeTimestamp[owner], MIN_CHARGE_INTERVAL);
            revert("Too frequent charges");
        }
        
        // Reset daily spending limit
        if (block.timestamp >= lastDailyResetTimestamp[owner] + 1 days) {
            dailySpentAmount[owner] = 0;
            lastDailyResetTimestamp[owner] = block.timestamp;
        }
        
        // Check daily spending limit
        if (dailySpentAmount[owner] + amount > MAX_DAILY_SPEND) {
            emit SecurityLimitTriggered(owner, "DAILY_SPEND", dailySpentAmount[owner] + amount, MAX_DAILY_SPEND);
            revert("Daily spending limit exceeded");
        }

        // Reset usage if period elapsed
        if (block.timestamp >= perm.lastResetTimestamp + perm.periodInSeconds) {
            perm.usedAmount = 0;
            perm.lastResetTimestamp = block.timestamp;
        }

        require(perm.usedAmount + amount <= perm.allowedAmount, "Allowance exceeded");
        
        // Update all tracking variables BEFORE external calls
        perm.usedAmount += amount;
        dailySpentAmount[owner] += amount;
        lastChargeTimestamp[owner] = block.timestamp;
    }

    // View functions
    function getSubscription(bytes32 subscriptionId) external view returns (Subscription memory) {
        return subscriptions[subscriptionId];
    }

    function getUserSubscriptions(address user) external view returns (bytes32[] memory) {
        return userSubscriptions[user];
    }

    function getRecipientSubscriptions(address recipient) external view returns (bytes32[] memory) {
        return recipientSubscriptions[recipient];
    }

    function getPermission(address owner, address spender) external view returns (Permission memory) {
        return permissions[owner][spender];
    }

    function isSubscriptionDue(bytes32 subscriptionId) external view returns (bool) {
        Subscription storage sub = subscriptions[subscriptionId];
        return sub.isActive && !sub.isPaused && block.timestamp >= sub.nextChargeTimestamp;
    }

    // Admin functions
    function setSubscriptionFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high"); // Max 5% for security
        subscriptionFee = _fee;
    }
    
    /**
     * @dev Get user's current daily spending and limits
     */
    function getDailySpendingInfo(address user) external view returns (
        uint256 spentToday,
        uint256 dailyLimit,
        uint256 resetTimestamp
    ) {
        uint256 spentAmount = dailySpentAmount[user];
        // Adjust if reset time has passed
        if (block.timestamp >= lastDailyResetTimestamp[user] + 1 days) {
            spentAmount = 0;
        }
        
        return (
            spentAmount,
            MAX_DAILY_SPEND,
            lastDailyResetTimestamp[user]
        );
    }
    
    /**
     * @dev Check if user can spend amount without exceeding limits
     */
    function canUserSpend(address user, uint256 amount) external view returns (bool) {
        // Check daily limit
        uint256 currentDaily = dailySpentAmount[user];
        if (block.timestamp >= lastDailyResetTimestamp[user] + 1 days) {
            currentDaily = 0; // Would be reset
        }
        
        // Check timing
        bool timingOk = block.timestamp >= lastChargeTimestamp[user] + MIN_CHARGE_INTERVAL;
        bool dailyOk = currentDaily + amount <= MAX_DAILY_SPEND;
        
        return timingOk && dailyOk;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency function to withdraw stuck tokens
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}