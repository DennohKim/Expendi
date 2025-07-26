"use client";

import { useState, useMemo } from "react";
import { useSmartAccount } from "@/context/SmartAccountContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAllTransactions, type AllTransactionsData } from "@/hooks/subgraph-queries/getAllTransactions";

const formatAmount = (amount: string, decimals: string, symbol: string) => {
  // Debug logging - remove this after fixing the issue
  console.log('formatAmount debug:', { amount, decimals, symbol, amountType: typeof amount, decimalsType: typeof decimals });
  
  try {
    // Handle null/undefined/empty values
    if (!amount || amount === "0") {
      const displaySymbol = symbol === "UNKNOWN" ? "USDC" : symbol;
      return `0 ${displaySymbol}`;
    }

    // For USDC (including UNKNOWN tokens), always use 6 decimals
    const displaySymbol = symbol === "UNKNOWN" ? "USDC" : symbol;
    const decimalPlaces = (symbol === "UNKNOWN" || displaySymbol === "USDC") ? 6 : (decimals ? parseInt(decimals) : 6);
    
    // Convert string amount to BigInt
    const amountBigInt = BigInt(amount);
    const divisor = BigInt(10 ** decimalPlaces);
    
    // Convert to number with proper decimal handling
    const wholeNumber = Number(amountBigInt / divisor);
    const remainder = Number(amountBigInt % divisor);
    const decimalPart = remainder / Number(divisor);
    const fullAmount = wholeNumber + decimalPart;
    
    // Format to show appropriate decimal places for USDC
    const formatted = fullAmount.toFixed(decimalPlaces === 6 ? 2 : 6).replace(/\.?0+$/, '');
    
    console.log('formatAmount result:', { formatted, displaySymbol, fullAmount, decimalPlaces, amountBigInt: amount, divisor: divisor.toString() });
    
    return `${formatted} ${displaySymbol}`;
  } catch (error) {
    console.error('Error formatting amount:', { amount, decimals, symbol, error });
    // Fallback formatting
    const displaySymbol = symbol === "UNKNOWN" ? "USDC" : symbol;
    return `${amount} ${displaySymbol}`;
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getTransactionIcon = (type: "deposit" | "withdrawal" | "transfer") => {
  switch (type) {
    case "deposit":
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    case "withdrawal":
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    case "transfer":
      return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
  }
};

const getTypeColor = (type: "deposit" | "withdrawal" | "transfer") => {
  switch (type) {
    case "deposit":
      return "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
    case "withdrawal":
      return "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
    case "transfer":
      return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
  }
};

interface TransactionTableProps {
  data: AllTransactionsData | undefined;
  loading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  transactionType: 'deposits' | 'withdrawals' | 'transfers';
}

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function PaginationControls({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          if (totalPages > 7 && page > 3 && page < totalPages - 2 && Math.abs(page - currentPage) > 1) {
            return page === 4 || page === totalPages - 3 ? (
              <span key={page} className="px-2 text-gray-400">...</span>
            ) : null;
          }
          
          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          );
        })}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DepositsTable({ data, loading, currentPage, onPageChange }: TransactionTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading deposits...</span>
      </div>
    );
  }

  if (!data?.deposits?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No deposits found
      </div>
    );
  }

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDeposits = data.deposits.slice(startIndex, endIndex);

  return (
    <div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Bucket</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Transaction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedDeposits.map((deposit) => (
          <TableRow key={deposit.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getTransactionIcon("deposit")}
                <Badge className={getTypeColor("deposit")}>
                  {deposit.type}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="font-medium text-green-600">
              +{formatAmount(deposit.amount, deposit.token.decimals, deposit.token.symbol)}
            </TableCell>
            <TableCell>{deposit.bucket.name}</TableCell>
            <TableCell>{formatTimestamp(deposit.timestamp)}</TableCell>
            <TableCell>
              <a
                href={`https://sepolia.basescan.org/tx/${deposit.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                {formatAddress(deposit.transactionHash)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <PaginationControls
      currentPage={currentPage}
      totalItems={data.deposits.length}
      itemsPerPage={itemsPerPage}
      onPageChange={onPageChange}
    />
    </div>
  );
}

function WithdrawalsTable({ data, loading, currentPage, onPageChange }: TransactionTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading withdrawals...</span>
      </div>
    );
  }

  if (!data?.withdrawals?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No withdrawals found
      </div>
    );
  }

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWithdrawals = data.withdrawals.slice(startIndex, endIndex);

  return (
    <div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Bucket</TableHead>
          <TableHead>Recipient</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Transaction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedWithdrawals.map((withdrawal) => (
          <TableRow key={withdrawal.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getTransactionIcon("withdrawal")}
                <Badge className={getTypeColor("withdrawal")}>
                  {withdrawal.type}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="font-medium text-red-600">
              -{formatAmount(withdrawal.amount, withdrawal.token.decimals, withdrawal.token.symbol)}
            </TableCell>
            <TableCell>{withdrawal.bucket.name}</TableCell>
            <TableCell>{formatAddress(withdrawal.recipient)}</TableCell>
            <TableCell>{formatTimestamp(withdrawal.timestamp)}</TableCell>
            <TableCell>
              <a
                href={`https://basescan.org/tx/${withdrawal.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                {formatAddress(withdrawal.transactionHash)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <PaginationControls
      currentPage={currentPage}
      totalItems={data.withdrawals.length}
      itemsPerPage={itemsPerPage}
      onPageChange={onPageChange}
    />
    </div>
  );
}

function TransfersTable({ data, loading, currentPage, onPageChange }: TransactionTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading transfers...</span>
      </div>
    );
  }

  if (!data?.bucketTransfers?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No bucket transfers found
      </div>
    );
  }

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransfers = data.bucketTransfers.slice(startIndex, endIndex);

  return (
    <div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>From Bucket</TableHead>
          <TableHead>To Bucket</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Transaction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedTransfers.map((transfer) => (
          <TableRow key={transfer.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getTransactionIcon("transfer")}
                <Badge className={getTypeColor("transfer")}>
                  Transfer
                </Badge>
              </div>
            </TableCell>
            <TableCell className="font-medium text-blue-600">
              {formatAmount(transfer.amount, transfer.token.decimals, transfer.token.symbol)}
            </TableCell>
            <TableCell>{transfer.fromBucket.name}</TableCell>
            <TableCell>{transfer.toBucket.name}</TableCell>
            <TableCell>{formatTimestamp(transfer.timestamp)}</TableCell>
            <TableCell>
              <a
                href={`https://basescan.org/tx/${transfer.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                {formatAddress(transfer.transactionHash)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <PaginationControls
      currentPage={currentPage}
      totalItems={data.bucketTransfers.length}
      itemsPerPage={itemsPerPage}
      onPageChange={onPageChange}
    />
    </div>
  );
}

export default function Transactions() {
  const { smartAccountAddress } = useSmartAccount();
  const [first] = useState(1000); // Fetch more data for pagination
  const [depositPage, setDepositPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [transferPage, setTransferPage] = useState(1);
  
  const { data, loading, error } = useAllTransactions(smartAccountAddress, first);
  
  // Debug logging - remove after fixing
  if (data && !loading) {
    console.log('Transaction data received:', data);
    if (data.deposits && data.deposits.length > 0) {
      console.log('First deposit sample:', data.deposits[0]);
    }
  }
  

  const transactionCounts = useMemo(() => {
    if (!data) return { deposits: 0, withdrawals: 0, transfers: 0 };
    
    return {
      deposits: data.deposits?.length || 0,
      withdrawals: data.withdrawals?.length || 0,
      transfers: data.bucketTransfers?.length || 0,
    };
  }, [data]);

  if (!smartAccountAddress) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Please connect your wallet and create a budget account to view transactions</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="text-center py-8">
          <p className="text-red-500">Error loading transactions: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            All Transactions
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View all your transaction history across buckets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing transactions with 10 per page
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="deposits" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deposits">
            Deposits ({transactionCounts.deposits})
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            Withdrawals ({transactionCounts.withdrawals})
          </TabsTrigger>
          <TabsTrigger value="transfers">
            Transfers ({transactionCounts.transfers})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="mt-6">
          <DepositsTable 
            data={data} 
            loading={loading} 
            currentPage={depositPage}
            onPageChange={setDepositPage}
            transactionType="deposits"
          />
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-6">
          <WithdrawalsTable 
            data={data} 
            loading={loading} 
            currentPage={withdrawalPage}
            onPageChange={setWithdrawalPage}
            transactionType="withdrawals"
          />
        </TabsContent>

        <TabsContent value="transfers" className="mt-6">
          <TransfersTable 
            data={data} 
            loading={loading} 
            currentPage={transferPage}
            onPageChange={setTransferPage}
            transactionType="transfers"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}