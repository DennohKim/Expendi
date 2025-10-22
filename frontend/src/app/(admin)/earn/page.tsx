"use client";

import Link from "next/link";
import { useState } from "react";
import { useVaultsList } from "@/lib/morpho/useVaultsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VaultImage } from "@/components/vault";
import { TrendingUp, User, Eye, Grid3x3, List } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type ViewMode = "grid" | "list";

export default function EarnPage() {
  const { vaults, loading, error } = useVaultsList("whitelisted-desc", true, "USDC");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Earn Yield
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a vault to start earning yield on your assets
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                Loading vaults...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Earn Yield
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a vault to start earning yield on your assets
          </p>
        </div>

        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-4">
              <div className="text-destructive">
                <svg
                  className="mx-auto h-12 w-12 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Error Loading Vaults
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {error}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-start gap-4 mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Earn Yield
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Choose from whitelisted USDC vaults to start earning yield on your assets
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex gap-1 border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === "grid" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Vaults Grid/List */}
      {vaults.length > 0 ? (
        viewMode === "grid" ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {vaults.map((vault) => (
              <Link
                key={vault.id}
                href={`/earn/${vault.id}`}
                className="block transition-transform hover:-translate-y-1 no-underline"
              >
                <Card className="h-full cursor-pointer transition-all">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Vault Image */}
                        <VaultImage 
                          imageUrl={vault.metadata?.image} 
                          vaultName={vault.name}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 space-y-2 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {vault.name}
                          </CardTitle>
                         
                        </div>
                      </div>
                      
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Vault Stats */}
                    <div className="grid grid-cols-3 gap-3 border-b pb-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          TVL
                        </p>
                        <p className="text-sm font-semibold truncate">
                          {vault.tvl}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          Share Price
                        </p>
                        <p className="text-sm font-semibold truncate">
                          {vault.sharePrice}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          Base APY
                        </p>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-500 truncate">
                          {vault.apy}
                        </p>
                      </div>
                    </div>

                    {/* Rewards Section */}
                    {vault.rewards.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 ">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Rewards:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {vault.rewards.map((reward, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {reward.asset} {reward.supplyApr}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}


                    {/* View Details Button */}
                    <Button variant="outline">
                      <Eye className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        View Details
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          // List View (Table)
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Table Header */}
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">
                        Vault
                      </th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground hidden md:table-cell">
                        TVL
                      </th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground hidden md:table-cell">
                        Share Price
                      </th>
                      <th className="text-right p-4 font-semibold text-sm text-muted-foreground">
                        Base APY
                      </th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground hidden lg:table-cell">
                        Rewards
                      </th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {vaults.map((vault, index) => (
                      <tr
                        key={vault.id}
                        className={`
                          border-b last:border-b-0 transition-colors
                          hover:bg-muted/30 cursor-pointer
                          ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                        `}
                        onClick={() => window.location.href = `/earn/${vault.id}`}
                      >
                        {/* Vault Name */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <VaultImage 
                              imageUrl={vault.metadata?.image} 
                              vaultName={vault.name}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">
                                {vault.name}
                              </h3>
                            </div>
                          </div>
                        </td>

                        {/* TVL */}
                        <td className="p-4 text-right font-medium text-sm hidden md:table-cell">
                          {vault.tvl}
                        </td>

                        {/* Share Price */}
                        <td className="p-4 text-right font-medium text-sm hidden md:table-cell">
                          {vault.sharePrice}
                        </td>

                        {/* Base APY */}
                        <td className="p-4 text-right">
                          <span className="font-semibold text-sm text-blue-600 dark:text-blue-500">
                            {vault.apy}
                          </span>
                        </td>

                        {/* Rewards */}
                        <td className="p-4 hidden lg:table-cell">
                          {vault.rewards.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {vault.rewards.map((reward, rewardIndex) => (
                                <Badge
                                  key={rewardIndex}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {reward.asset} {reward.supplyApr}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="p-4 text-center">
                          <Link 
                            href={`/earn/${vault.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">View</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-4">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                No Whitelisted USDC Vaults Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No whitelisted USDC vaults available at the moment. Check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
