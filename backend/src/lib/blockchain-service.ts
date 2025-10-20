import { ethers } from 'ethers';

export interface ContractCall {
  contractAddress: string;
  abi: any[];
  functionName: string;
  args: any[];
  value?: string;
}

export interface TransactionOptions {
  gasLimit?: number;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  retries?: number;
  retryDelay?: number;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: number;
  effectiveGasPrice?: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private chainId: number;

  constructor() {
    // Initialize provider for Base mainnet
    this.provider = new ethers.JsonRpcProvider(
      process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    );
    
    // Initialize backend wallet
    const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
    }
    
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.chainId = 8453; // Base mainnet
    
    console.log('BlockchainService initialized with wallet:', this.wallet.address);
  }

  /**
   * Execute a contract call with automatic gas estimation and retry logic
   */
  async executeContractCall(
    contractCall: ContractCall,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const {
      retries = 3,
      retryDelay = 2000,
      ...txOptions
    } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Executing contract call (attempt ${attempt}/${retries}):`, {
          contract: contractCall.contractAddress,
          function: contractCall.functionName,
          args: contractCall.args
        });

        const contract = new ethers.Contract(
          contractCall.contractAddress,
          contractCall.abi,
          this.wallet
        );

        // Estimate gas
        const estimatedGas = await contract[contractCall.functionName].estimateGas(
          ...contractCall.args,
          { value: contractCall.value || 0 }
        );

        // Add 20% buffer to gas estimate
        const gasLimit = txOptions.gasLimit || (estimatedGas * 120n / 100n);

        // Get current gas prices
        const feeData = await this.provider.getFeeData();
        
        const txParams: any = {
          gasLimit,
          value: contractCall.value || 0
        };

        // Use EIP-1559 if supported
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          txParams.maxFeePerGas = txOptions.maxFeePerGas || feeData.maxFeePerGas;
          txParams.maxPriorityFeePerGas = txOptions.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas;
        } else {
          txParams.gasPrice = txOptions.gasPrice || feeData.gasPrice;
        }

        // Execute transaction
        const tx = await contract[contractCall.functionName](
          ...contractCall.args,
          txParams
        );

        console.log('Transaction sent:', tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          console.log('Transaction confirmed:', {
            hash: receipt.hash,
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: receipt.gasPrice?.toString()
          });

          return {
            success: true,
            transactionHash: receipt.hash,
            gasUsed: Number(receipt.gasUsed),
            effectiveGasPrice: receipt.gasPrice?.toString()
          };
        } else {
          throw new Error('Transaction failed with status 0');
        }

      } catch (error) {
        console.error(`Contract call attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }

        // Wait before retry
        await this.delay(retryDelay);
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded'
    };
  }

  /**
   * Execute multiple contract calls in a batch with gas optimization
   */
  async executeBatchContractCalls(
    contractCalls: ContractCall[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult[]> {
    const results: TransactionResult[] = [];

    for (const contractCall of contractCalls) {
      const result = await this.executeContractCall(contractCall, options);
      results.push(result);

      // If a critical transaction fails, stop processing
      if (!result.success) {
        console.error('Batch execution stopped due to failed transaction:', result.error);
        break;
      }

      // Small delay between transactions to avoid nonce issues
      await this.delay(1000);
    }

    return results;
  }

  /**
   * Get current gas prices with optimization for Base network
   */
  async getOptimalGasPrices(): Promise<{
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }> {
    try {
      const feeData = await this.provider.getFeeData();

      // For Base, we can typically use lower priority fees
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        return {
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas / 2n).toString() // Use half the suggested priority fee
        };
      } else {
        return {
          gasPrice: feeData.gasPrice?.toString()
        };
      }
    } catch (error) {
      console.error('Failed to get gas prices:', error);
      throw new Error('Failed to get current gas prices');
    }
  }

  /**
   * Check if a transaction is likely to succeed before sending
   */
  async simulateTransaction(contractCall: ContractCall): Promise<{
    success: boolean;
    estimatedGas?: number;
    error?: string;
  }> {
    try {
      const contract = new ethers.Contract(
        contractCall.contractAddress,
        contractCall.abi,
        this.wallet
      );

      // Try to estimate gas (this will revert if the transaction would fail)
      const estimatedGas = await contract[contractCall.functionName].estimateGas(
        ...contractCall.args,
        { value: contractCall.value || 0 }
      );

      return {
        success: true,
        estimatedGas: Number(estimatedGas)
      };

    } catch (error) {
      console.error('Transaction simulation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed'
      };
    }
  }

  /**
   * Get transaction status and details
   */
  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed' | 'not_found';
    blockNumber?: number;
    gasUsed?: number;
    effectiveGasPrice?: string;
    confirmations?: number;
  }> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      
      if (!tx) {
        return { status: 'not_found' };
      }

      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { status: 'pending' };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        effectiveGasPrice: receipt.gasPrice?.toString(),
        confirmations
      };

    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return { status: 'not_found' };
    }
  }

  /**
   * Monitor transaction until confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<TransactionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getTransactionStatus(txHash);

      if (status.status === 'confirmed' && (status.confirmations || 0) >= confirmations) {
        return {
          success: true,
          transactionHash: txHash,
          gasUsed: status.gasUsed,
          effectiveGasPrice: status.effectiveGasPrice
        };
      }

      if (status.status === 'failed') {
        return {
          success: false,
          error: 'Transaction failed',
          transactionHash: txHash
        };
      }

      // Wait 5 seconds before checking again
      await this.delay(5000);
    }

    return {
      success: false,
      error: 'Transaction timeout',
      transactionHash: txHash
    };
  }

  /**
   * Get wallet balance in ETH
   */
  async getWalletBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(tokenAddress: string, decimals: number = 18): Promise<string> {
    try {
      const contract = new ethers.Contract(
        tokenAddress,
        [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ],
        this.provider
      );

      const balance = await contract.balanceOf(this.wallet.address);
      return ethers.formatUnits(balance, decimals);

    } catch (error) {
      console.error('Failed to get token balance:', error);
      throw new Error('Failed to get token balance');
    }
  }

  /**
   * Check if contract exists at address
   */
  async isContract(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      console.error('Failed to check contract:', error);
      return false;
    }
  }

  /**
   * Get current network information
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    blockNumber: number;
    gasPrice: string;
  }> {
    try {
      const [network, blockNumber, gasPrice] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
        this.provider.getFeeData().then(feeData => feeData.gasPrice || BigInt(0))
      ]);

      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: gasPrice.toString()
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw new Error('Failed to get network information');
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get provider
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Emergency function to estimate gas for complex operations
   */
  async estimateGasForCall(contractCall: ContractCall): Promise<{
    gasEstimate: number;
    gasCost: string; // in ETH
  }> {
    try {
      const contract = new ethers.Contract(
        contractCall.contractAddress,
        contractCall.abi,
        this.wallet
      );

      const gasEstimate = await contract[contractCall.functionName].estimateGas(
        ...contractCall.args,
        { value: contractCall.value || 0 }
      );

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      const gasCost = ethers.formatEther(gasEstimate * gasPrice);

      return {
        gasEstimate: Number(gasEstimate),
        gasCost
      };

    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw new Error('Failed to estimate gas for transaction');
    }
  }
}