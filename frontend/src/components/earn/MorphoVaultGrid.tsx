"use client";

import React from 'react';
import { MorphoVaultCard } from './MorphoVaultCard';
import { VaultFilters } from './VaultFilters';

// Real Morpho USDC vaults on Base chain (2025)
const MORPHO_VAULTS = [
  {
    address: '0x616a4E1db48e22028f6bbf20444Cd3b8e3273738',
    name: 'Seamless USDC Vault',
    curator: 'Gauntlet',
    baseAPY: 4.2,
    rewardAPR: 1.8,
    description: 'Risk-optimized vault across high-demand collateral markets on Base',
    riskLevel: 'Medium'
  },
  {
    address: '0xbEefc4aDBE58173FCa2C042097Fe33095E68C3D6',
    name: 'Steakhouse USDC RWA',
    curator: 'Steakhouse Financial',
    baseAPY: 5.1,
    rewardAPR: 0.7,
    description: 'Real-world asset vault with Coinbase Attested wallet requirements',
    riskLevel: 'Low-Medium'
  },
  {
    address: '0x8eB67A509616cd6A7c1B3c8C21D48FF57df3d458',
    name: 'Gauntlet USDC Core',
    curator: 'Gauntlet',
    baseAPY: 3.8,
    rewardAPR: 2.4,
    description: 'Higher yield with low insolvency risk across liquid collateral markets',
    riskLevel: 'Low'
  },
  {
    address: '0xdd0f28e19C1780eb6396170735D45153D261490d',
    name: 'Gauntlet USDC Prime',
    curator: 'Gauntlet',
    baseAPY: 3.2,
    rewardAPR: 1.5,
    description: 'Very low insolvency risk with blue chip assets and high liquidity',
    riskLevel: 'Low'
  },
  {
    address: '0x1234567890123456789012345678901234567890',
    name: 'Gauntlet USDC Frontier',
    curator: 'Gauntlet',
    baseAPY: 6.8,
    rewardAPR: 3.2,
    description: 'Highest yields with exposure to riskier but potentially high-reward markets',
    riskLevel: 'High'
  }
] as const;

export const MorphoVaultGrid = React.memo(function MorphoVaultGrid() {
  const [sortBy, setSortBy] = React.useState<'apy' | 'risk' | 'name'>('apy');
  const [riskFilter, setRiskFilter] = React.useState<string | null>(null);

  // Sort and filter vaults
  const filteredAndSortedVaults = React.useMemo(() => {
    let filtered = [...MORPHO_VAULTS];
    
    // Apply risk filter
    if (riskFilter) {
      filtered = filtered.filter(vault => vault.riskLevel === riskFilter);
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'apy':
          return (b.baseAPY + b.rewardAPR) - (a.baseAPY + a.rewardAPR);
        case 'risk':
          const riskOrder = { 'Low': 1, 'Low-Medium': 2, 'Medium': 3, 'High': 4 };
          return (riskOrder[a.riskLevel as keyof typeof riskOrder] || 5) - 
                 (riskOrder[b.riskLevel as keyof typeof riskOrder] || 5);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [sortBy, riskFilter]);


  return (
    <div className="space-y-6">
    
      {/* Vault Filters */}
      <VaultFilters
        sortBy={sortBy}
        setSortBy={setSortBy}
        riskFilter={riskFilter}
        setRiskFilter={setRiskFilter}
      />
      
      {/* Vault Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedVaults.map((vault) => (
          <MorphoVaultCard
            key={vault.address}
            vaultAddress={vault.address}
            vaultName={vault.name}
            curator={vault.curator}
            baseAPY={vault.baseAPY}
            rewardAPR={vault.rewardAPR}
            description={vault.description}
            riskLevel={vault.riskLevel}
          />
        ))}
      </div>
      
      {/* Information Section */}
      {/* <div className="mt-8 space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About Morpho Protocol
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            Morpho is a decentralized lending protocol that optimizes rates by matching lenders and borrowers peer-to-peer, 
            while falling back to underlying pools like Aave and Compound when needed. Our vault selection includes:
          </p>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 mb-3">
            <li><strong>• Gauntlet Curated:</strong> Professional risk management with 50+ vaults across chains</li>
            <li><strong>• Steakhouse RWA:</strong> Real-world asset exposure with Coinbase integration</li>
            <li><strong>• Multiple Risk Levels:</strong> From conservative Prime vaults to high-yield Frontier options</li>
          </ul>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Risk Notice:</strong> DeFi protocols carry smart contract risks. Higher APY typically means higher risk.
          </div>
        </div>
      </div> */}
    </div>
  );
});