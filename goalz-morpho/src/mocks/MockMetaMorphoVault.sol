// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IMetaMorpho.sol";

/**
 * @title MockMetaMorphoVault
 * @notice Mock implementation of MetaMorpho vault for testing
 * @dev Simplified ERC4626-like vault
 */
contract MockMetaMorphoVault is ERC20, IMetaMorpho {
    address public immutable asset;
    uint256 private _totalAssets;
    
    // For testing: numerator/denominator for interest simulation
    uint256 public interestNumerator = 100;
    uint256 public interestDenominator = 100;

    constructor(address _asset) ERC20("Mock Morpho Vault", "mVault") {
        asset = _asset;
    }

    /**
     * @notice Deposit assets and receive shares
     */
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        require(assets > 0, "Cannot deposit 0");
        
        IERC20(asset).transferFrom(msg.sender, address(this), assets);
        shares = _convertToShares(assets);
        _mint(receiver, shares);
        _totalAssets += assets;
        
        return shares;
    }

    /**
     * @notice Withdraw assets by burning shares
     */
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        shares = _convertToShares(assets);
        require(balanceOf(owner) >= shares, "Insufficient shares");
        
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        _burn(owner, shares);
        IERC20(asset).transfer(receiver, assets);
        if (assets <= _totalAssets) {
            _totalAssets -= assets;
        } else {
            _totalAssets = 0; // Handle case where interest exceeds tracked assets
        }
        
        return shares;
    }

    /**
     * @notice Redeem shares for assets
     */
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(balanceOf(owner) >= shares, "Insufficient shares");
        
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        assets = _convertToAssets(shares);
        _burn(owner, shares);
        IERC20(asset).transfer(receiver, assets);
        if (assets <= _totalAssets) {
            _totalAssets -= assets;
        } else {
            _totalAssets = 0; // Handle case where interest exceeds tracked assets
        }
        
        return assets;
    }

    function convertToAssets(uint256 shares) external view returns (uint256 assets) {
        return _convertToAssets(shares);
    }

    function convertToShares(uint256 assets) external view returns (uint256 shares) {
        return _convertToShares(assets);
    }

    function totalAssets() external view returns (uint256) {
        return (_totalAssets * interestNumerator) / interestDenominator;
    }

    function setInterestRate(uint256 numerator, uint256 denominator) external {
        require(denominator > 0, "Denominator cannot be 0");
        interestNumerator = numerator;
        interestDenominator = denominator;
    }

    function _convertToShares(uint256 assets) internal view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return assets;
        }
        
        uint256 adjustedAssets = (_totalAssets * interestNumerator) / interestDenominator;
        return (assets * supply) / adjustedAssets;
    }

    function _convertToAssets(uint256 shares) internal view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return shares;
        }
        
        uint256 adjustedAssets = (_totalAssets * interestNumerator) / interestDenominator;
        return (shares * adjustedAssets) / supply;
    }

    function decimals() public view virtual override returns (uint8) {
        return ERC20(asset).decimals();
    }
}
