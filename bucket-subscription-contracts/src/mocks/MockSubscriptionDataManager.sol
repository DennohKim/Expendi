// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ISubscriptionDataManager.sol";

contract MockSubscriptionDataManager is ISubscriptionDataManager {
    uint256 private nextSubscriptionId = 1;
    mapping(uint256 => bool) public subscriptionExists;
    mapping(uint256 => bool) public subscriptionActive;
    
    event SubscriptionCreated(uint256 indexed subscriptionId, address indexed user, uint256 amount);
    event SubscriptionCancelled(uint256 indexed subscriptionId);
    event SubscriptionPaused(uint256 indexed subscriptionId);
    
    function createSubscription(
        address user,
        uint256 amount,
        uint256 periodInDays,
        address token,
        address recipient,
        string memory metadata
    ) external returns (uint256) {
        uint256 subscriptionId = nextSubscriptionId++;
        subscriptionExists[subscriptionId] = true;
        subscriptionActive[subscriptionId] = true;
        
        emit SubscriptionCreated(subscriptionId, user, amount);
        return subscriptionId;
    }
    
    function cancelSubscription(uint256 subscriptionId) external {
        require(subscriptionExists[subscriptionId], "Subscription does not exist");
        subscriptionActive[subscriptionId] = false;
        emit SubscriptionCancelled(subscriptionId);
    }
    
    function pauseSubscription(uint256 subscriptionId) external {
        require(subscriptionExists[subscriptionId], "Subscription does not exist");
        subscriptionActive[subscriptionId] = false;
        emit SubscriptionPaused(subscriptionId);
    }
}