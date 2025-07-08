'use client'

import React, { useState } from 'react'
import { Search, ShoppingCart, Coffee, Car, Wifi, Heart, Plus, MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react'

interface Bucket {
  id: string
  name: string
  icon: React.ReactNode
  daysLeft: number
  currentAmount: number
  totalAmount: number
  bgColor: string
  iconBgColor: string
}

const BucketsPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const buckets: Bucket[] = [
    {
      id: '1',
      name: 'Groceries',
      icon: <ShoppingCart className="w-6 h-6 text-blue-600" />,
      daysLeft: 12,
      currentAmount: 0.1250,
      totalAmount: 0.2500,
      bgColor: 'bg-blue-50',
      iconBgColor: 'bg-blue-100'
    },
    {
      id: '2',
      name: 'Entertainment',
      icon: <Coffee className="w-6 h-6 text-purple-600" />,
      daysLeft: 12,
      currentAmount: 0.0850,
      totalAmount: 0.1000,
      bgColor: 'bg-purple-50',
      iconBgColor: 'bg-purple-100'
    },
    {
      id: '3',
      name: 'Transport',
      icon: <Car className="w-6 h-6 text-yellow-600" />,
      daysLeft: 12,
      currentAmount: 0.0950,
      totalAmount: 0.1000,
      bgColor: 'bg-yellow-50',
      iconBgColor: 'bg-yellow-100'
    },
    {
      id: '4',
      name: 'Utilities',
      icon: <Wifi className="w-6 h-6 text-green-600" />,
      daysLeft: 12,
      currentAmount: 0.2000,
      totalAmount: 0.2000,
      bgColor: 'bg-green-50',
      iconBgColor: 'bg-green-100'
    },
    {
      id: '5',
      name: 'Health',
      icon: <Heart className="w-6 h-6 text-pink-600" />,
      daysLeft: 12,
      currentAmount: 0.3000,
      totalAmount: 0.3000,
      bgColor: 'bg-pink-50',
      iconBgColor: 'bg-pink-100'
    }
  ]

  const getUsagePercentage = (current: number, total: number) => {
    return Math.round((current / total) * 100)
  }

  const getRemainingAmount = (current: number, total: number) => {
    return total - current
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500'
    if (percentage >= 85) return 'bg-orange-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-gray-900'
  }

  const filters = ['All', 'Active', 'Full', 'Empty']

  return (
    <div className="min-h-screen overflow-hidden rounded-2xl border border-gray-200 bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Budget Buckets</h1>
          <button className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors">
            <Plus className="w-5 h-5" />
            Create Bucket
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search buckets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Bucket Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buckets.map((bucket) => {
            const usagePercentage = getUsagePercentage(bucket.currentAmount, bucket.totalAmount)
            const remainingAmount = getRemainingAmount(bucket.currentAmount, bucket.totalAmount)
            
            return (
              <div key={bucket.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                {/* Colored Top Section */}
                <div className={`${bucket.bgColor} p-6 pb-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${bucket.iconBgColor} p-3 rounded-xl`}>
                        {bucket.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{bucket.name}</h3>
                        <p className="text-gray-600 text-sm">{bucket.daysLeft} days left</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* White Bottom Section */}
                <div className="p-6 pt-4">
                  {/* Amount Display */}
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {bucket.currentAmount.toFixed(4)} ETH
                    </div>
                    <div className="text-gray-600 text-sm mb-3">
                      of {bucket.totalAmount.toFixed(4)} ETH
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div 
                        className={`h-2 rounded-full ${getProgressBarColor(usagePercentage)}`}
                        style={{ width: `${usagePercentage}%` }}
                      ></div>
                    </div>

                    {/* Usage Stats */}
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{usagePercentage}% used</span>
                      <span>{remainingAmount.toFixed(4)} ETH remaining</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Fund
                    </button>
                    <button className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Spend
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default BucketsPage
