
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  Coffee, 
  Wifi, 
  Car, 
  Calendar,
  Search,
  Filter,
  ChevronDown
} from "lucide-react";

// Define the TypeScript interface for transactions
interface Transaction {
  id: number;
  title: string;
  description: string;
  merchant?: string;
  amount: string;
  type: "spend" | "fund" | "transfer";
  status: "completed" | "pending" | "failed";
  timestamp: string;
  icon: React.ReactNode;
}

// Define the transaction data
const transactionData: Transaction[] = [
  {
    id: 1,
    title: "Whole Foods Market",
    description: "Weekly grocery shopping",
    merchant: "Whole Foods",
    amount: "-0.0250 ETH",
    type: "spend",
    status: "completed",
    timestamp: "31m ago",
    icon: <ShoppingCart className="h-5 w-5" />
  },
  {
    id: 2,
    title: "Entertainment Bucket",
    description: "Monthly budget refill",
    amount: "+0.1000 ETH",
    type: "fund",
    status: "completed",
    timestamp: "3h ago",
    icon: <Coffee className="h-5 w-5" />
  },
  {
    id: 3,
    title: "Transfer to Utilities",
    description: "From Savings bucket",
    amount: "0.0500 ETH",
    type: "transfer",
    status: "completed",
    timestamp: "07/07/2025",
    icon: <Wifi className="h-5 w-5" />
  },
  {
    id: 4,
    title: "Uber Ride",
    merchant: "Uber",
    description: "",
    amount: "-0.0150 ETH",
    type: "spend",
    status: "pending",
    timestamp: "06/07/2025",
    icon: <Car className="h-5 w-5" />
  },
  {
    id: 5,
    title: "Amazon Purchase",
    merchant: "Amazon",
    description: "",
    amount: "-0.0450 ETH",
    type: "spend",
    status: "failed",
    timestamp: "03/07/2025",
    icon: <Calendar className="h-5 w-5" />
  }
];

export default function TransactionHistory() {
  const getAmountColor = (type: string) => {
    if (type === "spend") return "text-red-500";
    if (type === "fund") return "text-green-500";
    if (type === "transfer") return "text-blue-500";
    return "text-gray-500";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Transaction History
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <Filter className="h-4 w-4" />
            All Status
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter Tabs */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            className="pl-10 rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg dark:bg-gray-800">
          <Button
            variant="ghost"
            size="sm"
            className="px-4 py-2 text-sm bg-white text-gray-700 shadow-sm dark:bg-gray-700 dark:text-gray-200"
          >
            All
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
          >
            Spend
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
          >
            Fund
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
          >
            Transfer
          </Button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="max-w-full overflow-x-auto">
        <div className="space-y-4">
          {transactionData.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  {transaction.icon}
                </div>

                {/* Transaction Details */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-800 dark:text-white/90">
                      {transaction.title}
                    </h4>
                    {getStatusBadge(transaction.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {transaction.description && (
                      <span>{transaction.description}</span>
                    )}
                    {transaction.merchant && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">•</span>
                        <span>{transaction.merchant}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount and Time */}
              <div className="flex flex-col items-end gap-1">
                <span className={`font-medium ${getAmountColor(transaction.type)}`}>
                  {transaction.type === "transfer" ? "↗" : transaction.type === "spend" ? "↓" : "↑"} {transaction.amount}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {transaction.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Load More Button */}
      <div className="flex justify-center mt-6">
        <Button
          variant="outline"
          className="px-6 py-2 text-sm font-medium text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-white/[0.03]"
        >
          Load More
        </Button>
      </div>
    </div>
  );
} 