// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../ExpendiBucketManager.sol";
import "./ExpendiBucketManagerAutomation.sol";

/**
 * @title AutomationSubscriptionTracker
 * @dev Helper contract to automatically track subscriptions in automation when they're created
 * @notice This contract listens to subscription creation events and automatically adds them to automation tracking
 */
contract AutomationSubscriptionTracker is AccessControl {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    ExpendiBucketManager public immutable bucketManager;
    ExpendiBucketManagerAutomation public immutable automation;
    
    // Track which subscriptions are already being tracked
    mapping(address => mapping(uint256 => bool)) public isSubscriptionTracked;
    
    // Events
    event SubscriptionAutoTracked(
        address indexed user,
        uint256 indexed subscriptionId,
        uint256 nextChargeTimestamp
    );
    
    event SubscriptionAutoUntracked(
        address indexed user,
        uint256 indexed subscriptionId
    );
    
    constructor(
        address _bucketManager,
        address _automation
    ) {
        require(_bucketManager != address(0), "Invalid bucket manager");
        require(_automation != address(0), "Invalid automation contract");
        
        bucketManager = ExpendiBucketManager(_bucketManager);
        automation = ExpendiBucketManagerAutomation(_automation);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Automatically track a subscription when it's created
     * @notice Call this after creating a subscription to add it to automation
     */
    function trackNewSubscription(
        address user,
        uint256 subscriptionId
    ) external onlyRole(ADMIN_ROLE) {
        require(!isSubscriptionTracked[user][subscriptionId], "Already tracked");
        
        // Verify subscription exists and is active
        try bucketManager.getSubscriptionInfo(user, subscriptionId) returns (
            ExpendiBucketManager.SubscriptionInfo memory subscription
        ) {
            require(subscription.isActive, "Subscription not active");
            require(subscription.userConsent, "No user consent");
            
            // Track in automation
            automation.trackUserSubscription(user, subscriptionId);
            isSubscriptionTracked[user][subscriptionId] = true;
            
            emit SubscriptionAutoTracked(user, subscriptionId, subscription.nextChargeTimestamp);
            
        } catch {
            revert("Subscription not found or invalid");
        }
    }
    
    /**
     * @dev Automatically untrack a subscription when it's cancelled
     */
    function untrackCancelledSubscription(
        address user,
        uint256 subscriptionId
    ) external onlyRole(ADMIN_ROLE) {
        require(isSubscriptionTracked[user][subscriptionId], "Not tracked");
        
        // Untrack from automation
        automation.untrackUserSubscription(user, subscriptionId);
        isSubscriptionTracked[user][subscriptionId] = false;
        
        emit SubscriptionAutoUntracked(user, subscriptionId);
    }
    
    /**
     * @dev Batch track multiple subscriptions
     */
    function batchTrackSubscriptions(
        address[] calldata users,
        uint256[] calldata subscriptionIds
    ) external onlyRole(ADMIN_ROLE) {
        require(users.length == subscriptionIds.length, "Mismatched arrays");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (!isSubscriptionTracked[users[i]][subscriptionIds[i]]) {
                try this.trackNewSubscription(users[i], subscriptionIds[i]) {
                    // Success
                } catch {
                    // Continue with next subscription if one fails
                }
            }
        }
    }
    
    /**
     * @dev Scan and auto-track all existing active subscriptions
     * @notice This is a gas-intensive operation, use carefully
     */
    function scanAndTrackActiveSubscriptions(uint256 maxUsers) external onlyRole(ADMIN_ROLE) {
        require(maxUsers > 0 && maxUsers <= 100, "Invalid max users");
        
        // Get all active subscriptions from bucket manager
        try bucketManager.getAllActiveSubscriptions() returns (
            address[] memory users,
            uint256[] memory subscriptionIds,
            uint256[] memory nextChargeTimestamps
        ) {
            uint256 tracked = 0;
            
            for (uint256 i = 0; i < users.length && tracked < maxUsers; i++) {
                if (!isSubscriptionTracked[users[i]][subscriptionIds[i]]) {
                    try this.trackNewSubscription(users[i], subscriptionIds[i]) {
                        tracked++;
                    } catch {
                        // Continue if tracking fails
                    }
                }
            }
        } catch {
            revert("Failed to get active subscriptions");
        }
    }
    
    /**
     * @dev Check if a subscription is being tracked
     */
    function checkSubscriptionTracking(
        address user,
        uint256 subscriptionId
    ) external view returns (
        bool isTracked,
        bool isActive,
        uint256 nextChargeTimestamp
    ) {
        isTracked = isSubscriptionTracked[user][subscriptionId];
        
        try bucketManager.getSubscriptionInfo(user, subscriptionId) returns (
            ExpendiBucketManager.SubscriptionInfo memory subscription
        ) {
            isActive = subscription.isActive;
            nextChargeTimestamp = subscription.nextChargeTimestamp;
        } catch {
            isActive = false;
            nextChargeTimestamp = 0;
        }
    }
    
    /**
     * @dev Get tracking stats
     */
    function getTrackingStats() external view returns (
        uint256 totalTrackedUsers,
        uint256 totalTrackedSubscriptions
    ) {
        address[] memory trackedUsers = automation.getTrackedUsers();
        totalTrackedUsers = trackedUsers.length;
        
        for (uint256 i = 0; i < trackedUsers.length; i++) {
            uint256[] memory userSubscriptions = automation.getTrackedUserSubscriptions(trackedUsers[i]);
            totalTrackedSubscriptions += userSubscriptions.length;
        }
    }
}