// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISubscriptionDataManager.sol";
import "./interfaces/ISubscriptionPaymentProcessor.sol";

/**
 * @title ExpendiBucketManager
 * @dev Secure bucket-based subscription system with external subscription integration
 * @notice This contract manages both one-time payments and subscriptions tied to specific spending buckets
 */
contract ExpendiBucketManager is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    uint256 public constant MONTH_SECONDS = 30 days;
    uint256 public constant MIN_SUBSCRIPTION_AMOUNT = 1e6; // 1 USDC (6 decimals)
    uint256 public constant MAX_SUBSCRIPTION_AMOUNT = 1000000e6; // 1M USDC
    uint256 public constant MAX_SUBSCRIPTIONS_PER_BUCKET = 50;
    address public constant ETH_ADDRESS = address(0);
    
    // ============ ROLES ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SUBSCRIPTION_MANAGER_ROLE = keccak256("SUBSCRIPTION_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // ============ STATE VARIABLES ============
    
    // External subscription service contract addresses
    address public immutable SUBSCRIPTION_DATA_MANAGER;
    address public immutable SUBSCRIPTION_PAYMENT_PROCESSOR;
    
    // Security: Rate limiting
    mapping(address => uint256) public lastOperationTimestamp;
    mapping(address => uint256) public lastSubscriptionCreation;
    uint256 public constant MIN_OPERATION_INTERVAL = 300; // 5 minutes
    uint256 public constant SUBSCRIPTION_CREATION_COOLDOWN = 1 hours;
    
    // Bucket structures
    struct Bucket {
        uint256 balance;              // Current ETH balance in bucket
        uint256 monthlySpent;         // Amount spent this month
        uint256 monthlyLimit;         // Monthly spending limit (0 = no limit)
        uint256 lastResetTimestamp;   // When monthly counter was last reset
        bool exists;                  // Whether bucket exists
        bool active;                  // Whether bucket is active for spending
        mapping(address => uint256) tokenBalances;  // token => balance
        uint256[] subscriptionIds;                  // List of active subscription IDs
        uint256 subscriptionCount;                  // Count of subscriptions
    }
    
    struct SubscriptionInfo {
        uint256 subscriptionId;       // Spheron subscription ID
        string bucketName;           // Source bucket
        uint256 amount;              // Amount per period
        uint256 periodInDays;        // Billing period
        address token;               // Payment token
        address recipient;           // Payment recipient
        bool isActive;               // Subscription status
        uint256 nextChargeTimestamp; // Next charge time
        uint256 totalCharged;        // Total amount charged
        uint256 chargeCount;         // Number of charges
        uint256 createdAt;           // Creation timestamp
        uint256 lastProcessedAt;     // Last processing timestamp
        bool userConsent;            // Explicit user consent
    }

    // State mappings
    mapping(address => mapping(string => Bucket)) public userBuckets;
    mapping(address => string[]) public userBucketNames;
    mapping(address => mapping(address => uint256)) public userTokenBalances; // user => token => balance
    mapping(address => mapping(uint256 => SubscriptionInfo)) public userSubscriptions; // user => subscriptionId => info
    mapping(address => uint256[]) public userSubscriptionIds; // user => subscriptionIds[]
    
    // Security: Emergency pause for specific users
    mapping(address => bool) public emergencyPausedUsers;
    
    // ============ EVENTS ============
    
    // Bucket Management Events
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
    
    event BucketDeleted(
        address indexed user,
        string indexed bucketName,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Payment Events
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
    
    // Subscription Events
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
    
    event BucketSubscriptionCharged(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 amount,
        address token,
        address recipient,
        uint256 newBucketBalance,
        uint256 totalCharged,
        uint256 chargeCount,
        uint256 nextChargeTimestamp,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketSubscriptionCancelled(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 totalCharged,
        uint256 chargeCount,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketSubscriptionPaused(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketSubscriptionResumed(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Monthly Limit Events
    event MonthlyLimitReset(
        address indexed user,
        string indexed bucketName,
        uint256 oldSpent,
        uint256 newLimit,
        uint256 resetTimestamp,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event MonthlyLimitUpdated(
        address indexed user,
        string indexed bucketName,
        uint256 oldLimit,
        uint256 newLimit,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Bucket Analytics Events
    event BucketBalanceChanged(
        address indexed user,
        string indexed bucketName,
        address indexed token,
        uint256 oldBalance,
        uint256 newBalance,
        uint256 changeAmount,
        string changeType, // "fund", "payment", "subscription", "withdrawal"
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketMonthlySpendingUpdated(
        address indexed user,
        string indexed bucketName,
        uint256 oldMonthlySpent,
        uint256 newMonthlySpent,
        uint256 monthlyLimit,
        uint256 spendingPercentage,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Security Events
    event EmergencyPause(
        address indexed user,
        bool paused,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event SecurityEvent(
        address indexed user,
        string indexed eventType,
        string details,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Analytics Events
    event UserActivity(
        address indexed user,
        string indexed activityType, // "bucket_created", "subscription_created", "payment_made", etc.
        string bucketName,
        uint256 amount,
        address indexed token,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event SubscriptionAnalytics(
        address indexed user,
        uint256 indexed subscriptionId,
        string indexed bucketName,
        uint256 totalCharged,
        uint256 chargeCount,
        uint256 periodInDays,
        address recipient,
        uint256 timestamp,
        uint256 blockNumber
    );

    // ============ CONSTRUCTOR ============
    
    constructor(
        address _subscriptionDataManager,
        address _subscriptionPaymentProcessor
    ) {
        require(_subscriptionDataManager != address(0), "Invalid subscription data manager address");
        require(_subscriptionPaymentProcessor != address(0), "Invalid subscription payment processor address");
        
        SUBSCRIPTION_DATA_MANAGER = _subscriptionDataManager;
        SUBSCRIPTION_PAYMENT_PROCESSOR = _subscriptionPaymentProcessor;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(SUBSCRIPTION_MANAGER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
    }

    // ============ MODIFIERS ============
    
    modifier bucketExists(address user, string memory bucketName) {
        require(userBuckets[user][bucketName].exists, "Bucket does not exist");
        _;
    }
    
    modifier bucketActive(address user, string memory bucketName) {
        require(userBuckets[user][bucketName].active, "Bucket is inactive");
        _;
    }
    
    modifier notEmergencyPaused(address user) {
        require(!emergencyPausedUsers[user], "User is emergency paused");
        _;
    }
    
    modifier rateLimited() {
        require(
            block.timestamp >= lastOperationTimestamp[msg.sender] + MIN_OPERATION_INTERVAL,
            "Operation too frequent"
        );
        lastOperationTimestamp[msg.sender] = block.timestamp;
        _;
    }
    
    modifier validSubscriptionAmount(uint256 amount) {
        require(amount >= MIN_SUBSCRIPTION_AMOUNT, "Amount too low");
        require(amount <= MAX_SUBSCRIPTION_AMOUNT, "Amount too high");
        _;
    }
    
    modifier validBucketName(string memory bucketName) {
        require(bytes(bucketName).length > 0, "Bucket name cannot be empty");
        require(bytes(bucketName).length <= 32, "Bucket name too long");
        require(bytes(bucketName).length >= 3, "Bucket name too short");
        _;
    }

    // ============ BUCKET MANAGEMENT ============
    
    /**
     * @dev Create a new spending bucket
     */
    function createBucket(
        string memory bucketName, 
        uint256 monthlyLimit
    ) external 
        whenNotPaused 
        notEmergencyPaused(msg.sender)
        rateLimited
        validBucketName(bucketName)
    {
        require(!userBuckets[msg.sender][bucketName].exists, "Bucket already exists");
        require(monthlyLimit <= 1000000e6, "Monthly limit too high"); // Max 1M USDC
        
        Bucket storage newBucket = userBuckets[msg.sender][bucketName];
        newBucket.monthlyLimit = monthlyLimit;
        newBucket.lastResetTimestamp = block.timestamp;
        newBucket.exists = true;
        newBucket.active = true;
        newBucket.subscriptionCount = 0;
        
        userBucketNames[msg.sender].push(bucketName);
        
        emit BucketCreated(msg.sender, bucketName, monthlyLimit, block.timestamp, block.number);
        emit UserActivity(msg.sender, "bucket_created", bucketName, 0, address(0), block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "BUCKET_CREATED", "Bucket created successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Fund a bucket with tokens from unallocated balance
     * @notice Monthly limits are reset if 30 days have passed
     */
    function fundBucket(
        string memory bucketName, 
        uint256 amount,
        address token
    ) external 
        bucketExists(msg.sender, bucketName)
        whenNotPaused
        notEmergencyPaused(msg.sender)
        nonReentrant
    {
        require(amount > 0, "Amount must be greater than 0");
        require(token != address(0), "Invalid token address");
        
        // Reset monthly limit if needed (30 days have passed)
        _resetMonthlyLimitIfNeeded(msg.sender, bucketName);
        
        // Security: Check for sufficient balance
        require(userTokenBalances[msg.sender][token] >= amount, "Insufficient unallocated balance");
        
        // Effects: Update balances first (CEI pattern)
        userTokenBalances[msg.sender][token] -= amount;
        
        if (token == ETH_ADDRESS) {
            userBuckets[msg.sender][bucketName].balance += amount;
        } else {
            userBuckets[msg.sender][bucketName].tokenBalances[token] += amount;
        }
        
        uint256 newBalance = getBucketBalance(msg.sender, bucketName, token);
        emit BucketFunded(msg.sender, bucketName, amount, token, newBalance, block.timestamp, block.number);
        emit BucketBalanceChanged(msg.sender, bucketName, token, newBalance - amount, newBalance, amount, "fund", block.timestamp, block.number);
        emit UserActivity(msg.sender, "bucket_funded", bucketName, amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "BUCKET_FUNDED", "Bucket funded successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Delete a bucket (only if it has no funds)
     * @notice Buckets with funds cannot be deleted to prevent accidental loss
     * @notice All subscriptions in the bucket must be cancelled first
     */
    function deleteBucket(
        string memory bucketName
    ) external 
        bucketExists(msg.sender, bucketName)
        whenNotPaused
        notEmergencyPaused(msg.sender)
        nonReentrant
    {
        Bucket storage bucket = userBuckets[msg.sender][bucketName];
        
        // Security: Check if bucket has any funds
        require(bucket.balance == 0, "Cannot delete bucket with ETH funds");
        
        // Security: Check if bucket has any token funds
        address[] memory supportedTokens = getSupportedTokens();
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            require(
                bucket.tokenBalances[supportedTokens[i]] == 0,
                "Cannot delete bucket with token funds"
            );
        }
        
        // Security: Check if bucket has active subscriptions
        require(bucket.subscriptionCount == 0, "Cannot delete bucket with active subscriptions");
        
        // Security: Check if bucket has any pending monthly spending
        require(bucket.monthlySpent == 0, "Cannot delete bucket with pending monthly spending");
        
        // Remove bucket from user's bucket list
        _removeBucketFromList(msg.sender, bucketName);
        
        // Delete the bucket
        delete userBuckets[msg.sender][bucketName];
        
        emit BucketDeleted(msg.sender, bucketName, block.timestamp, block.number);
        emit UserActivity(msg.sender, "bucket_deleted", bucketName, 0, address(0), block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "BUCKET_DELETED", "Bucket deleted successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Remove bucket from user's bucket list
     */
    function _removeBucketFromList(address user, string memory bucketName) internal {
        string[] storage bucketNames = userBucketNames[user];
        
        for (uint256 i = 0; i < bucketNames.length; i++) {
            if (keccak256(bytes(bucketNames[i])) == keccak256(bytes(bucketName))) {
                // Remove bucket from list by moving last element to current position
                bucketNames[i] = bucketNames[bucketNames.length - 1];
                bucketNames.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Check if bucket can be deleted
     */
    function canDeleteBucket(
        address user,
        string memory bucketName
    ) external view bucketExists(user, bucketName) returns (bool, string memory) {
        Bucket storage bucket = userBuckets[user][bucketName];
        
        // Check ETH balance
        if (bucket.balance > 0) {
            return (false, "Bucket has ETH funds");
        }
        
        // Check token balances
        address[] memory supportedTokens = getSupportedTokens();
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (bucket.tokenBalances[supportedTokens[i]] > 0) {
                return (false, "Bucket has token funds");
            }
        }
        
        // Check active subscriptions
        if (bucket.subscriptionCount > 0) {
            return (false, "Bucket has active subscriptions");
        }
        
        // Check pending monthly spending
        if (bucket.monthlySpent > 0) {
            return (false, "Bucket has pending monthly spending");
        }
        
        return (true, "Bucket can be deleted");
    }
    
    /**
     * @dev Get supported tokens for balance checking
     */
    // Supported tokens storage for testing
    address[] private supportedTokensList;
    
    function getSupportedTokens() public view returns (address[] memory) {
        if (supportedTokensList.length == 0) {
            // Return default tokens if none set
            address[] memory tokens = new address[](3);
            tokens[0] = ETH_ADDRESS;
            tokens[1] = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base
            tokens[2] = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb; // DAI on Base
            return tokens;
        }
        return supportedTokensList;
    }
    
    /**
     * @dev Add supported token (for testing)
     */
    function addSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        supportedTokensList.push(token);
    }

    // ============ ONE-TIME PAYMENT FUNCTIONS ============
    
    /**
     * @dev Make a one-time payment from bucket
     * @notice No subscription needed - direct payment from bucket
     * @notice Does NOT reset monthly limits - works like current bucket system
     */
    function makeOneTimePayment(
        string memory bucketName,
        uint256 amount,
        address token,
        address recipient,
        string memory description
    ) external 
        bucketExists(msg.sender, bucketName)
        bucketActive(msg.sender, bucketName)
        whenNotPaused
        notEmergencyPaused(msg.sender)
        nonReentrant
    {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        
        // Check bucket balance
        uint256 availableBalance = getBucketBalance(msg.sender, bucketName, token);
        require(availableBalance >= amount, "Insufficient bucket balance");
        
        // Check monthly limit (but don't reset it)
        Bucket storage bucket = userBuckets[msg.sender][bucketName];
        if (bucket.monthlyLimit > 0) {
            uint256 newMonthlySpent = bucket.monthlySpent + amount;
            require(newMonthlySpent <= bucket.monthlyLimit, "Monthly limit exceeded");
            bucket.monthlySpent = newMonthlySpent; // Update monthly spending
        }
        
        // Process payment
        if (token == ETH_ADDRESS) {
            bucket.balance -= amount;
        } else {
            bucket.tokenBalances[token] -= amount;
        }
        
        // Transfer to recipient
        if (token == ETH_ADDRESS) {
            payable(recipient).transfer(amount);
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
        
        uint256 newBucketBalance = getBucketBalance(msg.sender, bucketName, token);
        emit OneTimePaymentMade(
            msg.sender,
            bucketName,
            amount,
            token,
            recipient,
            description,
            newBucketBalance,
            bucket.monthlySpent,
            block.timestamp,
            block.number
        );
        emit BucketBalanceChanged(msg.sender, bucketName, token, newBucketBalance + amount, newBucketBalance, amount, "payment", block.timestamp, block.number);
        emit BucketMonthlySpendingUpdated(msg.sender, bucketName, bucket.monthlySpent - amount, bucket.monthlySpent, bucket.monthlyLimit, (bucket.monthlySpent * 100) / bucket.monthlyLimit, block.timestamp, block.number);
        emit UserActivity(msg.sender, "payment_made", bucketName, amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "ONE_TIME_PAYMENT", "One-time payment made successfully", block.timestamp, block.number);
    }

    // ============ SUBSCRIPTION MANAGEMENT ============
    
    /**
     * @dev Create a subscription with explicit user consent
     * @notice User must explicitly agree to recurring payments
     */
    function createBucketSubscription(
        string memory bucketName,
        uint256 amount,
        uint256 periodInDays,
        address token,
        address recipient,
        string memory metadata,
        bool userConsent // Explicit consent parameter
    ) external 
        bucketExists(msg.sender, bucketName)
        bucketActive(msg.sender, bucketName)
        whenNotPaused
        notEmergencyPaused(msg.sender)
        nonReentrant
        rateLimited
        validSubscriptionAmount(amount)
    returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(token != address(0), "Invalid token");
        require(periodInDays >= 1 && periodInDays <= 365, "Invalid period");
        require(userConsent, "User must explicitly consent to recurring payments");
        
        // Security: Rate limiting for subscription creation
        require(
            block.timestamp >= lastSubscriptionCreation[msg.sender] + SUBSCRIPTION_CREATION_COOLDOWN,
            "Subscription creation too frequent"
        );
        lastSubscriptionCreation[msg.sender] = block.timestamp;
        
        Bucket storage bucket = userBuckets[msg.sender][bucketName];
        
        // Security: Limit subscriptions per bucket
        require(bucket.subscriptionCount < MAX_SUBSCRIPTIONS_PER_BUCKET, "Too many subscriptions");
        
        // Security: Check if bucket has sufficient balance for the subscription
        uint256 availableBalance = getBucketBalance(msg.sender, bucketName, token);
        require(availableBalance >= amount, "Insufficient bucket balance");
        
        // Security: Check monthly limit
        if (bucket.monthlyLimit > 0) {
            uint256 projectedMonthlySpend = bucket.monthlySpent + amount;
            require(projectedMonthlySpend <= bucket.monthlyLimit, "Would exceed monthly limit");
        }
        
        // Create subscription via external subscription service
        uint256 subscriptionId = ISubscriptionDataManager(SUBSCRIPTION_DATA_MANAGER)
            .createSubscription(
                msg.sender,
                amount,
                periodInDays,
                token,
                recipient,
                metadata
            );
        
        // Store subscription info
        SubscriptionInfo storage subscription = userSubscriptions[msg.sender][subscriptionId];
        subscription.subscriptionId = subscriptionId;
        subscription.bucketName = bucketName;
        subscription.amount = amount;
        subscription.periodInDays = periodInDays;
        subscription.token = token;
        subscription.recipient = recipient;
        subscription.isActive = true;
        subscription.nextChargeTimestamp = block.timestamp + (periodInDays * 1 days);
        subscription.createdAt = block.timestamp;
        subscription.userConsent = userConsent; // Store consent
        subscription.lastProcessedAt = 0;
        
        // Link subscription to bucket
        bucket.subscriptionIds.push(subscriptionId);
        bucket.subscriptionCount += 1;
        userSubscriptionIds[msg.sender].push(subscriptionId);
        
        emit BucketSubscriptionCreated(
            msg.sender,
            bucketName,
            subscriptionId,
            amount,
            periodInDays,
            recipient,
            token,
            subscription.nextChargeTimestamp,
            userConsent,
            metadata,
            block.timestamp,
            block.number
        );
        emit SubscriptionAnalytics(msg.sender, subscriptionId, bucketName, 0, 0, periodInDays, recipient, block.timestamp, block.number);
        emit UserActivity(msg.sender, "subscription_created", bucketName, amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "SUBSCRIPTION_CREATED", "Subscription created successfully", block.timestamp, block.number);
        
        return subscriptionId;
    }
    
    /**
     * @dev Process subscription payment from bucket
     * @notice This function is called by the backend scheduler
     * @notice Monthly limits are reset ONLY for monthly subscriptions (30 days)
     */
    function processSubscriptionPayment(
        address user,
        uint256 subscriptionId
    ) external 
        onlyRole(SUBSCRIPTION_MANAGER_ROLE) 
        nonReentrant 
        whenNotPaused
    {
        // Get subscription info
        SubscriptionInfo storage subscription = userSubscriptions[user][subscriptionId];
        require(subscription.isActive, "Subscription not active");
        require(block.timestamp >= subscription.nextChargeTimestamp, "Too early to charge");
        
        // Security: Prevent rapid processing of same subscription
        require(
            block.timestamp >= subscription.lastProcessedAt + 1 hours,
            "Subscription processing too frequent"
        );
        
        Bucket storage bucket = userBuckets[user][subscription.bucketName];
        
        // CRITICAL: Only reset monthly limit for monthly subscriptions (30 days)
        if (subscription.periodInDays == 30) {
            _resetMonthlyLimitIfNeeded(user, subscription.bucketName);
        }
        
        // Security: Check bucket balance again (could have changed)
        uint256 availableBalance = getBucketBalance(
            user,
            subscription.bucketName,
            subscription.token
        );
        require(availableBalance >= subscription.amount, "Insufficient bucket balance");
        
        // Security: Check monthly limit after reset
        if (bucket.monthlyLimit > 0) {
            uint256 newMonthlySpent = bucket.monthlySpent + subscription.amount;
            require(newMonthlySpent <= bucket.monthlyLimit, "Monthly limit exceeded");
            bucket.monthlySpent = newMonthlySpent;
        }
        
        // Effects: Update balances first (CEI pattern)
        if (subscription.token == ETH_ADDRESS) {
            bucket.balance -= subscription.amount;
        } else {
            bucket.tokenBalances[subscription.token] -= subscription.amount;
        }
        
        // Interactions: Transfer tokens to recipient
        if (subscription.token == ETH_ADDRESS) {
            payable(subscription.recipient).transfer(subscription.amount);
        } else {
            IERC20(subscription.token).safeTransfer(subscription.recipient, subscription.amount);
        }
        
        // Process payment via external payment processor
        ISubscriptionPaymentProcessor(SUBSCRIPTION_PAYMENT_PROCESSOR)
            .processPayment(subscriptionId, subscription.amount, subscription.recipient);
        
        // Update subscription info
        subscription.totalCharged += subscription.amount;
        subscription.chargeCount += 1;
        subscription.nextChargeTimestamp += (subscription.periodInDays * 1 days);
        subscription.lastProcessedAt = block.timestamp;
        
        uint256 newBucketBalance = availableBalance - subscription.amount;
        emit BucketSubscriptionCharged(
            user,
            subscription.bucketName,
            subscriptionId,
            subscription.amount,
            subscription.token,
            subscription.recipient,
            newBucketBalance,
            subscription.totalCharged,
            subscription.chargeCount,
            subscription.nextChargeTimestamp,
            block.timestamp,
            block.number
        );
        emit BucketBalanceChanged(user, subscription.bucketName, subscription.token, availableBalance, newBucketBalance, subscription.amount, "subscription", block.timestamp, block.number);
        emit BucketMonthlySpendingUpdated(user, subscription.bucketName, bucket.monthlySpent - subscription.amount, bucket.monthlySpent, bucket.monthlyLimit, (bucket.monthlySpent * 100) / bucket.monthlyLimit, block.timestamp, block.number);
        emit SubscriptionAnalytics(user, subscriptionId, subscription.bucketName, subscription.totalCharged, subscription.chargeCount, subscription.periodInDays, subscription.recipient, block.timestamp, block.number);
        emit UserActivity(user, "subscription_charged", subscription.bucketName, subscription.amount, subscription.token, block.timestamp, block.number);
        emit SecurityEvent(user, "SUBSCRIPTION_CHARGED", "Subscription payment processed successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Cancel a bucket subscription
     * @notice Only the subscription owner can cancel
     */
    function cancelBucketSubscription(uint256 subscriptionId) external {
        SubscriptionInfo storage subscription = userSubscriptions[msg.sender][subscriptionId];
        require(subscription.isActive, "Subscription not active");
        
        // Cancel via external subscription service
        ISubscriptionDataManager(SUBSCRIPTION_DATA_MANAGER)
            .cancelSubscription(subscriptionId);
        
        // Update local state
        subscription.isActive = false;
        
        // Remove from bucket's subscription list
        Bucket storage bucket = userBuckets[msg.sender][subscription.bucketName];
        bucket.subscriptionCount -= 1;
        
        emit BucketSubscriptionCancelled(
            msg.sender,
            subscription.bucketName,
            subscriptionId,
            subscription.totalCharged,
            subscription.chargeCount,
            block.timestamp,
            block.number
        );
        emit SecurityEvent(msg.sender, "SUBSCRIPTION_CANCELLED", "Subscription cancelled successfully", block.timestamp, block.number);
    }

    // ============ MONTHLY LIMIT MANAGEMENT ============
    
    /**
     * @dev Reset monthly limit if a month has passed
     * @notice This is called automatically before processing subscriptions AND during bucket operations
     * @notice Monthly limits reset every 30 days regardless of subscription activity
     */
    function _resetMonthlyLimitIfNeeded(address user, string memory bucketName) internal {
        Bucket storage bucket = userBuckets[user][bucketName];
        
        if (block.timestamp >= bucket.lastResetTimestamp + MONTH_SECONDS) {
            uint256 oldSpent = bucket.monthlySpent;
            bucket.monthlySpent = 0;
            bucket.lastResetTimestamp = block.timestamp;
            
            emit MonthlyLimitReset(user, bucketName, oldSpent, bucket.monthlyLimit, bucket.lastResetTimestamp, block.timestamp, block.number);
            emit BucketMonthlySpendingUpdated(user, bucketName, oldSpent, 0, bucket.monthlyLimit, 0, block.timestamp, block.number);
            emit SecurityEvent(user, "MONTHLY_LIMIT_RESET", "Monthly limit reset successfully", block.timestamp, block.number);
        }
    }
    
    /**
     * @dev Reset monthly limit for a bucket
     * @notice Only the bucket owner can manually reset
     * @notice Monthly limits automatically reset every 30 days regardless of subscription activity
     */
    function resetMonthlyLimit(string memory bucketName) external bucketExists(msg.sender, bucketName) {
        _resetMonthlyLimitIfNeeded(msg.sender, bucketName);
    }
    
    /**
     * @dev Reset monthly limits for all user buckets
     * @notice Useful for batch operations and maintenance
     */
    function resetAllBucketMonthlyLimits() external {
        string[] memory bucketNames = userBucketNames[msg.sender];
        
        for (uint256 i = 0; i < bucketNames.length; i++) {
            if (userBuckets[msg.sender][bucketNames[i]].exists) {
                _resetMonthlyLimitIfNeeded(msg.sender, bucketNames[i]);
            }
        }
    }
    
    /**
     * @dev Check and reset monthly limits for a specific user (admin function)
     * @notice Can be called by backend to ensure limits are reset
     */
    function checkAndResetUserMonthlyLimits(address user) external onlyRole(SUBSCRIPTION_MANAGER_ROLE) {
        string[] memory bucketNames = userBucketNames[user];
        
        for (uint256 i = 0; i < bucketNames.length; i++) {
            if (userBuckets[user][bucketNames[i]].exists) {
                _resetMonthlyLimitIfNeeded(user, bucketNames[i]);
            }
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get bucket balance for a specific token
     */
    function getBucketBalance(
        address user,
        string memory bucketName,
        address token
    ) public view returns (uint256) {
        if (token == ETH_ADDRESS) {
            return userBuckets[user][bucketName].balance;
        } else {
            return userBuckets[user][bucketName].tokenBalances[token];
        }
    }
    
    /**
     * @dev Get all subscriptions for a bucket
     */
    function getBucketSubscriptions(
        address user,
        string memory bucketName
    ) external view returns (uint256[] memory) {
        return userBuckets[user][bucketName].subscriptionIds;
    }
    
    /**
     * @dev Get subscription details
     */
    function getSubscriptionInfo(
        address user,
        uint256 subscriptionId
    ) external view returns (SubscriptionInfo memory) {
        return userSubscriptions[user][subscriptionId];
    }
    
    /**
     * @dev Get all user subscriptions
     */
    function getUserSubscriptions(address user) external view returns (uint256[] memory) {
        return userSubscriptionIds[user];
    }
    
    /**
     * @dev Get bucket info including monthly spending
     */
    function getBucketInfo(
        address user,
        string memory bucketName
    ) external view bucketExists(user, bucketName) returns (
        uint256 balance,
        uint256 monthlySpent,
        uint256 monthlyLimit,
        uint256 lastResetTimestamp,
        bool active,
        uint256 subscriptionCount
    ) {
        Bucket storage bucket = userBuckets[user][bucketName];
        return (
            bucket.balance,
            bucket.monthlySpent,
            bucket.monthlyLimit,
            bucket.lastResetTimestamp,
            bucket.active,
            bucket.subscriptionCount
        );
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @dev Emergency pause for specific user
     * @notice Only emergency role can pause users
     */
    function emergencyPauseUser(address user, bool paused) external onlyRole(EMERGENCY_ROLE) {
        emergencyPausedUsers[user] = paused;
        emit EmergencyPause(user, paused, block.timestamp, block.number);
        emit SecurityEvent(user, paused ? "EMERGENCY_PAUSED" : "EMERGENCY_UNPAUSED", "Emergency pause status changed", block.timestamp, block.number);
    }
    
    /**
     * @dev Emergency pause all subscriptions for a user
     * @notice Only emergency role can pause subscriptions
     */
    function emergencyPauseUserSubscriptions(address user) external onlyRole(EMERGENCY_ROLE) {
        uint256[] memory subscriptionIds = userSubscriptionIds[user];
        for (uint256 i = 0; i < subscriptionIds.length; i++) {
            if (userSubscriptions[user][subscriptionIds[i]].isActive) {
                userSubscriptions[user][subscriptionIds[i]].isActive = false;
                emit BucketSubscriptionCancelled(user, "", subscriptionIds[i], 0, 0, block.timestamp, block.number);
            }
        }
        emit SecurityEvent(user, "ALL_SUBSCRIPTIONS_PAUSED", "All subscriptions paused in emergency", block.timestamp, block.number);
    }

    // ============ FUNDING FUNCTIONS ============
    
    /**
     * @dev Deposit tokens to user's unallocated balance
     * @notice Users can deposit tokens that can then be allocated to buckets
     */
    function depositTokens(address token, uint256 amount) external payable nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == ETH_ADDRESS) {
            require(msg.value == amount, "ETH amount mismatch");
            userTokenBalances[msg.sender][token] += amount;
        } else {
            require(msg.value == 0, "ETH sent with token deposit");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            userTokenBalances[msg.sender][token] += amount;
        }
        
        emit UserActivity(msg.sender, "tokens_deposited", "", amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "TOKENS_DEPOSITED", "Tokens deposited successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Withdraw tokens from user's unallocated balance
     * @notice Users can withdraw unallocated tokens
     */
    function withdrawTokens(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(userTokenBalances[msg.sender][token] >= amount, "Insufficient balance");
        
        userTokenBalances[msg.sender][token] -= amount;
        
        if (token == ETH_ADDRESS) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
        
        emit UserActivity(msg.sender, "tokens_withdrawn", "", amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "TOKENS_WITHDRAWN", "Tokens withdrawn successfully", block.timestamp, block.number);
    }
}