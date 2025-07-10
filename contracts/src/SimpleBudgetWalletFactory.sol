// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./SimpleBudgetWallet.sol";

/**
 * @title SimpleBudgetWalletFactory
 * @dev Factory to deploy SimpleBudgetWallet instances for users
 * @notice Each user gets their own budget wallet contract instance
 */
contract SimpleBudgetWalletFactory is Ownable, ReentrancyGuard {
    
    // Constants
    // Standard EntryPoint contract address (ERC-4337)
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    
    // Events
    event WalletCreated(address indexed user, address indexed wallet, uint256 salt);
    event WalletRegistered(address indexed user, address indexed wallet);
    
    // State variables
    mapping(address => address) public userWallets;    // user => wallet
    mapping(address => address) public walletOwners;   // wallet => user
    address[] public allWallets;                       // All created wallets
    
    uint256 public totalWalletsCreated;
    // Removed creation fee - wallet creation is now free
    
    constructor() Ownable(msg.sender) {
        // No fee initialization needed
    }
    
    /**
     * @dev Check if the caller is the EntryPoint contract (for ERC-4337 smart accounts)
     */
    function _isEntryPoint(address caller) internal pure returns (bool) {
        return caller == ENTRY_POINT;
    }
    
    /**
     * @dev Create a budget wallet for the caller
     */
    function createWallet() external nonReentrant returns (address wallet) {
        return _createWallet(msg.sender);
    }
    
    /**
     * @dev Create a budget wallet for a specific user (for smart accounts)
     * @param user The address that will own the wallet (smart account address)
     */
    function createWallet(address user) external nonReentrant returns (address wallet) {
        require(user != address(0), "Invalid user address");
        
        // For EOA calls, ensure msg.sender matches user
        // For smart account calls via EntryPoint, skip this check
        if (!_isEntryPoint(msg.sender)) {
            require(msg.sender == user, "User address mismatch");
        }
        
        return _createWallet(user);
    }
    
    /**
     * @dev Internal function to create wallet for a user
     */
    function _createWallet(address user) internal returns (address wallet) {
        require(userWallets[user] == address(0), "Wallet already exists");
        
        // Deploy new wallet
        SimpleBudgetWallet newWallet = new SimpleBudgetWallet();
        wallet = address(newWallet);
        
        // Register wallet
        userWallets[user] = wallet;
        walletOwners[wallet] = user;
        allWallets.push(wallet);
        totalWalletsCreated++;
        
        emit WalletCreated(user, wallet, 0);
        return wallet;
    }
    
    /**
     * @dev Create a wallet with deterministic address using CREATE2
     */
    function createWalletDeterministic(uint256 salt) external nonReentrant returns (address wallet) {
        return _createWalletDeterministic(msg.sender, salt);
    }
    
    /**
     * @dev Create a wallet with deterministic address using CREATE2 for a specific user
     * @param user The address that will own the wallet (smart account address)
     * @param salt The salt for deterministic address generation
     */
    function createWalletDeterministic(address user, uint256 salt) external nonReentrant returns (address wallet) {
        require(user != address(0), "Invalid user address");
        
        // For EOA calls, ensure msg.sender matches user
        // For smart account calls via EntryPoint, skip this check
        if (!_isEntryPoint(msg.sender)) {
            require(msg.sender == user, "User address mismatch");
        }
        
        return _createWalletDeterministic(user, salt);
    }
    
    /**
     * @dev Internal function to create deterministic wallet for a user
     */
    function _createWalletDeterministic(address user, uint256 salt) internal returns (address wallet) {
        require(userWallets[user] == address(0), "Wallet already exists");
        
        // Calculate deterministic address
        bytes memory bytecode = type(SimpleBudgetWallet).creationCode;
        bytes32 saltBytes = bytes32(salt);
        
        wallet = Create2.computeAddress(saltBytes, keccak256(bytecode));
        
        // Check if wallet already exists
        require(wallet.code.length == 0, "Wallet already deployed");
        
        // Deploy using CREATE2
        wallet = Create2.deploy(0, saltBytes, bytecode);
        
        // Register wallet
        userWallets[user] = wallet;
        walletOwners[wallet] = user;
        allWallets.push(wallet);
        totalWalletsCreated++;
        
        emit WalletCreated(user, wallet, salt);
        return wallet;
    }
    
    /**
     * @dev Get deterministic wallet address before deployment
     */
    function getWalletAddress(uint256 salt) external view returns (address) {
        bytes memory bytecode = type(SimpleBudgetWallet).creationCode;
        return Create2.computeAddress(bytes32(salt), keccak256(bytecode), address(this));
    }
    
    /**
     * @dev Register an existing wallet (for migration)
     */
    function registerWallet(address user, address wallet) external onlyOwner {
        require(userWallets[user] == address(0), "User already has wallet");
        require(walletOwners[wallet] == address(0), "Wallet already registered");
        
        userWallets[user] = wallet;
        walletOwners[wallet] = user;
        allWallets.push(wallet);
        
        emit WalletRegistered(user, wallet);
    }
    
    // Removed fee-related functions since wallet creation is now free
    
    /**
     * @dev Get wallet for user
     */
    function getUserWallet(address user) external view returns (address) {
        return userWallets[user];
    }
    
    /**
     * @dev Get wallet for user (legacy function name)
     */
    function getWallet(address user) external view returns (address) {
        return userWallets[user];
    }
    
    /**
     * @dev Get owner of wallet
     */
    function getOwner(address wallet) external view returns (address) {
        return walletOwners[wallet];
    }
    
    /**
     * @dev Check if user has a wallet
     */
    function hasWallet(address user) external view returns (bool) {
        return userWallets[user] != address(0);
    }
    
    /**
     * @dev Get all wallets (paginated)
     */
    function getWallets(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory wallets, uint256 total) 
    {
        total = allWallets.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        wallets = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            wallets[i - offset] = allWallets[i];
        }
        
        return (wallets, total);
    }
    
    /**
     * @dev Get factory statistics
     */
    function getStats() external view returns (
        uint256 totalWallets,
        uint256 contractBalance
    ) {
        return (
            totalWalletsCreated,
            address(this).balance
        );
    }
}