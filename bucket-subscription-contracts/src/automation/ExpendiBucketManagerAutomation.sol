// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../ExpendiBucketManager.sol";

/**
 * @title ExpendiBucketManagerAutomation
 * @dev Chainlink Automation contract for processing ExpendiBucketManager subscription payments
 * @notice This contract automatically triggers subscription payments when they are due
 */
contract ExpendiBucketManagerAutomation is AutomationCompatibleInterface, AccessControl, ReentrancyGuard, Pausable {
    
    // ============ CONSTANTS ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AUTOMATION_ROLE = keccak256("AUTOMATION_ROLE");
    
    uint256 public constant MAX_SUBSCRIPTIONS_PER_BATCH = 10;
    uint256 public constant MIN_CHECK_INTERVAL = 60; // 1 minute minimum
    uint256 public constant MAX_CHECK_INTERVAL = 3600; // 1 hour maximum
    uint256 public constant MAX_GAS_PER_SUBSCRIPTION = 200000; // Conservative gas estimate
    
    // ============ STATE VARIABLES ============
    
    ExpendiBucketManager public immutable bucketManager;
    
    // Automation configuration
    uint256 public checkInterval = 300; // 5 minutes default
    uint256 public lastUpkeepTimestamp;
    uint256 public maxBatchSize = 5; // Start conservative
    
    // Subscription tracking
    mapping(address => uint256[]) public trackedUserSubscriptions;
    address[] public trackedUsers;
    mapping(address => bool) public isUserTracked;
    
    // Performance monitoring
    uint256 public totalPaymentsProcessed;
    uint256 public totalFailedPayments;
    uint256 public totalGasUsed;
    uint256 public upkeepCount;
    
    // Emergency controls
    mapping(address => bool) public pausedUsers;
    mapping(uint256 => bool) public pausedSubscriptions;
    
    // ============ EVENTS ============
    
    event AutomationUpkeepPerformed(
        uint256 indexed upkeepId,
        uint256 subscriptionsChecked,
        uint256 paymentsProcessed,
        uint256 gasUsed,
        uint256 timestamp
    );
    
    event SubscriptionPaymentProcessed(
        address indexed user,
        uint256 indexed subscriptionId,
        bool success,
        string reason,
        uint256 gasUsed
    );
    
    event UserSubscriptionTracked(
        address indexed user,
        uint256 indexed subscriptionId,
        uint256 nextChargeTimestamp
    );
    
    event UserSubscriptionUntracked(
        address indexed user,
        uint256 indexed subscriptionId
    );
    
    event AutomationConfigUpdated(
        uint256 oldCheckInterval,
        uint256 newCheckInterval,
        uint256 oldMaxBatchSize,
        uint256 newMaxBatchSize
    );
    
    event EmergencyPauseUser(
        address indexed user,
        bool paused,
        uint256 timestamp
    );
    
    event EmergencyPauseSubscription(
        uint256 indexed subscriptionId,
        bool paused,
        uint256 timestamp
    );
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _bucketManager) {
        require(_bucketManager != address(0), "Invalid bucket manager address");
        
        bucketManager = ExpendiBucketManager(_bucketManager);
        lastUpkeepTimestamp = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(AUTOMATION_ROLE, msg.sender);
    }
    
    // ============ AUTOMATION INTERFACE ============
    
    /**
     * @dev Chainlink Automation checkUpkeep function
     * @notice Checks if any subscriptions are due for payment
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (
        bool upkeepNeeded,
        bytes memory performData
    ) {
        // Check if enough time has passed since last upkeep
        if (block.timestamp < lastUpkeepTimestamp + checkInterval) {
            return (false, "");
        }
        
        // Find subscriptions due for payment
        (address[] memory dueUsers, uint256[] memory dueSubscriptionIds) = _getSubscriptionsDue();
        
        if (dueUsers.length > 0) {
            // Limit to maxBatchSize to prevent gas issues
            uint256 batchSize = dueUsers.length > maxBatchSize ? maxBatchSize : dueUsers.length;
            
            address[] memory batchUsers = new address[](batchSize);
            uint256[] memory batchSubscriptionIds = new uint256[](batchSize);
            
            for (uint256 i = 0; i < batchSize; i++) {
                batchUsers[i] = dueUsers[i];
                batchSubscriptionIds[i] = dueSubscriptionIds[i];
            }
            
            performData = abi.encode(batchUsers, batchSubscriptionIds);
            upkeepNeeded = true;
        }
    }
    
    /**
     * @dev Chainlink Automation performUpkeep function
     * @notice Processes subscription payments that are due
     */
    function performUpkeep(
        bytes calldata performData
    ) external override nonReentrant whenNotPaused {
        require(
            hasRole(AUTOMATION_ROLE, msg.sender) || msg.sender == address(this),
            "Unauthorized automation caller"
        );
        
        (address[] memory users, uint256[] memory subscriptionIds) = abi.decode(
            performData,
            (address[], uint256[])
        );
        
        require(users.length == subscriptionIds.length, "Mismatched arrays");
        require(users.length <= maxBatchSize, "Batch too large");
        
        uint256 startGas = gasleft();
        uint256 paymentsProcessed = 0;
        uint256 subscriptionsChecked = users.length;
        
        // Process each subscription payment
        for (uint256 i = 0; i < users.length; i++) {
            if (gasleft() < MAX_GAS_PER_SUBSCRIPTION) {
                break; // Prevent out of gas
            }
            
            bool success = _processSubscriptionPayment(users[i], subscriptionIds[i]);
            if (success) {
                paymentsProcessed++;
            }
        }
        
        // Update state
        lastUpkeepTimestamp = block.timestamp;
        upkeepCount++;
        totalPaymentsProcessed += paymentsProcessed;
        
        uint256 gasUsed = startGas - gasleft();
        totalGasUsed += gasUsed;
        
        emit AutomationUpkeepPerformed(
            upkeepCount,
            subscriptionsChecked,
            paymentsProcessed,
            gasUsed,
            block.timestamp
        );
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Get all subscriptions that are due for payment
     */
    function _getSubscriptionsDue() internal view returns (
        address[] memory dueUsers,
        uint256[] memory dueSubscriptionIds
    ) {
        uint256 maxPossibleDue = 0;
        
        // Count maximum possible due subscriptions
        for (uint256 i = 0; i < trackedUsers.length; i++) {
            maxPossibleDue += trackedUserSubscriptions[trackedUsers[i]].length;
        }
        
        // Temporary arrays with max size
        address[] memory tempUsers = new address[](maxPossibleDue);
        uint256[] memory tempSubscriptionIds = new uint256[](maxPossibleDue);
        uint256 dueCount = 0;
        
        // Check each tracked user's subscriptions
        for (uint256 i = 0; i < trackedUsers.length; i++) {
            address user = trackedUsers[i];
            
            if (pausedUsers[user]) continue;
            
            uint256[] memory userSubscriptions = trackedUserSubscriptions[user];
            
            for (uint256 j = 0; j < userSubscriptions.length; j++) {
                uint256 subscriptionId = userSubscriptions[j];
                
                if (pausedSubscriptions[subscriptionId]) continue;
                
                // Check if subscription is due
                if (_isSubscriptionDue(user, subscriptionId)) {
                    tempUsers[dueCount] = user;
                    tempSubscriptionIds[dueCount] = subscriptionId;
                    dueCount++;
                }
            }
        }
        
        // Create properly sized return arrays
        dueUsers = new address[](dueCount);
        dueSubscriptionIds = new uint256[](dueCount);
        
        for (uint256 i = 0; i < dueCount; i++) {
            dueUsers[i] = tempUsers[i];
            dueSubscriptionIds[i] = tempSubscriptionIds[i];
        }
    }
    
    /**
     * @dev Check if a specific subscription is due for payment
     */
    function _isSubscriptionDue(address user, uint256 subscriptionId) internal view returns (bool) {
        try bucketManager.getSubscriptionInfo(user, subscriptionId) returns (
            ExpendiBucketManager.SubscriptionInfo memory subscription
        ) {
            return subscription.isActive && 
                   block.timestamp >= subscription.nextChargeTimestamp &&
                   subscription.userConsent;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Process a single subscription payment
     */
    function _processSubscriptionPayment(address user, uint256 subscriptionId) internal returns (bool) {
        uint256 gasStart = gasleft();
        
        try bucketManager.processSubscriptionPayment(user, subscriptionId) {
            uint256 gasUsed = gasStart - gasleft();
            
            emit SubscriptionPaymentProcessed(
                user,
                subscriptionId,
                true,
                "Payment successful",
                gasUsed
            );
            
            return true;
            
        } catch Error(string memory reason) {
            totalFailedPayments++;
            uint256 gasUsed = gasStart - gasleft();
            
            emit SubscriptionPaymentProcessed(
                user,
                subscriptionId,
                false,
                reason,
                gasUsed
            );
            
            return false;
            
        } catch {
            totalFailedPayments++;
            uint256 gasUsed = gasStart - gasleft();
            
            emit SubscriptionPaymentProcessed(
                user,
                subscriptionId,
                false,
                "Unknown error",
                gasUsed
            );
            
            return false;
        }
    }
    
    // ============ SUBSCRIPTION TRACKING ============
    
    /**
     * @dev Add a subscription to tracking
     * @notice This should be called when subscriptions are created
     */
    function trackUserSubscription(
        address user,
        uint256 subscriptionId
    ) external onlyRole(ADMIN_ROLE) {
        require(user != address(0), "Invalid user address");
        
        // Add user to tracking if not already tracked
        if (!isUserTracked[user]) {
            trackedUsers.push(user);
            isUserTracked[user] = true;
        }
        
        // Add subscription to user's tracked subscriptions
        trackedUserSubscriptions[user].push(subscriptionId);
        
        // Get next charge timestamp for event
        try bucketManager.getSubscriptionInfo(user, subscriptionId) returns (
            ExpendiBucketManager.SubscriptionInfo memory subscription
        ) {
            emit UserSubscriptionTracked(user, subscriptionId, subscription.nextChargeTimestamp);
        } catch {
            emit UserSubscriptionTracked(user, subscriptionId, 0);
        }
    }
    
    /**
     * @dev Remove a subscription from tracking
     * @notice This should be called when subscriptions are cancelled
     */
    function untrackUserSubscription(
        address user,
        uint256 subscriptionId
    ) external onlyRole(ADMIN_ROLE) {
        uint256[] storage userSubscriptions = trackedUserSubscriptions[user];
        
        for (uint256 i = 0; i < userSubscriptions.length; i++) {
            if (userSubscriptions[i] == subscriptionId) {
                // Remove subscription by replacing with last element
                userSubscriptions[i] = userSubscriptions[userSubscriptions.length - 1];
                userSubscriptions.pop();
                
                emit UserSubscriptionUntracked(user, subscriptionId);
                break;
            }
        }
        
        // If user has no more subscriptions, remove from tracking
        if (userSubscriptions.length == 0) {
            _removeUserFromTracking(user);
        }
    }
    
    /**
     * @dev Remove user from tracking entirely
     */
    function _removeUserFromTracking(address user) internal {
        for (uint256 i = 0; i < trackedUsers.length; i++) {
            if (trackedUsers[i] == user) {
                trackedUsers[i] = trackedUsers[trackedUsers.length - 1];
                trackedUsers.pop();
                isUserTracked[user] = false;
                break;
            }
        }
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Update automation configuration
     */
    function updateAutomationConfig(
        uint256 _checkInterval,
        uint256 _maxBatchSize
    ) external onlyRole(ADMIN_ROLE) {
        require(_checkInterval >= MIN_CHECK_INTERVAL && _checkInterval <= MAX_CHECK_INTERVAL, "Invalid check interval");
        require(_maxBatchSize > 0 && _maxBatchSize <= MAX_SUBSCRIPTIONS_PER_BATCH, "Invalid batch size");
        
        uint256 oldCheckInterval = checkInterval;
        uint256 oldMaxBatchSize = maxBatchSize;
        
        checkInterval = _checkInterval;
        maxBatchSize = _maxBatchSize;
        
        emit AutomationConfigUpdated(oldCheckInterval, _checkInterval, oldMaxBatchSize, _maxBatchSize);
    }
    
    /**
     * @dev Emergency pause specific user's subscriptions
     */
    function emergencyPauseUser(address user, bool paused) external onlyRole(ADMIN_ROLE) {
        pausedUsers[user] = paused;
        emit EmergencyPauseUser(user, paused, block.timestamp);
    }
    
    /**
     * @dev Emergency pause specific subscription
     */
    function emergencyPauseSubscription(uint256 subscriptionId, bool paused) external onlyRole(ADMIN_ROLE) {
        pausedSubscriptions[subscriptionId] = paused;
        emit EmergencyPauseSubscription(subscriptionId, paused, block.timestamp);
    }
    
    /**
     * @dev Pause entire automation contract
     */
    function pauseAutomation() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause automation contract
     */
    function unpauseAutomation() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get tracked subscriptions for a user
     */
    function getTrackedUserSubscriptions(address user) external view returns (uint256[] memory) {
        return trackedUserSubscriptions[user];
    }
    
    /**
     * @dev Get all tracked users
     */
    function getTrackedUsers() external view returns (address[] memory) {
        return trackedUsers;
    }
    
    /**
     * @dev Get subscription due status
     */
    function isSubscriptionDue(address user, uint256 subscriptionId) external view returns (bool) {
        return _isSubscriptionDue(user, subscriptionId);
    }
    
    /**
     * @dev Get automation statistics
     */
    function getAutomationStats() external view returns (
        uint256 _totalPaymentsProcessed,
        uint256 _totalFailedPayments,
        uint256 _totalGasUsed,
        uint256 _upkeepCount,
        uint256 _trackedUsersCount,
        uint256 _lastUpkeepTimestamp
    ) {
        return (
            totalPaymentsProcessed,
            totalFailedPayments,
            totalGasUsed,
            upkeepCount,
            trackedUsers.length,
            lastUpkeepTimestamp
        );
    }
    
    /**
     * @dev Manual trigger for testing (admin only)
     */
    function manualUpkeep() external onlyRole(ADMIN_ROLE) {
        (bool upkeepNeeded, bytes memory performData) = this.checkUpkeep("");
        
        if (upkeepNeeded) {
            this.performUpkeep(performData);
        }
    }
}