// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import { IMetaMorpho } from "./interfaces/IMetaMorpho.sol";

/**
 * @title GoalzTokenMorpho
 * @notice Wrapped token representing deposits in the Goalz protocol with Morpho vault integration
 * @dev This token tracks user deposits and interest earned through Morpho vaults
 */
contract GoalzTokenMorpho is ERC20, Ownable {
    address public immutable depositToken;
    address public immutable morphoVault;
    IMetaMorpho public immutable vault;

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    /**
     * @param name Token name (e.g., "Goalz USDC")
     * @param symbol Token symbol (e.g., "glzUSDC")
     * @param _depositToken The underlying deposit token address
     * @param _morphoVault The Morpho vault address for this token
     */
    constructor(
        string memory name,
        string memory symbol,
        address _depositToken,
        address _morphoVault
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_depositToken != address(0), "Invalid deposit token");
        require(_morphoVault != address(0), "Invalid Morpho vault");
        
        depositToken = _depositToken;
        morphoVault = _morphoVault;
        vault = IMetaMorpho(_morphoVault);
        
        // Verify vault asset matches deposit token
        require(vault.asset() == _depositToken, "Vault asset mismatch");
    }

    /**
     * @notice Mint GoalzTokens to a user (only callable by owner - the Goalz contract)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @notice Burn GoalzTokens from a user (only callable by owner - the Goalz contract)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        _burn(from, amount);
        emit Burned(from, amount);
    }

    /**
     * @notice Get the current conversion rate from shares to assets in the Morpho vault
     * @return The amount of assets per share (scaled by vault decimals)
     */
    function getShareToAssetRate() external view returns (uint256) {
        // Returns how many assets 1 share is worth
        return vault.convertToAssets(1e18); // Using 1e18 as base unit
    }

    /**
     * @notice Convert shares to assets using current vault rate
     * @param shares Number of shares
     * @return assets The equivalent amount in underlying assets
     */
    function convertSharesToAssets(uint256 shares) external view returns (uint256 assets) {
        return vault.convertToAssets(shares);
    }

    /**
     * @notice Convert assets to shares using current vault rate
     * @param assets Amount in underlying assets
     * @return shares The equivalent number of shares
     */
    function convertAssetsToShares(uint256 assets) external view returns (uint256 shares) {
        return vault.convertToShares(assets);
    }

    /**
     * @notice Get the total assets in the Morpho vault
     * @return Total assets managed by the vault
     */
    function getTotalAssets() external view returns (uint256) {
        return vault.totalAssets();
    }

    /**
     * @notice Get the total supply of vault shares
     * @return Total supply of shares
     */
    function getTotalShares() external view returns (uint256) {
        return IERC20(morphoVault).totalSupply();
    }

    /**
     * @notice Calculate interest earned on a position
     * @param principalAmount The original deposit amount
     * @param shares The number of vault shares owned
     * @return interest The interest earned (current value - principal)
     */
    function calculateInterest(uint256 principalAmount, uint256 shares) external view returns (uint256 interest) {
        uint256 currentValue = vault.convertToAssets(shares);
        if (currentValue > principalAmount) {
            interest = currentValue - principalAmount;
        } else {
            interest = 0;
        }
    }

    /**
     * @notice Get information about the underlying vault
     * @return asset The underlying asset address
     * @return totalAssets Total assets in the vault
     * @return totalShares Total shares of the vault
     */
    function getVaultInfo() external view returns (
        address asset,
        uint256 totalAssets,
        uint256 totalShares
    ) {
        asset = vault.asset();
        totalAssets = vault.totalAssets();
        totalShares = IERC20(morphoVault).totalSupply();
    }

    /**
     * @notice Override decimals to match the deposit token decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return ERC20(depositToken).decimals();
    }
}
