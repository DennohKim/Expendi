// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IExpendiSubscriptions
 * @dev Interface for ExpendiSubscriptions contract
 */
interface IExpendiSubscriptions {
    // Structs
    struct Subscription {
        address payer;
        address recipient;
        address token;
        uint256 amount;
        uint256 periodInDays;
        uint256 lastChargeTimestamp;
        uint256 nextChargeTimestamp;
        uint256 maxAllowedAmount;
        bool isActive;
        bool isPaused;
        uint256 totalCharged;
        uint256 chargeCount;
        string metadata;
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

    // Permission functions
    function grantPermission(
        address spender,
        address token,
        uint256 allowedAmount,
        uint256 periodInSeconds,
        uint256 expiryTimestamp
    ) external;

    function revokePermission(address spender) external;

    // Subscription functions
    function createSubscription(
        address payer,
        address recipient,
        uint256 amount,
        uint256 periodInDays,
        uint256 nextChargeTimestamp,
        string memory metadata
    ) external returns (bytes32 subscriptionId);

    function chargeSubscription(bytes32 subscriptionId) external;
    function pauseSubscription(bytes32 subscriptionId) external;
    function resumeSubscription(bytes32 subscriptionId) external;
    function cancelSubscription(bytes32 subscriptionId) external;

    // View functions
    function getSubscription(bytes32 subscriptionId) external view returns (Subscription memory);
    function getUserSubscriptions(address user) external view returns (bytes32[] memory);
    function getRecipientSubscriptions(address recipient) external view returns (bytes32[] memory);
    function getPermission(address owner, address spender) external view returns (Permission memory);
    function isSubscriptionDue(bytes32 subscriptionId) external view returns (bool);
}