"use client";
import React, { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@/icons";
import { AreaChart, Area, XAxis, ResponsiveContainer } from "recharts";

// Sample data for the charts
const totalBalanceData = [
  { name: "11 Jun", value: 1.51 },
  { name: "15 Jun", value: 1.48 },
  { name: "19 Jun", value: 1.52 },
  { name: "24 Jun", value: 1.49 },
  { name: "29 Jun", value: 1.53 },
  { name: "3 Jul", value: 1.51 },
  { name: "8 Jul", value: 1.54 },
];

const monthlySpendingData = [
  { name: "17:51", value: 0.38 },
  { name: "20:51", value: 0.36 },
  { name: "23:51", value: 0.39 },
  { name: "02:51", value: 0.37 },
  { name: "05:51", value: 0.35 },
  { name: "08:51", value: 0.33 },
  { name: "11:51", value: 0.36 },
  { name: "15:51", value: 0.35 },
];

type TimePeriod = "D" | "W" | "M";

interface MetricCardProps {
  title: string;
  value: string;
  percentage: string;
  isPositive: boolean;
  data: Array<{ name: string; value: number }>;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  percentage,
  isPositive,
  data,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("M");
  
  // Create unique gradient ID for each card
  const gradientId = `gradient-${title.toLowerCase().replace(/\s+/g, '-')}`;

  const TimePeriodButton = ({ period }: { period: TimePeriod }) => (
    <button
      onClick={() => setSelectedPeriod(period)}
      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
        selectedPeriod === period
          ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      }`}
    >
      {period}
    </button>
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        <div className="flex items-center space-x-1">
          <TimePeriodButton period="D" />
          <TimePeriodButton period="W" />
          <TimePeriodButton period="M" />
        </div>
      </div>

      {/* Value and Percentage */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </h2>
        </div>
        <div className="flex items-center">
          {isPositive ? (
            <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span
            className={`text-sm font-medium ${
              isPositive ? "text-green-500" : "text-red-500"
            }`}
          >
            {percentage}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="#FF8A80"
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor="#FF8A80"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              interval="preserveStartEnd"
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#FF8A80"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const BucketWalletMetrics = () => {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <MetricCard
        title="Total Balance"
        value="1.5432 ETH"
        percentage="5.2%"
        isPositive={true}
        data={totalBalanceData}
      />
      <MetricCard
        title="Monthly Spending"
        value="0.35 ETH"
        percentage="2.3%"
        isPositive={false}
        data={monthlySpendingData}
      />
    </div>
  );
};
