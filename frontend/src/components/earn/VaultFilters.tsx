"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VaultFiltersProps {
  sortBy: 'apy' | 'risk' | 'name';
  setSortBy: (sort: 'apy' | 'risk' | 'name') => void;
  riskFilter: string | null;
  setRiskFilter: (risk: string | null) => void;
}

export const VaultFilters = React.memo(function VaultFilters({
  sortBy,
  setSortBy,
  riskFilter,
  setRiskFilter
}: VaultFiltersProps) {
  const riskLevels = ['Low', 'Low-Medium', 'Medium', 'High'];

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      {/* Sort Options */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Sort by:</span>
        <Button
          variant={sortBy === 'apy' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('apy')}
        >
          APY
        </Button>
        <Button
          variant={sortBy === 'risk' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('risk')}
        >
          Risk Level
        </Button>
        <Button
          variant={sortBy === 'name' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('name')}
        >
          Name
        </Button>
      </div>

      {/* Risk Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Filter by risk:</span>
        <Button
          variant={riskFilter === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRiskFilter(null)}
        >
          All
        </Button>
        {riskLevels.map((risk) => (
          <Badge
            key={risk}
            className={`cursor-pointer transition-all ${
              riskFilter === risk
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => setRiskFilter(riskFilter === risk ? null : risk)}
          >
            {risk}
          </Badge>
        ))}
      </div>
    </div>
  );
});