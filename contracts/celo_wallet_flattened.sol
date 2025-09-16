// SPDX-License-Identifier: MIT
pragma solidity >=0.4.16 >=0.6.2 >=0.8.4 ^0.8.19 ^0.8.20;

// lib/openzeppelin-contracts/contracts/access/IAccessControl.sol

// OpenZeppelin Contracts (last updated v5.3.0) (access/IAccessControl.sol)

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

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

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

// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

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

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

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

// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/ERC165.sol)

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

// OpenZeppelin Contracts (last updated v5.3.0) (access/AccessControl.sol)

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

// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/IERC1363.sol)

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

// src/SimpleBudgetWallet.sol

/**
 * @title SimpleBudgetWallet
 * @dev A simple budget wallet with spending buckets and monthly limits
 * @notice Users can create spending buckets, set monthly limits, and spend within those limits
 */
contract SimpleBudgetWallet is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SPENDER_ROLE = keccak256("SPENDER_ROLE");
    
    // Events
    event BucketCreated(address indexed user, string bucketName, uint256 monthlyLimit);
    event BucketUpdated(address indexed user, string bucketName, uint256 newLimit, bool active);
    event BucketFunded(address indexed user, string bucketName, uint256 amount, address token);
    event SpentFromBucket(address indexed user, string bucketName, uint256 amount, address recipient, address token);
    event BucketTransfer(address indexed user, string fromBucket, string toBucket, uint256 amount, address token);
    event FundsDeposited(address indexed user, uint256 amount, address token);
    event MonthlyLimitReset(address indexed user, string bucketName);
    event DelegateAdded(address indexed user, address indexed delegate, string bucketName);
    event DelegateRemoved(address indexed user, address indexed delegate, string bucketName);
    event UnallocatedWithdraw(address indexed user, address token, uint256 amount, address recipient);
    event EmergencyWithdraw(address indexed user, address token, uint256 amount);
    
    // Structs
    struct Bucket {
        uint256 balance;              // Current ETH balance in bucket
        uint256 monthlySpent;         // Amount spent this month
        uint256 monthlyLimit;         // Monthly spending limit (0 = no limit)
        uint256 lastResetTimestamp;   // When monthly counter was last reset
        bool exists;                  // Whether bucket exists
        bool active;                  // Whether bucket is active for spending
        mapping(address => uint256) tokenBalances;  // token => balance
        mapping(address => bool) delegates;         // delegates who can spend
    }
    
    struct TokenBalance {
        mapping(string => uint256) bucketBalances;  // bucketName => balance
        uint256 unallocated;                        // Unallocated balance
    }
    
    // State variables
    mapping(address => mapping(string => Bucket)) public userBuckets;  // user => bucketName => Bucket
    mapping(address => string[]) public userBucketNames;               // user => bucketNames[]
    mapping(address => mapping(address => TokenBalance)) public userTokenBalances; // user => token => TokenBalance
    
    // Constants
    uint256 public constant MONTH_SECONDS = 30 days;
    address public constant ETH_ADDRESS = address(0);
    
    // Modifiers
    modifier onlyUserOrDelegate(address user, string memory bucketName) {
        require(
            msg.sender == user || 
            userBuckets[user][bucketName].delegates[msg.sender] || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        _;
    }
    
    modifier bucketExists(address user, string memory bucketName) {
        require(userBuckets[user][bucketName].exists, "Bucket does not exist");
        _;
    }
    
    modifier bucketActive(address user, string memory bucketName) {
        require(userBuckets[user][bucketName].active, "Bucket is inactive");
        _;
    }
    
    modifier hasSufficientBalance(address user, address token, string memory bucketName, uint256 amount) {
        uint256 balance = getBucketBalance(user, token, bucketName);
        require(balance >= amount, "Insufficient bucket balance");
        _;
    }
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============ DEPOSIT FUNCTIONS ============
    
    /**
     * @dev Deposit ETH to unallocated balance
     */
    function depositETH() external payable whenNotPaused {
        require(msg.value > 0, "Must deposit more than 0");
        userTokenBalances[msg.sender][ETH_ADDRESS].unallocated = 
            userTokenBalances[msg.sender][ETH_ADDRESS].unallocated + msg.value;
        emit FundsDeposited(msg.sender, msg.value, ETH_ADDRESS);
    }
    
    /**
     * @dev Deposit ERC20 tokens to unallocated balance
     */
    function depositToken(address token, uint256 amount) external whenNotPaused {
        require(token != ETH_ADDRESS, "Use depositETH for ETH");
        require(amount > 0, "Must deposit more than 0");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userTokenBalances[msg.sender][token].unallocated = 
            userTokenBalances[msg.sender][token].unallocated + amount;
        emit FundsDeposited(msg.sender, amount, token);
    }
    
    /**
     * @dev Withdraw unallocated funds back to user's wallet
     */
    function withdrawUnallocated(
        address token,
        uint256 amount,
        address payable recipient
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        require(userTokenBalances[msg.sender][token].unallocated >= amount, 
            "Insufficient unallocated balance");
        
        userTokenBalances[msg.sender][token].unallocated = 
            userTokenBalances[msg.sender][token].unallocated - amount;
        
        if (token == ETH_ADDRESS) {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
        
        emit UnallocatedWithdraw(msg.sender, token, amount, recipient);
    }
    
    // ============ BUCKET MANAGEMENT ============
    
    /**
     * @dev Create a new spending bucket
     */
    function createBucket(
        string memory bucketName, 
        uint256 monthlyLimit
    ) external whenNotPaused {
        require(!userBuckets[msg.sender][bucketName].exists, "Bucket already exists");
        require(bytes(bucketName).length > 0, "Bucket name cannot be empty");
        require(bytes(bucketName).length <= 32, "Bucket name too long");
        
        Bucket storage newBucket = userBuckets[msg.sender][bucketName];
        newBucket.monthlyLimit = monthlyLimit;
        newBucket.lastResetTimestamp = block.timestamp;
        newBucket.exists = true;
        newBucket.active = true;
        
        userBucketNames[msg.sender].push(bucketName);
        emit BucketCreated(msg.sender, bucketName, monthlyLimit);
    }
    
    /**
     * @dev Update bucket settings
     */
    function updateBucket(
        string memory bucketName,
        uint256 newMonthlyLimit,
        bool active
    ) external bucketExists(msg.sender, bucketName) {
        Bucket storage bucket = userBuckets[msg.sender][bucketName];
        bucket.monthlyLimit = newMonthlyLimit;
        bucket.active = active;
        emit BucketUpdated(msg.sender, bucketName, newMonthlyLimit, active);
    }
    
    /**
     * @dev Fund a bucket with ETH or tokens from unallocated balance
     */
    function fundBucket(
        string memory bucketName, 
        uint256 amount,
        address token
    ) external bucketExists(msg.sender, bucketName) whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == ETH_ADDRESS) {
            require(userTokenBalances[msg.sender][ETH_ADDRESS].unallocated >= amount, 
                "Insufficient unallocated ETH");
            userTokenBalances[msg.sender][ETH_ADDRESS].unallocated = 
                userTokenBalances[msg.sender][ETH_ADDRESS].unallocated - amount;
            userBuckets[msg.sender][bucketName].balance = 
                userBuckets[msg.sender][bucketName].balance + amount;
        } else {
            require(userTokenBalances[msg.sender][token].unallocated >= amount, 
                "Insufficient unallocated tokens");
            userTokenBalances[msg.sender][token].unallocated = 
                userTokenBalances[msg.sender][token].unallocated - amount;
            userTokenBalances[msg.sender][token].bucketBalances[bucketName] = 
                userTokenBalances[msg.sender][token].bucketBalances[bucketName] + amount;
        }
        
        emit BucketFunded(msg.sender, bucketName, amount, token);
    }
    
    /**
     * @dev Transfer funds between buckets
     */
    function transferBetweenBuckets(
        string memory fromBucket,
        string memory toBucket,
        uint256 amount,
        address token
    )
        external
        bucketExists(msg.sender, fromBucket)
        bucketExists(msg.sender, toBucket)
        hasSufficientBalance(msg.sender, token, fromBucket, amount)
        whenNotPaused
    {
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == ETH_ADDRESS) {
            userBuckets[msg.sender][fromBucket].balance = 
                userBuckets[msg.sender][fromBucket].balance - amount;
            userBuckets[msg.sender][toBucket].balance = 
                userBuckets[msg.sender][toBucket].balance + amount;
        } else {
            userTokenBalances[msg.sender][token].bucketBalances[fromBucket] = 
                userTokenBalances[msg.sender][token].bucketBalances[fromBucket] - amount;
            userTokenBalances[msg.sender][token].bucketBalances[toBucket] = 
                userTokenBalances[msg.sender][token].bucketBalances[toBucket] + amount;
        }
        
        emit BucketTransfer(msg.sender, fromBucket, toBucket, amount, token);
    }
    
    // ============ SPENDING FUNCTIONS ============
    
    /**
     * @dev Internal function to spend from a specific bucket
     */
    function _spendFromBucket(
        address user,
        string memory bucketName, 
        uint256 amount, 
        address payable recipient,
        address token,
        bytes memory data
    ) 
        internal
        bucketExists(user, bucketName)
        bucketActive(user, bucketName)
        hasSufficientBalance(user, token, bucketName, amount)
    {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        
        Bucket storage bucket = userBuckets[user][bucketName];
        
        // Reset monthly spending if needed
        if (block.timestamp >= bucket.lastResetTimestamp + MONTH_SECONDS) {
            bucket.monthlySpent = 0;
            bucket.lastResetTimestamp = block.timestamp;
            emit MonthlyLimitReset(user, bucketName);
        }
        
        // Check monthly limit
        if (bucket.monthlyLimit > 0) {
            require(bucket.monthlySpent + amount <= bucket.monthlyLimit, 
                "Monthly limit exceeded");
        }
        
        // Update balances and monthly spending
        bucket.monthlySpent = bucket.monthlySpent + amount;
        
        if (token == ETH_ADDRESS) {
            bucket.balance = bucket.balance - amount;
            (bool success, ) = recipient.call{value: amount}(data);
            require(success, "ETH transfer failed");
        } else {
            userTokenBalances[user][token].bucketBalances[bucketName] = 
                userTokenBalances[user][token].bucketBalances[bucketName] - amount;
            IERC20(token).safeTransfer(recipient, amount);
            if (data.length > 0) {
                (bool success, ) = recipient.call(data);
                require(success, "Call failed");
            }
        }
        
        emit SpentFromBucket(user, bucketName, amount, recipient, token);
    }
    
    /**
     * @dev Spend from a specific bucket
     */
    function spendFromBucket(
        address user,
        string memory bucketName, 
        uint256 amount, 
        address payable recipient,
        address token,
        bytes calldata data
    ) 
        external 
        nonReentrant
        whenNotPaused
        onlyUserOrDelegate(user, bucketName)
    {
        _spendFromBucket(user, bucketName, amount, recipient, token, data);
    }
    
    /**
     * @dev Batch spend from multiple buckets
     */
    function batchSpend(
        address user,
        string[] memory bucketNames,
        uint256[] memory amounts,
        address[] memory recipients,
        address[] memory tokens,
        bytes[] memory datas
    ) external nonReentrant whenNotPaused {
        require(bucketNames.length == amounts.length, "Array length mismatch");
        require(bucketNames.length == recipients.length, "Array length mismatch");
        require(bucketNames.length == tokens.length, "Array length mismatch");
        require(bucketNames.length == datas.length, "Array length mismatch");
        
        for (uint256 i = 0; i < bucketNames.length; i++) {
            require(
                msg.sender == user || 
                userBuckets[user][bucketNames[i]].delegates[msg.sender] || 
                hasRole(ADMIN_ROLE, msg.sender),
                "Not authorized"
            );
            _spendFromBucket(
                user,
                bucketNames[i],
                amounts[i],
                payable(recipients[i]),
                tokens[i],
                datas[i]
            );
        }
    }
    
    // ============ DELEGATE MANAGEMENT ============
    
    /**
     * @dev Add a delegate who can spend from a specific bucket
     */
    function addDelegate(
        string memory bucketName, 
        address delegate
    ) external bucketExists(msg.sender, bucketName) {
        require(delegate != address(0), "Invalid delegate address");
        require(delegate != msg.sender, "Cannot delegate to self");
        
        userBuckets[msg.sender][bucketName].delegates[delegate] = true;
        emit DelegateAdded(msg.sender, delegate, bucketName);
    }
    
    /**
     * @dev Remove a delegate
     */
    function removeDelegate(
        string memory bucketName, 
        address delegate
    ) external bucketExists(msg.sender, bucketName) {
        userBuckets[msg.sender][bucketName].delegates[delegate] = false;
        emit DelegateRemoved(msg.sender, delegate, bucketName);
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @dev Emergency pause all operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause all operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw all funds (when paused)
     */
    function emergencyWithdraw(address user, address token) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenPaused
        nonReentrant 
    {
        if (token == ETH_ADDRESS) {
            uint256 totalBalance = userTokenBalances[user][ETH_ADDRESS].unallocated;
            // Add all bucket balances
            string[] memory buckets = userBucketNames[user];
            for (uint256 i = 0; i < buckets.length; i++) {
                totalBalance = totalBalance + userBuckets[user][buckets[i]].balance;
                userBuckets[user][buckets[i]].balance = 0;
            }
            userTokenBalances[user][ETH_ADDRESS].unallocated = 0;
            
            if (totalBalance > 0) {
                payable(user).transfer(totalBalance);
                emit EmergencyWithdraw(user, token, totalBalance);
            }
        } else {
            uint256 totalBalance = userTokenBalances[user][token].unallocated;
            string[] memory buckets = userBucketNames[user];
            for (uint256 i = 0; i < buckets.length; i++) {
                uint256 bucketBalance = userTokenBalances[user][token].bucketBalances[buckets[i]];
                totalBalance = totalBalance + bucketBalance;
                userTokenBalances[user][token].bucketBalances[buckets[i]] = 0;
            }
            userTokenBalances[user][token].unallocated = 0;
            
            if (totalBalance > 0) {
                IERC20(token).safeTransfer(user, totalBalance);
                emit EmergencyWithdraw(user, token, totalBalance);
            }
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get bucket information
     */
    function getBucket(address user, string memory bucketName) 
        external 
        view 
        returns (
            uint256 ethBalance,
            uint256 monthlySpent,
            uint256 monthlyLimit,
            uint256 timeUntilReset,
            bool active
        ) 
    {
        require(userBuckets[user][bucketName].exists, "Bucket does not exist");
        
        Bucket storage bucket = userBuckets[user][bucketName];
        uint256 resetTime = bucket.lastResetTimestamp + MONTH_SECONDS > block.timestamp ?
            bucket.lastResetTimestamp + MONTH_SECONDS - block.timestamp : 0;
            
        return (
            bucket.balance,
            bucket.monthlySpent,
            bucket.monthlyLimit,
            resetTime,
            bucket.active
        );
    }
    
    /**
     * @dev Get bucket balance for a specific token
     */
    function getBucketBalance(address user, address token, string memory bucketName) 
        public 
        view 
        returns (uint256) 
    {
        if (!userBuckets[user][bucketName].exists) return 0;
        
        if (token == ETH_ADDRESS) {
            return userBuckets[user][bucketName].balance;
        }
        return userTokenBalances[user][token].bucketBalances[bucketName];
    }
    
    /**
     * @dev Get unallocated balance for a token
     */
    function getUnallocatedBalance(address user, address token) 
        external 
        view 
        returns (uint256) 
    {
        return userTokenBalances[user][token].unallocated;
    }
    
    /**
     * @dev Get all bucket names for a user
     */
    function getUserBuckets(address user) external view returns (string[] memory) {
        return userBucketNames[user];
    }
    
    /**
     * @dev Check if an address is a delegate for a bucket
     */
    function isDelegate(address user, string memory bucketName, address delegate) 
        external 
        view 
        returns (bool) 
    {
        return userBuckets[user][bucketName].delegates[delegate];
    }
    
    /**
     * @dev Get user's total balance across all buckets and unallocated
     */
    function getTotalBalance(address user, address token) 
        external 
        view 
        returns (uint256 total) 
    {
        total = userTokenBalances[user][token].unallocated;
        
        string[] memory buckets = userBucketNames[user];
        for (uint256 i = 0; i < buckets.length; i++) {
            total = total + getBucketBalance(user, token, buckets[i]);
        }
        
        return total;
    }
    
    /**
     * @dev Check if spending is allowed from bucket
     */
    function canSpendFromBucket(
        address user, 
        string memory bucketName, 
        uint256 amount
    ) external view returns (bool canSpend, string memory reason) {
        if (!userBuckets[user][bucketName].exists) {
            return (false, "Bucket does not exist");
        }
        
        if (!userBuckets[user][bucketName].active) {
            return (false, "Bucket is inactive");
        }
        
        Bucket storage bucket = userBuckets[user][bucketName];
        
        // Check balance
        if (bucket.balance < amount) {
            return (false, "Insufficient bucket balance");
        }
        
        // Check monthly limit
        if (bucket.monthlyLimit > 0) {
            uint256 currentMonthlySpent = bucket.monthlySpent;
            
            // Reset if needed
            if (block.timestamp >= bucket.lastResetTimestamp + MONTH_SECONDS) {
                currentMonthlySpent = 0;
            }
            
            if (currentMonthlySpent + amount > bucket.monthlyLimit) {
                return (false, "Would exceed monthly limit");
            }
        }
        
        return (true, "");
    }
    
    // ============ RECEIVE FUNCTION ============
    
    /**
     * @dev Receive ETH deposits
     */
    receive() external payable {
        userTokenBalances[msg.sender][ETH_ADDRESS].unallocated = 
            userTokenBalances[msg.sender][ETH_ADDRESS].unallocated + msg.value;
        emit FundsDeposited(msg.sender, msg.value, ETH_ADDRESS);
    }
}

