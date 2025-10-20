// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISubscriptionPaymentProcessor {
    function processPayment(
        uint256 subscriptionId,
        uint256 amount,
        address recipient
    ) external;
}