// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISubscriptionDataManager {
    function createSubscription(
        address user,
        uint256 amount,
        uint256 periodInDays,
        address token,
        address recipient,
        string memory metadata
    ) external returns (uint256);
    
    function cancelSubscription(uint256 subscriptionId) external;
    function pauseSubscription(uint256 subscriptionId) external;
}