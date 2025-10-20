// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ISubscriptionPaymentProcessor.sol";

contract MockSubscriptionPaymentProcessor is ISubscriptionPaymentProcessor {
    event PaymentProcessed(uint256 indexed subscriptionId, uint256 amount, address recipient);
    
    function processPayment(
        uint256 subscriptionId,
        uint256 amount,
        address recipient
    ) external {
        emit PaymentProcessed(subscriptionId, amount, recipient);
    }
}