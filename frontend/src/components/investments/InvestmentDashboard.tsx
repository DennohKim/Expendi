"use client";

import React, { useState } from "react";
import { useMorpho } from "@/context/MorphoContext";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PortfolioOverview from "./PortfolioOverview";
import MarketsGrid from "./MarketsGrid";
import PositionsCard from "./PositionsCard";
import WithdrawForm from "./WithdrawForm";
import WalletBalances from "./WalletBalances";
import QuickBalancesSummary from "./QuickBalancesSummary";
import { TrendingUp, Wallet, PieChart, Activity } from "lucide-react";
import SupplyForm from "./SupplyForm";

export default function InvestmentDashboard() {
  const { isLoading, error, marketStats, userPositions } = useMorpho();
  const [activeTab, setActiveTab] = useState("overview");

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Supplied</p>
              <p className="text-lg font-semibold">
                {isLoading ? "..." : "$0.00"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
              <p className="text-lg font-semibold">
                {isLoading ? "..." : "$0.00"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg APY</p>
              <p className="text-lg font-semibold">
                {isLoading ? "..." : `${marketStats?.averageSupplyApy.toFixed(2) || 0}%`}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Positions</p>
              <p className="text-lg font-semibold">
                {userPositions.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="supply">Supply</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PortfolioOverview />
          
          <QuickBalancesSummary />
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Your Positions</h3>
            <PositionsCard limit={3} />
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          <WalletBalances />
        </TabsContent>

        <TabsContent value="markets" className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Available Markets</h3>
              <Badge variant="outline">
                {marketStats?.marketsCount || 0} Markets
              </Badge>
            </div>
            <MarketsGrid />
          </Card>
        </TabsContent>

        <TabsContent value="supply" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Supply Assets</h3>
              <SupplyForm />
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Withdraw Assets</h3>
              <WithdrawForm />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Your Positions</h3>
              <Badge variant="outline">
                {userPositions.length} Active
              </Badge>
            </div>
            <PositionsCard />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}