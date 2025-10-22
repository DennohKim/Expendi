"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useVaultOperations } from "@/lib/morpho";
import { useAccount } from "wagmi";
import { useVaultDetail } from "@/lib/morpho";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CuratorCard, VaultImage } from "@/components/vault";
import { 
  ArrowLeft, 
  TrendingUp, 
  Wallet, 
  DollarSign, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
  User
} from "lucide-react";
import { toast } from "sonner";

export default function VaultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vaultId = params.vaultId as string;
  const { address } = useAccount();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");

  const { vault, loading, error } = useVaultDetail(vaultId);

  // Create vault info object for operations
  const vaultInfo = vault
    ? {
        address: vault.address,
        asset: {
          address: vault.assetAddress,
          symbol: vault.asset,
          decimals: vault.assetDecimals,
        },
      }
    : null;

  const {
    assetBalance,
    vaultBalance,
    depositedAssets,
    amount,
    setAmount,
    txStatus,
    pendingDeposit,
    handleApprove,
    handleDeposit,
    handleWithdraw,
    isApproving,
    isDepositing,
    isWithdrawing,
    needsApproval,
    isWalletReady,
    maxWithdrawAmount,
    previewDepositShares,
    previewWithdrawShares,
    convertToSharesAmount,
  } = useVaultOperations(address, vaultInfo);

  const isLoading = isApproving || isDepositing || isWithdrawing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      if (needsApproval) {
        await handleApprove();
      } else if (mode === "deposit") {
        await handleDeposit(e);
      } else {
        await handleWithdraw(e);
      }

      // Reset form on success
      setAmount("");
      toast.success(`${mode === "deposit" ? "Deposit" : "Withdrawal"} successful!`);
    } catch (error) {
      console.error("Transaction failed:", error);
      toast.error("Transaction failed. Please try again.");
    }
  };

  const setMaxAmount = () => {
    if (!vault) return;
    if (mode === "deposit") {
      setAmount(
        assetBalance
          ? formatUnits(assetBalance as bigint, vault.assetDecimals)
          : "0"
      );
    } else {
      setAmount(
        depositedAssets
          ? formatUnits(depositedAssets as bigint, vault.assetDecimals)
          : "0"
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">Loading vault details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push("/earn")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vaults
        </Button>
        
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-4">
              <div className="text-destructive">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Error Loading Vault
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {error || "Vault not found"}
              </p>
              <Button onClick={() => router.push("/earn")} variant="outline">
                Return to Vaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatBalance = (balance: bigint | null | undefined) => {
    if (!balance || !vault) return "0.00";
    return parseFloat(formatUnits(balance, vault.assetDecimals)).toFixed(6);
  };

  const calculateUsdValue = () => {
    if (!depositedAssets || !vault.sharePrice) return "$0.00";
    const amount = parseFloat(formatUnits(depositedAssets as bigint, vault.assetDecimals));
    const price = parseFloat(vault.sharePrice.replace("$", ""));
    return `$${(amount * price).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => router.push("/earn")}
        className="hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Vaults
      </Button>

      {/* Header Card */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left Section - Vault Info */}
            <div className="flex items-start gap-4">
              <VaultImage 
                imageUrl={vault.metadata?.image} 
                vaultName={vault.name}
                size="lg"
                className="shadow-md"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {vault.name}
                  </h1>
                  {vault.whitelisted && (
                    <Badge variant="default" className="bg-blue-600 text-white">
                      Whitelisted
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                  {vault.description}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary" className="text-sm font-semibold">
                    {vault.asset}
                  </Badge>
                  {vault.metadata?.curators && vault.metadata.curators.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <User className="h-3.5 w-3.5" />
                      <span>Curated by {vault.metadata.curators[0].name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Key Metrics */}
            <div className="flex flex-row md:flex-col gap-4 md:gap-3 md:items-end">
              {/* APY Display */}
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Net APY
                </span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
                  <span className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-500">
                    {vault.netApy}
                  </span>
                </div>
              </div>
              
              {/* TVL Display */}
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Total Value Locked
                </span>
                <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {vault.tvl}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vault Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">
              Share Price
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {vault.sharePrice}
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">
              Total Supply
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {vault.totalSupply}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">
              Base APY
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
              {vault.apy}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">
              Created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {vault.creationTimestamp}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Position Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Your Position
            </CardTitle>
            <CardDescription>
              Your deposited assets and current holdings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main balance display */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Deposited Assets
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatBalance(depositedAssets as bigint)} {vault.asset}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ≈ {calculateUsdValue()}
              </div>
            </div>

            {/* Balance breakdown */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Wallet Balance
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatBalance(assetBalance as bigint)} {vault.asset}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Vault Shares
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatBalance(vaultBalance as bigint)}
                </span>
              </div>
            </div>

            {/* Rewards if available */}
            {vault.rewards && vault.rewards.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Active Rewards:
                </p>
                <div className="flex flex-wrap gap-1">
                  {vault.rewards.map((reward, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {reward.asset} {reward.supplyApr}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deposit/Withdraw Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Position</CardTitle>
            <CardDescription>
              Deposit or withdraw {vault.asset} from this vault
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "deposit" | "withdraw")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="deposit">Deposit</TabsTrigger>
                <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              </TabsList>

              {/* Status Messages */}
              {txStatus && (
                <div
                  className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
                    txStatus.includes("sent!") || txStatus.includes("success")
                      ? "bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400"
                      : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                  }`}
                >
                  {txStatus.includes("sent!") || txStatus.includes("success") ? (
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  )}
                  <span className="text-sm">{txStatus}</span>
                </div>
              )}

              {pendingDeposit && txStatus.includes("Approval") && (
                <div className="mb-4 p-3 rounded-lg flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400">
                  <Info className="h-5 w-5 mt-0.5 shrink-0" />
                  <span className="text-sm">Approval successful! Preparing deposit transaction...</span>
                </div>
              )}
              
              {!isWalletReady && address && (
                <div className="mb-4 p-3 rounded-lg flex items-start gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Wallet Connection Issue</p>
                    <p>Your wallet may not be properly connected. Please refresh the page or reconnect your wallet.</p>
                  </div>
                </div>
              )}

              <TabsContent value="deposit" className="space-y-4 mt-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="amount">Amount ({vault.asset})</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={setMaxAmount}
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                      >
                        Max: {formatBalance(assetBalance as bigint)}
                      </Button>
                    </div>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.000001"
                      min="0"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: {formatBalance(assetBalance as bigint)} {vault.asset}
                    </p>
                    {(previewDepositShares && typeof previewDepositShares === 'bigint' && amount && parseFloat(amount) > 0) ? (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-blue-800 dark:text-blue-400">
                        <div className="flex justify-between items-center">
                          <span>You will receive:</span>
                          <span className="font-semibold">
                            {parseFloat(formatUnits(previewDepositShares, vault.assetDecimals)).toFixed(6)} shares
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !amount || parseFloat(amount) <= 0 || !isWalletReady}
                    variant="primary"
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {pendingDeposit ? "Approving & Depositing..." : "Processing..."}
                      </>
                    ) : !isWalletReady ? (
                      "Wallet Not Connected"
                    ) : needsApproval ? (
                      `Approve & Deposit ${vault.asset}`
                    ) : (
                      `Deposit ${vault.asset}`
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="withdraw" className="space-y-4 mt-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="amount">Amount ({vault.asset})</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={setMaxAmount}
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                      >
                        Max: {formatBalance(depositedAssets as bigint)}
                      </Button>
                    </div>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.000001"
                      min="0"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: {formatBalance(depositedAssets as bigint)} {vault.asset}
                    </p>
                    {(convertToSharesAmount && typeof convertToSharesAmount === 'bigint' && amount && parseFloat(amount) > 0) ? (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-800 dark:text-amber-400">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span>Shares to redeem:</span>
                            <span className="font-semibold">
                              {parseFloat(formatUnits(convertToSharesAmount, vault.assetDecimals)).toFixed(6)}
                            </span>
                          </div>
                          {(vaultBalance && typeof vaultBalance === 'bigint' && convertToSharesAmount > vaultBalance) ? (
                            <div className="text-xs text-amber-700 dark:text-amber-300">
                              ⚠️ Capped to your balance: {parseFloat(formatUnits(vaultBalance, vault.assetDecimals)).toFixed(6)} shares
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {(maxWithdrawAmount && typeof maxWithdrawAmount === 'bigint' && amount && parseFloat(amount) > 0 && parseUnits(amount, vault.assetDecimals) > maxWithdrawAmount) ? (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        ⚠️ Amount exceeds maximum withdrawable: {formatBalance(maxWithdrawAmount)} {vault.asset}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !amount || parseFloat(amount) <= 0 || !isWalletReady || (typeof maxWithdrawAmount === 'bigint' && parseUnits(amount || "0", vault.assetDecimals) > maxWithdrawAmount)}
                    variant="primary"
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : !isWalletReady ? (
                      "Wallet Not Connected"
                    ) : (
                      `Withdraw ${vault.asset}`
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Curator Information */}
      {vault.metadata && vault.metadata.curators && vault.metadata.curators.length > 0 && (
        <CuratorCard metadata={vault.metadata} allocators={vault.allocators} />
      )}
    </div>
  );
}
