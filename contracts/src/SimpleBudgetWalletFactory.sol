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
    
    // Events
    event WalletCreated(address indexed user, address indexed wallet, uint256 salt);
    event WalletRegistered(address indexed user, address indexed wallet);
    
    // State variables
    mapping(address => address) public userWallets;    // user => wallet
    mapping(address => address) public walletOwners;   // wallet => user
    address[] public allWallets;                       // All created wallets
    
    uint256 public totalWalletsCreated;
    uint256 public creationFee;                        // Fee to create wallet (optional)
    
    constructor(uint256 _creationFee) Ownable(msg.sender) {
        creationFee = _creationFee;
    }
    
    /**
     * @dev Create a budget wallet for the caller
     */
    function createWallet() external payable nonReentrant returns (address wallet) {
        require(userWallets[msg.sender] == address(0), "Wallet already exists");
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        // Deploy new wallet
        SimpleBudgetWallet newWallet = new SimpleBudgetWallet();
        wallet = address(newWallet);
        
        // Register wallet
        userWallets[msg.sender] = wallet;
        walletOwners[wallet] = msg.sender;
        allWallets.push(wallet);
        totalWalletsCreated++;
        
        emit WalletCreated(msg.sender, wallet, 0);
        return wallet;
    }
    
    /**
     * @dev Create a wallet with deterministic address using CREATE2
     */
    function createWalletDeterministic(uint256 salt) external payable nonReentrant returns (address wallet) {
        require(userWallets[msg.sender] == address(0), "Wallet already exists");
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        // Calculate deterministic address
        bytes memory bytecode = type(SimpleBudgetWallet).creationCode;
        bytes32 saltBytes = bytes32(salt);
        
        wallet = Create2.computeAddress(saltBytes, keccak256(bytecode));
        
        // Check if wallet already exists
        require(wallet.code.length == 0, "Wallet already deployed");
        
        // Deploy using CREATE2
        wallet = Create2.deploy(0, saltBytes, bytecode);
        
        // Register wallet
        userWallets[msg.sender] = wallet;
        walletOwners[wallet] = msg.sender;
        allWallets.push(wallet);
        totalWalletsCreated++;
        
        emit WalletCreated(msg.sender, wallet, salt);
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
    
    /**
     * @dev Update creation fee
     */
    function setCreationFee(uint256 _creationFee) external onlyOwner {
        creationFee = _creationFee;
    }
    
    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees(address payable recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        recipient.transfer(balance);
    }
    
    /**
     * @dev Get wallet for user
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
        uint256 currentFee,
        uint256 contractBalance
    ) {
        return (
            totalWalletsCreated,
            creationFee,
            address(this).balance
        );
    }
}