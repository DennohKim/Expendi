// SPDX-License-Identifier: MIT
pragma solidity >=0.4.16 >=0.6.2 >=0.8.4 ^0.8.20;

// lib/openzeppelin-contracts/contracts/access/IAccessControl.sol

// OpenZeppelin Contracts (last updated v5.4.0) (access/IAccessControl.sol)

/**
 * @dev External interface of AccessControl declared to support ERC-165 detection.
 */
interface IAccessControl {
    /**
     * @dev The `account` is missing a role.
     */
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);

    /**
     * @dev The caller of a function is not the expected one.
     *
     * NOTE: Don't confuse with {AccessControlUnauthorizedAccount}.
     */
    error AccessControlBadConfirmation();

    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted to signal this.
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call. This account bears the admin role (for the granted role).
     * Expected in cases where the role was granted using the internal {AccessControl-_grantRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {AccessControl-_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     */
    function renounceRole(bytes32 role, address callerConfirmation) external;
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// src/interfaces/ISubscriptionDataManager.sol

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

// src/interfaces/ISubscriptionPaymentProcessor.sol

interface ISubscriptionPaymentProcessor {
    function processPayment(
        uint256 subscriptionId,
        uint256 amount,
        address recipient
    ) external;
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

// lib/openzeppelin-contracts/contracts/utils/Pausable.sol

// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// lib/openzeppelin-contracts/contracts/utils/introspection/ERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/ERC165.sol)

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC-165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 */
abstract contract ERC165 is IERC165 {
    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

// lib/openzeppelin-contracts/contracts/access/AccessControl.sol

// OpenZeppelin Contracts (last updated v5.4.0) (access/AccessControl.sol)

/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms. This is a lightweight version that doesn't allow enumerating role
 * members except through off-chain means by accessing the contract event logs. Some
 * applications may benefit from on-chain enumerability, for those cases see
 * {AccessControlEnumerable}.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```solidity
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```solidity
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it. We recommend using {AccessControlDefaultAdminRules}
 * to enforce additional security measures for this role.
 */
abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    mapping(bytes32 role => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with an {AccessControlUnauthorizedAccount} error including the required role.
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `_msgSender()`
     * is missing `role`. Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `account`
     * is missing `role`.
     */
    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleGranted} event.
     */
    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleRevoked} event.
     */
    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     *
     * May emit a {RoleRevoked} event.
     */
    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Attempts to grant `role` to `account` and returns a boolean indicating if `role` was granted.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleGranted} event.
     */
    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Attempts to revoke `role` from `account` and returns a boolean indicating if `role` was revoked.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleRevoked} event.
     */
    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}

// src/ExpendiBucketManager.sol

/**
 * @title ExpendiBucketManager
 * @dev Secure bucket-based subscription system with external subscription integration
 * @notice This contract manages both one-time payments and subscriptions tied to specific spending buckets
 */
contract ExpendiBucketManager is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    uint256 public constant MONTH_SECONDS = 30 days;
    uint256 public constant MIN_SUBSCRIPTION_AMOUNT = 1e6; // 1 USDC (6 decimals)
    uint256 public constant MAX_SUBSCRIPTION_AMOUNT = 1000000e6; // 1M USDC
    uint256 public constant MAX_SUBSCRIPTIONS_PER_BUCKET = 50;
    address public constant ETH_ADDRESS = address(0);
    
    // ============ ROLES ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SUBSCRIPTION_MANAGER_ROLE = keccak256("SUBSCRIPTION_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // ============ STATE VARIABLES ============
    
    // External subscription service contract addresses
    address public immutable SUBSCRIPTION_DATA_MANAGER;
    address public immutable SUBSCRIPTION_PAYMENT_PROCESSOR;
    
    // Security: Rate limiting
    mapping(address => uint256) public lastOperationTimestamp;
    mapping(address => uint256) public lastSubscriptionCreation;
    uint256 public constant MIN_OPERATION_INTERVAL = 300; // 5 minutes
    uint256 public constant SUBSCRIPTION_CREATION_COOLDOWN = 1 hours;
    
    // Bucket structures
    struct Bucket {
        uint256 balance;              // Current ETH balance in bucket
        uint256 monthlySpent;         // Amount spent this month
        uint256 monthlyLimit;         // Monthly spending limit (0 = no limit)
        uint256 lastResetTimestamp;   // When monthly counter was last reset
        bool exists;                  // Whether bucket exists
        bool active;                  // Whether bucket is active for spending
        mapping(address => uint256) tokenBalances;  // token => balance
        uint256[] subscriptionIds;                  // List of active subscription IDs
        uint256 subscriptionCount;                  // Count of subscriptions
    }
    
    struct SubscriptionInfo {
        uint256 subscriptionId;       // Spheron subscription ID
        string bucketName;           // Source bucket
        uint256 amount;              // Amount per period
        uint256 periodInDays;        // Billing period
        address token;               // Payment token
        address recipient;           // Payment recipient
        bool isActive;               // Subscription status
        uint256 nextChargeTimestamp; // Next charge time
        uint256 totalCharged;        // Total amount charged
        uint256 chargeCount;         // Number of charges
        uint256 createdAt;           // Creation timestamp
        uint256 lastProcessedAt;     // Last processing timestamp
        bool userConsent;            // Explicit user consent
    }

    // State mappings
    mapping(address => mapping(string => Bucket)) public userBuckets;
    mapping(address => string[]) public userBucketNames;
    mapping(address => mapping(address => uint256)) public userTokenBalances; // user => token => balance
    mapping(address => mapping(uint256 => SubscriptionInfo)) public userSubscriptions; // user => subscriptionId => info
    mapping(address => uint256[]) public userSubscriptionIds; // user => subscriptionIds[]
    
    // Security: Emergency pause for specific users
    mapping(address => bool) public emergencyPausedUsers;
    
    // ============ EVENTS ============
    
    // Bucket Management Events
    event BucketCreated(
        address indexed user,
        string indexed bucketName,
        uint256 monthlyLimit,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketFunded(
        address indexed user,
        string indexed bucketName,
        uint256 amount,
        address indexed token,
        uint256 newBalance,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketDeleted(
        address indexed user,
        string indexed bucketName,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Payment Events
    event OneTimePaymentMade(
        address indexed user,
        string indexed bucketName,
        uint256 amount,
        address indexed token,
        address recipient,
        string description,
        uint256 newBucketBalance,
        uint256 monthlySpent,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Subscription Events
    event BucketSubscriptionCreated(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 amount,
        uint256 periodInDays,
        address recipient,
        address token,
        uint256 nextChargeTimestamp,
        bool userConsent,
        string metadata,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketSubscriptionCharged(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 amount,
        address token,
        address recipient,
        uint256 newBucketBalance,
        uint256 totalCharged,
        uint256 chargeCount,
        uint256 nextChargeTimestamp,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketSubscriptionCancelled(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 totalCharged,
        uint256 chargeCount,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketSubscriptionPaused(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketSubscriptionResumed(
        address indexed user,
        string indexed bucketName,
        uint256 indexed subscriptionId,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Monthly Limit Events
    event MonthlyLimitReset(
        address indexed user,
        string indexed bucketName,
        uint256 oldSpent,
        uint256 newLimit,
        uint256 resetTimestamp,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event MonthlyLimitUpdated(
        address indexed user,
        string indexed bucketName,
        uint256 oldLimit,
        uint256 newLimit,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Bucket Analytics Events
    event BucketBalanceChanged(
        address indexed user,
        string indexed bucketName,
        address indexed token,
        uint256 oldBalance,
        uint256 newBalance,
        uint256 changeAmount,
        string changeType, // "fund", "payment", "subscription", "withdrawal"
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event BucketMonthlySpendingUpdated(
        address indexed user,
        string indexed bucketName,
        uint256 oldMonthlySpent,
        uint256 newMonthlySpent,
        uint256 monthlyLimit,
        uint256 spendingPercentage,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Security Events
    event EmergencyPause(
        address indexed user,
        bool paused,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event SecurityEvent(
        address indexed user,
        string indexed eventType,
        string details,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    // Analytics Events
    event UserActivity(
        address indexed user,
        string indexed activityType, // "bucket_created", "subscription_created", "payment_made", etc.
        string bucketName,
        uint256 amount,
        address indexed token,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event SubscriptionAnalytics(
        address indexed user,
        uint256 indexed subscriptionId,
        string indexed bucketName,
        uint256 totalCharged,
        uint256 chargeCount,
        uint256 periodInDays,
        address recipient,
        uint256 timestamp,
        uint256 blockNumber
    );

    // ============ CONSTRUCTOR ============
    
    constructor(
        address _subscriptionDataManager,
        address _subscriptionPaymentProcessor
    ) {
        require(_subscriptionDataManager != address(0), "Invalid subscription data manager address");
        require(_subscriptionPaymentProcessor != address(0), "Invalid subscription payment processor address");
        
        SUBSCRIPTION_DATA_MANAGER = _subscriptionDataManager;
        SUBSCRIPTION_PAYMENT_PROCESSOR = _subscriptionPaymentProcessor;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(SUBSCRIPTION_MANAGER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
    }

    // ============ MODIFIERS ============
    
    modifier bucketExists(address user, string memory bucketName) {
        require(userBuckets[user][bucketName].exists, "Bucket does not exist");
        _;
    }
    
    modifier bucketActive(address user, string memory bucketName) {
        require(userBuckets[user][bucketName].active, "Bucket is inactive");
        _;
    }
    
    modifier notEmergencyPaused(address user) {
        require(!emergencyPausedUsers[user], "User is emergency paused");
        _;
    }
    
    modifier rateLimited() {
        require(
            block.timestamp >= lastOperationTimestamp[msg.sender] + MIN_OPERATION_INTERVAL,
            "Operation too frequent"
        );
        lastOperationTimestamp[msg.sender] = block.timestamp;
        _;
    }
    
    modifier validSubscriptionAmount(uint256 amount) {
        require(amount >= MIN_SUBSCRIPTION_AMOUNT, "Amount too low");
        require(amount <= MAX_SUBSCRIPTION_AMOUNT, "Amount too high");
        _;
    }
    
    modifier validBucketName(string memory bucketName) {
        require(bytes(bucketName).length > 0, "Bucket name cannot be empty");
        require(bytes(bucketName).length <= 32, "Bucket name too long");
        require(bytes(bucketName).length >= 3, "Bucket name too short");
        _;
    }

    // ============ BUCKET MANAGEMENT ============
    
    /**
     * @dev Create a new spending bucket
     */
    function createBucket(
        string memory bucketName, 
        uint256 monthlyLimit
    ) external 
        whenNotPaused 
        notEmergencyPaused(msg.sender)
        rateLimited
        validBucketName(bucketName)
    {
        require(!userBuckets[msg.sender][bucketName].exists, "Bucket already exists");
        require(monthlyLimit <= 1000000e6, "Monthly limit too high"); // Max 1M USDC
        
        Bucket storage newBucket = userBuckets[msg.sender][bucketName];
        newBucket.monthlyLimit = monthlyLimit;
        newBucket.lastResetTimestamp = block.timestamp;
        newBucket.exists = true;
        newBucket.active = true;
        newBucket.subscriptionCount = 0;
        
        userBucketNames[msg.sender].push(bucketName);
        
        emit BucketCreated(msg.sender, bucketName, monthlyLimit, block.timestamp, block.number);
        emit UserActivity(msg.sender, "bucket_created", bucketName, 0, address(0), block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "BUCKET_CREATED", "Bucket created successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Fund a bucket with tokens from unallocated balance
     * @notice Monthly limits are reset if 30 days have passed
     */
    function fundBucket(
        string memory bucketName, 
        uint256 amount,
        address token
    ) external 
        bucketExists(msg.sender, bucketName)
        whenNotPaused
        notEmergencyPaused(msg.sender)
        nonReentrant
    {
        require(amount > 0, "Amount must be greater than 0");
        require(token != address(0), "Invalid token address");
        
        // Reset monthly limit if needed (30 days have passed)
        _resetMonthlyLimitIfNeeded(msg.sender, bucketName);
        
        // Security: Check for sufficient balance
        require(userTokenBalances[msg.sender][token] >= amount, "Insufficient unallocated balance");
        
        // Effects: Update balances first (CEI pattern)
        userTokenBalances[msg.sender][token] -= amount;
        
        if (token == ETH_ADDRESS) {
            userBuckets[msg.sender][bucketName].balance += amount;
        } else {
            userBuckets[msg.sender][bucketName].tokenBalances[token] += amount;
        }
        
        uint256 newBalance = getBucketBalance(msg.sender, bucketName, token);
        emit BucketFunded(msg.sender, bucketName, amount, token, newBalance, block.timestamp, block.number);
        emit BucketBalanceChanged(msg.sender, bucketName, token, newBalance - amount, newBalance, amount, "fund", block.timestamp, block.number);
        emit UserActivity(msg.sender, "bucket_funded", bucketName, amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "BUCKET_FUNDED", "Bucket funded successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Delete a bucket (only if it has no funds)
     * @notice Buckets with funds cannot be deleted to prevent accidental loss
     * @notice All subscriptions in the bucket must be cancelled first
     */
    function deleteBucket(
        string memory bucketName
    ) external 
        bucketExists(msg.sender, bucketName)
        whenNotPaused
        notEmergencyPaused(msg.sender)
        nonReentrant
    {
        Bucket storage bucket = userBuckets[msg.sender][bucketName];
        
        // Security: Check if bucket has any funds
        require(bucket.balance == 0, "Cannot delete bucket with ETH funds");
        
        // Security: Check if bucket has any token funds
        address[] memory supportedTokens = getSupportedTokens();
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            require(
                bucket.tokenBalances[supportedTokens[i]] == 0,
                "Cannot delete bucket with token funds"
            );
        }
        
        // Security: Check if bucket has active subscriptions
        require(bucket.subscriptionCount == 0, "Cannot delete bucket with active subscriptions");
        
        // Security: Check if bucket has any pending monthly spending
        require(bucket.monthlySpent == 0, "Cannot delete bucket with pending monthly spending");
        
        // Remove bucket from user's bucket list
        _removeBucketFromList(msg.sender, bucketName);
        
        // Delete the bucket
        delete userBuckets[msg.sender][bucketName];
        
        emit BucketDeleted(msg.sender, bucketName, block.timestamp, block.number);
        emit UserActivity(msg.sender, "bucket_deleted", bucketName, 0, address(0), block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "BUCKET_DELETED", "Bucket deleted successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Remove bucket from user's bucket list
     */
    function _removeBucketFromList(address user, string memory bucketName) internal {
        string[] storage bucketNames = userBucketNames[user];
        
        for (uint256 i = 0; i < bucketNames.length; i++) {
            if (keccak256(bytes(bucketNames[i])) == keccak256(bytes(bucketName))) {
                // Remove bucket from list by moving last element to current position
                bucketNames[i] = bucketNames[bucketNames.length - 1];
                bucketNames.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Check if bucket can be deleted
     */
    function canDeleteBucket(
        address user,
        string memory bucketName
    ) external view bucketExists(user, bucketName) returns (bool, string memory) {
        Bucket storage bucket = userBuckets[user][bucketName];
        
        // Check ETH balance
        if (bucket.balance > 0) {
            return (false, "Bucket has ETH funds");
        }
        
        // Check token balances
        address[] memory supportedTokens = getSupportedTokens();
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (bucket.tokenBalances[supportedTokens[i]] > 0) {
                return (false, "Bucket has token funds");
            }
        }
        
        // Check active subscriptions
        if (bucket.subscriptionCount > 0) {
            return (false, "Bucket has active subscriptions");
        }
        
        // Check pending monthly spending
        if (bucket.monthlySpent > 0) {
            return (false, "Bucket has pending monthly spending");
        }
        
        return (true, "Bucket can be deleted");
    }
    
    /**
     * @dev Get supported tokens for balance checking
     */
    // Supported tokens storage for testing
    address[] private supportedTokensList;
    
    function getSupportedTokens() public view returns (address[] memory) {
        if (supportedTokensList.length == 0) {
            // Return default tokens if none set
            address[] memory tokens = new address[](3);
            tokens[0] = ETH_ADDRESS;
            tokens[1] = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base
            tokens[2] = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb; // DAI on Base
            return tokens;
        }
        return supportedTokensList;
    }
    
    /**
     * @dev Add supported token (for testing)
     */
    function addSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        supportedTokensList.push(token);
    }

    // ============ ONE-TIME PAYMENT FUNCTIONS ============
    
    /**
     * @dev Make a one-time payment from bucket
     * @notice No subscription needed - direct payment from bucket
     * @notice Does NOT reset monthly limits - works like current bucket system
     */
    function makeOneTimePayment(
        string memory bucketName,
        uint256 amount,
        address token,
        address recipient,
        string memory description
    ) external 
        bucketExists(msg.sender, bucketName)
        bucketActive(msg.sender, bucketName)
        whenNotPaused
        notEmergencyPaused(msg.sender)
        nonReentrant
    {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        
        // Check bucket balance
        uint256 availableBalance = getBucketBalance(msg.sender, bucketName, token);
        require(availableBalance >= amount, "Insufficient bucket balance");
        
        // Check monthly limit (but don't reset it)
        Bucket storage bucket = userBuckets[msg.sender][bucketName];
        if (bucket.monthlyLimit > 0) {
            uint256 newMonthlySpent = bucket.monthlySpent + amount;
            require(newMonthlySpent <= bucket.monthlyLimit, "Monthly limit exceeded");
            bucket.monthlySpent = newMonthlySpent; // Update monthly spending
        }
        
        // Process payment
        if (token == ETH_ADDRESS) {
            bucket.balance -= amount;
        } else {
            bucket.tokenBalances[token] -= amount;
        }
        
        // Transfer to recipient
        if (token == ETH_ADDRESS) {
            payable(recipient).transfer(amount);
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
        
        uint256 newBucketBalance = getBucketBalance(msg.sender, bucketName, token);
        emit OneTimePaymentMade(
            msg.sender,
            bucketName,
            amount,
            token,
            recipient,
            description,
            newBucketBalance,
            bucket.monthlySpent,
            block.timestamp,
            block.number
        );
        emit BucketBalanceChanged(msg.sender, bucketName, token, newBucketBalance + amount, newBucketBalance, amount, "payment", block.timestamp, block.number);
        emit BucketMonthlySpendingUpdated(msg.sender, bucketName, bucket.monthlySpent - amount, bucket.monthlySpent, bucket.monthlyLimit, (bucket.monthlySpent * 100) / bucket.monthlyLimit, block.timestamp, block.number);
        emit UserActivity(msg.sender, "payment_made", bucketName, amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "ONE_TIME_PAYMENT", "One-time payment made successfully", block.timestamp, block.number);
    }

    // ============ SUBSCRIPTION MANAGEMENT ============
    
    /**
     * @dev Create a subscription with explicit user consent
     * @notice User must explicitly agree to recurring payments
     */
    function createBucketSubscription(
        string memory bucketName,
        uint256 amount,
        uint256 periodInDays,
        address token,
        address recipient,
        string memory metadata,
        bool userConsent // Explicit consent parameter
    ) external 
        bucketExists(msg.sender, bucketName)
        bucketActive(msg.sender, bucketName)
        whenNotPaused
        notEmergencyPaused(msg.sender)
        nonReentrant
        rateLimited
        validSubscriptionAmount(amount)
    returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(token != address(0), "Invalid token");
        require(periodInDays >= 1 && periodInDays <= 365, "Invalid period");
        require(userConsent, "User must explicitly consent to recurring payments");
        
        // Security: Rate limiting for subscription creation
        require(
            block.timestamp >= lastSubscriptionCreation[msg.sender] + SUBSCRIPTION_CREATION_COOLDOWN,
            "Subscription creation too frequent"
        );
        lastSubscriptionCreation[msg.sender] = block.timestamp;
        
        Bucket storage bucket = userBuckets[msg.sender][bucketName];
        
        // Security: Limit subscriptions per bucket
        require(bucket.subscriptionCount < MAX_SUBSCRIPTIONS_PER_BUCKET, "Too many subscriptions");
        
        // Security: Check if bucket has sufficient balance for the subscription
        uint256 availableBalance = getBucketBalance(msg.sender, bucketName, token);
        require(availableBalance >= amount, "Insufficient bucket balance");
        
        // Security: Check monthly limit
        if (bucket.monthlyLimit > 0) {
            uint256 projectedMonthlySpend = bucket.monthlySpent + amount;
            require(projectedMonthlySpend <= bucket.monthlyLimit, "Would exceed monthly limit");
        }
        
        // Create subscription via external subscription service
        uint256 subscriptionId = ISubscriptionDataManager(SUBSCRIPTION_DATA_MANAGER)
            .createSubscription(
                msg.sender,
                amount,
                periodInDays,
                token,
                recipient,
                metadata
            );
        
        // Store subscription info
        SubscriptionInfo storage subscription = userSubscriptions[msg.sender][subscriptionId];
        subscription.subscriptionId = subscriptionId;
        subscription.bucketName = bucketName;
        subscription.amount = amount;
        subscription.periodInDays = periodInDays;
        subscription.token = token;
        subscription.recipient = recipient;
        subscription.isActive = true;
        subscription.nextChargeTimestamp = block.timestamp + (periodInDays * 1 days);
        subscription.createdAt = block.timestamp;
        subscription.userConsent = userConsent; // Store consent
        subscription.lastProcessedAt = 0;
        
        // Link subscription to bucket
        bucket.subscriptionIds.push(subscriptionId);
        bucket.subscriptionCount += 1;
        userSubscriptionIds[msg.sender].push(subscriptionId);
        
        emit BucketSubscriptionCreated(
            msg.sender,
            bucketName,
            subscriptionId,
            amount,
            periodInDays,
            recipient,
            token,
            subscription.nextChargeTimestamp,
            userConsent,
            metadata,
            block.timestamp,
            block.number
        );
        emit SubscriptionAnalytics(msg.sender, subscriptionId, bucketName, 0, 0, periodInDays, recipient, block.timestamp, block.number);
        emit UserActivity(msg.sender, "subscription_created", bucketName, amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "SUBSCRIPTION_CREATED", "Subscription created successfully", block.timestamp, block.number);
        
        return subscriptionId;
    }
    
    /**
     * @dev Process subscription payment from bucket
     * @notice This function is called by the backend scheduler
     * @notice Monthly limits are reset ONLY for monthly subscriptions (30 days)
     */
    function processSubscriptionPayment(
        address user,
        uint256 subscriptionId
    ) external 
        onlyRole(SUBSCRIPTION_MANAGER_ROLE) 
        nonReentrant 
        whenNotPaused
    {
        // Get subscription info
        SubscriptionInfo storage subscription = userSubscriptions[user][subscriptionId];
        require(subscription.isActive, "Subscription not active");
        require(block.timestamp >= subscription.nextChargeTimestamp, "Too early to charge");
        
        // Security: Prevent rapid processing of same subscription
        require(
            block.timestamp >= subscription.lastProcessedAt + 1 hours,
            "Subscription processing too frequent"
        );
        
        Bucket storage bucket = userBuckets[user][subscription.bucketName];
        
        // CRITICAL: Only reset monthly limit for monthly subscriptions (30 days)
        if (subscription.periodInDays == 30) {
            _resetMonthlyLimitIfNeeded(user, subscription.bucketName);
        }
        
        // Security: Check bucket balance again (could have changed)
        uint256 availableBalance = getBucketBalance(
            user,
            subscription.bucketName,
            subscription.token
        );
        require(availableBalance >= subscription.amount, "Insufficient bucket balance");
        
        // Security: Check monthly limit after reset
        if (bucket.monthlyLimit > 0) {
            uint256 newMonthlySpent = bucket.monthlySpent + subscription.amount;
            require(newMonthlySpent <= bucket.monthlyLimit, "Monthly limit exceeded");
            bucket.monthlySpent = newMonthlySpent;
        }
        
        // Effects: Update balances first (CEI pattern)
        if (subscription.token == ETH_ADDRESS) {
            bucket.balance -= subscription.amount;
        } else {
            bucket.tokenBalances[subscription.token] -= subscription.amount;
        }
        
        // Interactions: Transfer tokens to recipient
        if (subscription.token == ETH_ADDRESS) {
            payable(subscription.recipient).transfer(subscription.amount);
        } else {
            IERC20(subscription.token).safeTransfer(subscription.recipient, subscription.amount);
        }
        
        // Process payment via external payment processor
        ISubscriptionPaymentProcessor(SUBSCRIPTION_PAYMENT_PROCESSOR)
            .processPayment(subscriptionId, subscription.amount, subscription.recipient);
        
        // Update subscription info
        subscription.totalCharged += subscription.amount;
        subscription.chargeCount += 1;
        subscription.nextChargeTimestamp += (subscription.periodInDays * 1 days);
        subscription.lastProcessedAt = block.timestamp;
        
        uint256 newBucketBalance = availableBalance - subscription.amount;
        emit BucketSubscriptionCharged(
            user,
            subscription.bucketName,
            subscriptionId,
            subscription.amount,
            subscription.token,
            subscription.recipient,
            newBucketBalance,
            subscription.totalCharged,
            subscription.chargeCount,
            subscription.nextChargeTimestamp,
            block.timestamp,
            block.number
        );
        emit BucketBalanceChanged(user, subscription.bucketName, subscription.token, availableBalance, newBucketBalance, subscription.amount, "subscription", block.timestamp, block.number);
        emit BucketMonthlySpendingUpdated(user, subscription.bucketName, bucket.monthlySpent - subscription.amount, bucket.monthlySpent, bucket.monthlyLimit, (bucket.monthlySpent * 100) / bucket.monthlyLimit, block.timestamp, block.number);
        emit SubscriptionAnalytics(user, subscriptionId, subscription.bucketName, subscription.totalCharged, subscription.chargeCount, subscription.periodInDays, subscription.recipient, block.timestamp, block.number);
        emit UserActivity(user, "subscription_charged", subscription.bucketName, subscription.amount, subscription.token, block.timestamp, block.number);
        emit SecurityEvent(user, "SUBSCRIPTION_CHARGED", "Subscription payment processed successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Cancel a bucket subscription
     * @notice Only the subscription owner can cancel
     */
    function cancelBucketSubscription(uint256 subscriptionId) external {
        SubscriptionInfo storage subscription = userSubscriptions[msg.sender][subscriptionId];
        require(subscription.isActive, "Subscription not active");
        
        // Cancel via external subscription service
        ISubscriptionDataManager(SUBSCRIPTION_DATA_MANAGER)
            .cancelSubscription(subscriptionId);
        
        // Update local state
        subscription.isActive = false;
        
        // Remove from bucket's subscription list
        Bucket storage bucket = userBuckets[msg.sender][subscription.bucketName];
        bucket.subscriptionCount -= 1;
        
        emit BucketSubscriptionCancelled(
            msg.sender,
            subscription.bucketName,
            subscriptionId,
            subscription.totalCharged,
            subscription.chargeCount,
            block.timestamp,
            block.number
        );
        emit SecurityEvent(msg.sender, "SUBSCRIPTION_CANCELLED", "Subscription cancelled successfully", block.timestamp, block.number);
    }

    // ============ MONTHLY LIMIT MANAGEMENT ============
    
    /**
     * @dev Reset monthly limit if a month has passed
     * @notice This is called automatically before processing subscriptions AND during bucket operations
     * @notice Monthly limits reset every 30 days regardless of subscription activity
     */
    function _resetMonthlyLimitIfNeeded(address user, string memory bucketName) internal {
        Bucket storage bucket = userBuckets[user][bucketName];
        
        if (block.timestamp >= bucket.lastResetTimestamp + MONTH_SECONDS) {
            uint256 oldSpent = bucket.monthlySpent;
            bucket.monthlySpent = 0;
            bucket.lastResetTimestamp = block.timestamp;
            
            emit MonthlyLimitReset(user, bucketName, oldSpent, bucket.monthlyLimit, bucket.lastResetTimestamp, block.timestamp, block.number);
            emit BucketMonthlySpendingUpdated(user, bucketName, oldSpent, 0, bucket.monthlyLimit, 0, block.timestamp, block.number);
            emit SecurityEvent(user, "MONTHLY_LIMIT_RESET", "Monthly limit reset successfully", block.timestamp, block.number);
        }
    }
    
    /**
     * @dev Reset monthly limit for a bucket
     * @notice Only the bucket owner can manually reset
     * @notice Monthly limits automatically reset every 30 days regardless of subscription activity
     */
    function resetMonthlyLimit(string memory bucketName) external bucketExists(msg.sender, bucketName) {
        _resetMonthlyLimitIfNeeded(msg.sender, bucketName);
    }
    
    /**
     * @dev Reset monthly limits for all user buckets
     * @notice Useful for batch operations and maintenance
     */
    function resetAllBucketMonthlyLimits() external {
        string[] memory bucketNames = userBucketNames[msg.sender];
        
        for (uint256 i = 0; i < bucketNames.length; i++) {
            if (userBuckets[msg.sender][bucketNames[i]].exists) {
                _resetMonthlyLimitIfNeeded(msg.sender, bucketNames[i]);
            }
        }
    }
    
    /**
     * @dev Check and reset monthly limits for a specific user (admin function)
     * @notice Can be called by backend to ensure limits are reset
     */
    function checkAndResetUserMonthlyLimits(address user) external onlyRole(SUBSCRIPTION_MANAGER_ROLE) {
        string[] memory bucketNames = userBucketNames[user];
        
        for (uint256 i = 0; i < bucketNames.length; i++) {
            if (userBuckets[user][bucketNames[i]].exists) {
                _resetMonthlyLimitIfNeeded(user, bucketNames[i]);
            }
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get bucket balance for a specific token
     */
    function getBucketBalance(
        address user,
        string memory bucketName,
        address token
    ) public view returns (uint256) {
        if (token == ETH_ADDRESS) {
            return userBuckets[user][bucketName].balance;
        } else {
            return userBuckets[user][bucketName].tokenBalances[token];
        }
    }
    
    /**
     * @dev Get all subscriptions for a bucket
     */
    function getBucketSubscriptions(
        address user,
        string memory bucketName
    ) external view returns (uint256[] memory) {
        return userBuckets[user][bucketName].subscriptionIds;
    }
    
    /**
     * @dev Get subscription details
     */
    function getSubscriptionInfo(
        address user,
        uint256 subscriptionId
    ) external view returns (SubscriptionInfo memory) {
        return userSubscriptions[user][subscriptionId];
    }
    
    /**
     * @dev Get all user subscriptions
     */
    function getUserSubscriptions(address user) external view returns (uint256[] memory) {
        return userSubscriptionIds[user];
    }
    
    /**
     * @dev Get bucket info including monthly spending
     */
    function getBucketInfo(
        address user,
        string memory bucketName
    ) external view bucketExists(user, bucketName) returns (
        uint256 balance,
        uint256 monthlySpent,
        uint256 monthlyLimit,
        uint256 lastResetTimestamp,
        bool active,
        uint256 subscriptionCount
    ) {
        Bucket storage bucket = userBuckets[user][bucketName];
        return (
            bucket.balance,
            bucket.monthlySpent,
            bucket.monthlyLimit,
            bucket.lastResetTimestamp,
            bucket.active,
            bucket.subscriptionCount
        );
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @dev Emergency pause for specific user
     * @notice Only emergency role can pause users
     */
    function emergencyPauseUser(address user, bool paused) external onlyRole(EMERGENCY_ROLE) {
        emergencyPausedUsers[user] = paused;
        emit EmergencyPause(user, paused, block.timestamp, block.number);
        emit SecurityEvent(user, paused ? "EMERGENCY_PAUSED" : "EMERGENCY_UNPAUSED", "Emergency pause status changed", block.timestamp, block.number);
    }
    
    /**
     * @dev Emergency pause all subscriptions for a user
     * @notice Only emergency role can pause subscriptions
     */
    function emergencyPauseUserSubscriptions(address user) external onlyRole(EMERGENCY_ROLE) {
        uint256[] memory subscriptionIds = userSubscriptionIds[user];
        for (uint256 i = 0; i < subscriptionIds.length; i++) {
            if (userSubscriptions[user][subscriptionIds[i]].isActive) {
                userSubscriptions[user][subscriptionIds[i]].isActive = false;
                emit BucketSubscriptionCancelled(user, "", subscriptionIds[i], 0, 0, block.timestamp, block.number);
            }
        }
        emit SecurityEvent(user, "ALL_SUBSCRIPTIONS_PAUSED", "All subscriptions paused in emergency", block.timestamp, block.number);
    }

    // ============ FUNDING FUNCTIONS ============
    
    /**
     * @dev Deposit tokens to user's unallocated balance
     * @notice Users can deposit tokens that can then be allocated to buckets
     */
    function depositTokens(address token, uint256 amount) external payable nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == ETH_ADDRESS) {
            require(msg.value == amount, "ETH amount mismatch");
            userTokenBalances[msg.sender][token] += amount;
        } else {
            require(msg.value == 0, "ETH sent with token deposit");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            userTokenBalances[msg.sender][token] += amount;
        }
        
        emit UserActivity(msg.sender, "tokens_deposited", "", amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "TOKENS_DEPOSITED", "Tokens deposited successfully", block.timestamp, block.number);
    }
    
    /**
     * @dev Withdraw tokens from user's unallocated balance
     * @notice Users can withdraw unallocated tokens
     */
    function withdrawTokens(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(userTokenBalances[msg.sender][token] >= amount, "Insufficient balance");
        
        userTokenBalances[msg.sender][token] -= amount;
        
        if (token == ETH_ADDRESS) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
        
        emit UserActivity(msg.sender, "tokens_withdrawn", "", amount, token, block.timestamp, block.number);
        emit SecurityEvent(msg.sender, "TOKENS_WITHDRAWN", "Tokens withdrawn successfully", block.timestamp, block.number);
    }
}

