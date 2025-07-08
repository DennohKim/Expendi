"use client";
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SpendingCategory {
  name: string;
  amount: string;
  value: number;
  color: string;
}

export default function SpendingSummaryChart() {
  // Define spending categories data
  const spendingData: SpendingCategory[] = [
    { name: "Groceries", amount: "0.1250 ETH", value: 36, color: "#ef4444" },
    { name: "Entertainment", amount: "0.0850 ETH", value: 24, color: "#059669" },
    { name: "Transport", amount: "0.0650 ETH", value: 19, color: "#1e293b" },
    { name: "Utilities", amount: "0.0450 ETH", value: 13, color: "#eab308" },
    { name: "Health", amount: "0.0300 ETH", value: 9, color: "#d97706" },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Spending Summary - Last 30 Days
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Pie Chart */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[350px] h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendingData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {spendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend and Total */}
        <div className="space-y-4">
          {/* Total Spent */}
          <div className="text-center lg:text-left mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Spent</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white/90">0.35 ETH</p>
          </div>

          {/* Categories Legend */}
          <div className="space-y-3">
            {spendingData.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {category.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {category.amount}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {category.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 