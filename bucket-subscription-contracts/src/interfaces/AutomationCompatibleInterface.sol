// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AutomationCompatibleInterface
 * @dev Interface for contracts that can be automated by Chainlink Automation
 * @notice This is the interface that automation-compatible contracts must implement
 */
interface AutomationCompatibleInterface {
    /**
     * @notice Checks if upkeep is needed
     * @dev This function is called off-chain by Chainlink Automation to determine if performUpkeep should be called
     * @param checkData Data passed to the contract when checking for upkeep
     * @return upkeepNeeded Boolean indicating whether upkeep is needed
     * @return performData Data to be passed to performUpkeep if upkeep is needed
     */
    function checkUpkeep(
        bytes calldata checkData
    ) external view returns (bool upkeepNeeded, bytes memory performData);

    /**
     * @notice Performs the upkeep
     * @dev This function is called on-chain when checkUpkeep returns true
     * @param performData Data returned from checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external;
}

/**
 * @title AutomationBase
 * @dev Base contract that provides common functionality for automation-compatible contracts
 */
abstract contract AutomationBase {
    error OnlySimulatedBackend();

    /**
     * @notice Prevents execution unless called from off-chain simulation
     * @dev This modifier ensures that certain functions can only be called during simulation
     */
    modifier cannotExecute() {
        revert OnlySimulatedBackend();
        _;
    }
}

/**
 * @title AutomationCompatible
 * @dev Abstract contract that combines the interface and base functionality
 * @notice Inherit from this contract to make your contract automation-compatible
 */
abstract contract AutomationCompatible is AutomationBase, AutomationCompatibleInterface {}