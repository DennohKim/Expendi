// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IExpendiBucketManagerAutomation
 * @dev Interface for ExpendiBucketManagerAutomation contract
 */
interface IExpendiBucketManagerAutomation {
    
    // ============ STRUCTURES ============
    
    struct AutomationStats {
        uint256 totalPaymentsProcessed;
        uint256 totalFailedPayments;
        uint256 totalGasUsed;
        uint256 upkeepCount;
        uint256 trackedUsersCount;
        uint256 lastUpkeepTimestamp;
    }
    
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
    
    // ============ SUBSCRIPTION TRACKING ============
    
    function trackUserSubscription(address user, uint256 subscriptionId) external;
    function untrackUserSubscription(address user, uint256 subscriptionId) external;
    function getTrackedUserSubscriptions(address user) external view returns (uint256[] memory);
    function getTrackedUsers() external view returns (address[] memory);
    
    // ============ AUTOMATION FUNCTIONS ============
    
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
    function manualUpkeep() external;
    
    // ============ VIEW FUNCTIONS ============
    
    function isSubscriptionDue(address user, uint256 subscriptionId) external view returns (bool);
    function getAutomationStats() external view returns (AutomationStats memory);
    
    // ============ ADMIN FUNCTIONS ============
    
    function updateAutomationConfig(uint256 checkInterval, uint256 maxBatchSize) external;
    function emergencyPauseUser(address user, bool paused) external;
    function emergencyPauseSubscription(uint256 subscriptionId, bool paused) external;
    function pauseAutomation() external;
    function unpauseAutomation() external;
}