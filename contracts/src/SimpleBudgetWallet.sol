// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SimpleBudgetWallet
 * @dev A simple budget wallet with spending buckets and monthly limits
 * @notice Users can create spending buckets, set monthly limits, and spend within those limits
 */
contract SimpleBudgetWallet is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SPENDER_ROLE = keccak256("SPENDER_ROLE");
    
    // Events
    event BucketCreated(address indexed user, string bucketName, uint256 monthlyLimit);
    event BucketUpdated(address indexed user, string bucketName, uint256 newLimit, bool active);
    event BucketFunded(address indexed user, string bucketName, uint256 amount, address token);
    event SpentFromBucket(address indexed user, string bucketName, uint256 amount, address recipient, address token);
    event BucketTransfer(address indexed user, string fromBucket, string toBucket, uint256 amount, address token);
    event FundsDeposited(address indexed user, uint256 amount, address token);
    event MonthlyLimitReset(address indexed user, string bucketName);
    event DelegateAdded(address indexed user, address indexed delegate, string bucketName);
    event DelegateRemoved(address indexed user, address indexed delegate, string bucketName);
    event UnallocatedWithdraw(address indexed user, address token, uint256 amount, address recipient);
    event EmergencyWithdraw(address indexed user, address token, uint256 amount);
    
    // Structs
    struct Bucket {
        uint256 balance;              // Current ETH balance in bucket
        uint256 monthlySpent;         // Amount spent this month
        uint256 monthlyLimit;         // Monthly spending limit (0 = no limit)
        uint256 lastResetTimestamp;   // When monthly counter was last reset
        bool exists;                  // Whether bucket exists
        bool active;                  // Whether bucket is active for spending
        mapping(address => uint256) tokenBalances;  // token => balance
        mapping(address => bool) delegates;         // delegates who can spend
    }
    
    struct TokenBalance {
        mapping(string => uint256) bucketBalances;  // bucketName => balance
        uint256 unallocated;                        // Unallocated balance
    }
    
    // State variables
    mapping(address => mapping(string => Bucket)) public userBuckets;  // user => bucketName => Bucket
    mapping(address => string[]) public userBucketNames;               // user => bucketNames[]
    mapping(address => mapping(address => TokenBalance)) public userTokenBalances; // user => token => TokenBalance
    
    // Constants
    uint256 public constant MONTH_SECONDS = 30 days;
    address public constant ETH_ADDRESS = address(0);
    
    // Modifiers
    modifier onlyUserOrDelegate(address user, string memory bucketName) {
        require(
            msg.sender == user || 
            userBuckets[user][bucketName].delegates[msg.sender] || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        _;
    }
    
    modifier bucketExists(address user, string memory bucketName) {
        require(userBuckets[user][bucketName].exists, "Bucket does not exist");
        _;
    }
    
    modifier bucketActive(address user, string memory bucketName) {
        require(userBuckets[user][bucketName].active, "Bucket is inactive");
        _;
    }
    
    modifier hasSufficientBalance(address user, address token, string memory bucketName, uint256 amount) {
        uint256 balance = getBucketBalance(user, token, bucketName);
        require(balance >= amount, "Insufficient bucket balance");
        _;
    }
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============ DEPOSIT FUNCTIONS ============
    
    /**
     * @dev Deposit ETH to unallocated balance
     */
    function depositETH() external payable whenNotPaused {
        require(msg.value > 0, "Must deposit more than 0");
        userTokenBalances[msg.sender][ETH_ADDRESS].unallocated = 
            userTokenBalances[msg.sender][ETH_ADDRESS].unallocated + msg.value;
        emit FundsDeposited(msg.sender, msg.value, ETH_ADDRESS);
    }
    
    /**
     * @dev Deposit ERC20 tokens to unallocated balance
     */
    function depositToken(address token, uint256 amount) external whenNotPaused {
        require(token != ETH_ADDRESS, "Use depositETH for ETH");
        require(amount > 0, "Must deposit more than 0");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userTokenBalances[msg.sender][token].unallocated = 
            userTokenBalances[msg.sender][token].unallocated + amount;
        emit FundsDeposited(msg.sender, amount, token);
    }
    
    /**
     * @dev Withdraw unallocated funds back to user's wallet
     */
    function withdrawUnallocated(
        address token,
        uint256 amount,
        address payable recipient
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        require(userTokenBalances[msg.sender][token].unallocated >= amount, 
            "Insufficient unallocated balance");
        
        userTokenBalances[msg.sender][token].unallocated = 
            userTokenBalances[msg.sender][token].unallocated - amount;
        
        if (token == ETH_ADDRESS) {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
        
        emit UnallocatedWithdraw(msg.sender, token, amount, recipient);
    }
    
    // ============ BUCKET MANAGEMENT ============
    
    /**
     * @dev Create a new spending bucket
     */
    function createBucket(
        string memory bucketName, 
        uint256 monthlyLimit
    ) external whenNotPaused {
        require(!userBuckets[msg.sender][bucketName].exists, "Bucket already exists");
        require(bytes(bucketName).length > 0, "Bucket name cannot be empty");
        require(bytes(bucketName).length <= 32, "Bucket name too long");
        
        Bucket storage newBucket = userBuckets[msg.sender][bucketName];
        newBucket.monthlyLimit = monthlyLimit;
        newBucket.lastResetTimestamp = block.timestamp;
        newBucket.exists = true;
        newBucket.active = true;
        
        userBucketNames[msg.sender].push(bucketName);
        emit BucketCreated(msg.sender, bucketName, monthlyLimit);
    }
    
    /**
     * @dev Update bucket settings
     */
    function updateBucket(
        string memory bucketName,
        uint256 newMonthlyLimit,
        bool active
    ) external bucketExists(msg.sender, bucketName) {
        Bucket storage bucket = userBuckets[msg.sender][bucketName];
        bucket.monthlyLimit = newMonthlyLimit;
        bucket.active = active;
        emit BucketUpdated(msg.sender, bucketName, newMonthlyLimit, active);
    }
    
    /**
     * @dev Fund a bucket with ETH or tokens from unallocated balance
     */
    function fundBucket(
        string memory bucketName, 
        uint256 amount,
        address token
    ) external bucketExists(msg.sender, bucketName) whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == ETH_ADDRESS) {
            require(userTokenBalances[msg.sender][ETH_ADDRESS].unallocated >= amount, 
                "Insufficient unallocated ETH");
            userTokenBalances[msg.sender][ETH_ADDRESS].unallocated = 
                userTokenBalances[msg.sender][ETH_ADDRESS].unallocated - amount;
            userBuckets[msg.sender][bucketName].balance = 
                userBuckets[msg.sender][bucketName].balance + amount;
        } else {
            require(userTokenBalances[msg.sender][token].unallocated >= amount, 
                "Insufficient unallocated tokens");
            userTokenBalances[msg.sender][token].unallocated = 
                userTokenBalances[msg.sender][token].unallocated - amount;
            userTokenBalances[msg.sender][token].bucketBalances[bucketName] = 
                userTokenBalances[msg.sender][token].bucketBalances[bucketName] + amount;
        }
        
        emit BucketFunded(msg.sender, bucketName, amount, token);
    }
    
    /**
     * @dev Transfer funds between buckets
     */
    function transferBetweenBuckets(
        string memory fromBucket,
        string memory toBucket,
        uint256 amount,
        address token
    )
        external
        bucketExists(msg.sender, fromBucket)
        bucketExists(msg.sender, toBucket)
        hasSufficientBalance(msg.sender, token, fromBucket, amount)
        whenNotPaused
    {
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == ETH_ADDRESS) {
            userBuckets[msg.sender][fromBucket].balance = 
                userBuckets[msg.sender][fromBucket].balance - amount;
            userBuckets[msg.sender][toBucket].balance = 
                userBuckets[msg.sender][toBucket].balance + amount;
        } else {
            userTokenBalances[msg.sender][token].bucketBalances[fromBucket] = 
                userTokenBalances[msg.sender][token].bucketBalances[fromBucket] - amount;
            userTokenBalances[msg.sender][token].bucketBalances[toBucket] = 
                userTokenBalances[msg.sender][token].bucketBalances[toBucket] + amount;
        }
        
        emit BucketTransfer(msg.sender, fromBucket, toBucket, amount, token);
    }
    
    // ============ SPENDING FUNCTIONS ============
    
    /**
     * @dev Internal function to spend from a specific bucket
     */
    function _spendFromBucket(
        address user,
        string memory bucketName, 
        uint256 amount, 
        address payable recipient,
        address token,
        bytes memory data
    ) 
        internal
        bucketExists(user, bucketName)
        bucketActive(user, bucketName)
        hasSufficientBalance(user, token, bucketName, amount)
    {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        
        Bucket storage bucket = userBuckets[user][bucketName];
        
        // Reset monthly spending if needed
        if (block.timestamp >= bucket.lastResetTimestamp + MONTH_SECONDS) {
            bucket.monthlySpent = 0;
            bucket.lastResetTimestamp = block.timestamp;
            emit MonthlyLimitReset(user, bucketName);
        }
        
        // Check monthly limit
        if (bucket.monthlyLimit > 0) {
            require(bucket.monthlySpent + amount <= bucket.monthlyLimit, 
                "Monthly limit exceeded");
        }
        
        // Update balances and monthly spending
        bucket.monthlySpent = bucket.monthlySpent + amount;
        
        if (token == ETH_ADDRESS) {
            bucket.balance = bucket.balance - amount;
            (bool success, ) = recipient.call{value: amount}(data);
            require(success, "ETH transfer failed");
        } else {
            userTokenBalances[user][token].bucketBalances[bucketName] = 
                userTokenBalances[user][token].bucketBalances[bucketName] - amount;
            IERC20(token).safeTransfer(recipient, amount);
            if (data.length > 0) {
                (bool success, ) = recipient.call(data);
                require(success, "Call failed");
            }
        }
        
        emit SpentFromBucket(user, bucketName, amount, recipient, token);
    }
    
    /**
     * @dev Spend from a specific bucket
     */
    function spendFromBucket(
        address user,
        string memory bucketName, 
        uint256 amount, 
        address payable recipient,
        address token,
        bytes calldata data
    ) 
        external 
        nonReentrant
        whenNotPaused
        onlyUserOrDelegate(user, bucketName)
    {
        _spendFromBucket(user, bucketName, amount, recipient, token, data);
    }
    
    /**
     * @dev Batch spend from multiple buckets
     */
    function batchSpend(
        address user,
        string[] memory bucketNames,
        uint256[] memory amounts,
        address[] memory recipients,
        address[] memory tokens,
        bytes[] memory datas
    ) external nonReentrant whenNotPaused {
        require(bucketNames.length == amounts.length, "Array length mismatch");
        require(bucketNames.length == recipients.length, "Array length mismatch");
        require(bucketNames.length == tokens.length, "Array length mismatch");
        require(bucketNames.length == datas.length, "Array length mismatch");
        
        for (uint256 i = 0; i < bucketNames.length; i++) {
            require(
                msg.sender == user || 
                userBuckets[user][bucketNames[i]].delegates[msg.sender] || 
                hasRole(ADMIN_ROLE, msg.sender),
                "Not authorized"
            );
            _spendFromBucket(
                user,
                bucketNames[i],
                amounts[i],
                payable(recipients[i]),
                tokens[i],
                datas[i]
            );
        }
    }
    
    // ============ DELEGATE MANAGEMENT ============
    
    /**
     * @dev Add a delegate who can spend from a specific bucket
     */
    function addDelegate(
        string memory bucketName, 
        address delegate
    ) external bucketExists(msg.sender, bucketName) {
        require(delegate != address(0), "Invalid delegate address");
        require(delegate != msg.sender, "Cannot delegate to self");
        
        userBuckets[msg.sender][bucketName].delegates[delegate] = true;
        emit DelegateAdded(msg.sender, delegate, bucketName);
    }
    
    /**
     * @dev Remove a delegate
     */
    function removeDelegate(
        string memory bucketName, 
        address delegate
    ) external bucketExists(msg.sender, bucketName) {
        userBuckets[msg.sender][bucketName].delegates[delegate] = false;
        emit DelegateRemoved(msg.sender, delegate, bucketName);
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @dev Emergency pause all operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause all operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw all funds (when paused)
     */
    function emergencyWithdraw(address user, address token) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenPaused
        nonReentrant 
    {
        if (token == ETH_ADDRESS) {
            uint256 totalBalance = userTokenBalances[user][ETH_ADDRESS].unallocated;
            // Add all bucket balances
            string[] memory buckets = userBucketNames[user];
            for (uint256 i = 0; i < buckets.length; i++) {
                totalBalance = totalBalance + userBuckets[user][buckets[i]].balance;
                userBuckets[user][buckets[i]].balance = 0;
            }
            userTokenBalances[user][ETH_ADDRESS].unallocated = 0;
            
            if (totalBalance > 0) {
                payable(user).transfer(totalBalance);
                emit EmergencyWithdraw(user, token, totalBalance);
            }
        } else {
            uint256 totalBalance = userTokenBalances[user][token].unallocated;
            string[] memory buckets = userBucketNames[user];
            for (uint256 i = 0; i < buckets.length; i++) {
                uint256 bucketBalance = userTokenBalances[user][token].bucketBalances[buckets[i]];
                totalBalance = totalBalance + bucketBalance;
                userTokenBalances[user][token].bucketBalances[buckets[i]] = 0;
            }
            userTokenBalances[user][token].unallocated = 0;
            
            if (totalBalance > 0) {
                IERC20(token).safeTransfer(user, totalBalance);
                emit EmergencyWithdraw(user, token, totalBalance);
            }
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get bucket information
     */
    function getBucket(address user, string memory bucketName) 
        external 
        view 
        returns (
            uint256 ethBalance,
            uint256 monthlySpent,
            uint256 monthlyLimit,
            uint256 timeUntilReset,
            bool active
        ) 
    {
        require(userBuckets[user][bucketName].exists, "Bucket does not exist");
        
        Bucket storage bucket = userBuckets[user][bucketName];
        uint256 resetTime = bucket.lastResetTimestamp + MONTH_SECONDS > block.timestamp ?
            bucket.lastResetTimestamp + MONTH_SECONDS - block.timestamp : 0;
            
        return (
            bucket.balance,
            bucket.monthlySpent,
            bucket.monthlyLimit,
            resetTime,
            bucket.active
        );
    }
    
    /**
     * @dev Get bucket balance for a specific token
     */
    function getBucketBalance(address user, address token, string memory bucketName) 
        public 
        view 
        returns (uint256) 
    {
        if (!userBuckets[user][bucketName].exists) return 0;
        
        if (token == ETH_ADDRESS) {
            return userBuckets[user][bucketName].balance;
        }
        return userTokenBalances[user][token].bucketBalances[bucketName];
    }
    
    /**
     * @dev Get unallocated balance for a token
     */
    function getUnallocatedBalance(address user, address token) 
        external 
        view 
        returns (uint256) 
    {
        return userTokenBalances[user][token].unallocated;
    }
    
    /**
     * @dev Get all bucket names for a user
     */
    function getUserBuckets(address user) external view returns (string[] memory) {
        return userBucketNames[user];
    }
    
    /**
     * @dev Check if an address is a delegate for a bucket
     */
    function isDelegate(address user, string memory bucketName, address delegate) 
        external 
        view 
        returns (bool) 
    {
        return userBuckets[user][bucketName].delegates[delegate];
    }
    
    /**
     * @dev Get user's total balance across all buckets and unallocated
     */
    function getTotalBalance(address user, address token) 
        external 
        view 
        returns (uint256 total) 
    {
        total = userTokenBalances[user][token].unallocated;
        
        string[] memory buckets = userBucketNames[user];
        for (uint256 i = 0; i < buckets.length; i++) {
            total = total + getBucketBalance(user, token, buckets[i]);
        }
        
        return total;
    }
    
    /**
     * @dev Check if spending is allowed from bucket
     */
    function canSpendFromBucket(
        address user, 
        string memory bucketName, 
        uint256 amount
    ) external view returns (bool canSpend, string memory reason) {
        if (!userBuckets[user][bucketName].exists) {
            return (false, "Bucket does not exist");
        }
        
        if (!userBuckets[user][bucketName].active) {
            return (false, "Bucket is inactive");
        }
        
        Bucket storage bucket = userBuckets[user][bucketName];
        
        // Check balance
        if (bucket.balance < amount) {
            return (false, "Insufficient bucket balance");
        }
        
        // Check monthly limit
        if (bucket.monthlyLimit > 0) {
            uint256 currentMonthlySpent = bucket.monthlySpent;
            
            // Reset if needed
            if (block.timestamp >= bucket.lastResetTimestamp + MONTH_SECONDS) {
                currentMonthlySpent = 0;
            }
            
            if (currentMonthlySpent + amount > bucket.monthlyLimit) {
                return (false, "Would exceed monthly limit");
            }
        }
        
        return (true, "");
    }
    
    // ============ RECEIVE FUNCTION ============
    
    /**
     * @dev Receive ETH deposits
     */
    receive() external payable {
        userTokenBalances[msg.sender][ETH_ADDRESS].unallocated = 
            userTokenBalances[msg.sender][ETH_ADDRESS].unallocated + msg.value;
        emit FundsDeposited(msg.sender, msg.value, ETH_ADDRESS);
    }
}