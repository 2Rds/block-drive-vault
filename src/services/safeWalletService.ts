
import Safe from '@safe-global/safe-core-sdk';
import EthersAdapter from '@safe-global/safe-ethers-lib';
import SafeServiceClient from '@safe-global/safe-service-client';
import { ethers } from 'ethers';
import { toast } from 'sonner';

export interface SafeWalletData {
  safeAddress: string;
  owners: string[];
  threshold: number;
  chainId: number;
  balance: string;
  pendingTransactions: number;
}

export class SafeWalletService {
  private safe: Safe | null = null;
  private ethAdapter: EthersAdapter | null = null;
  private safeService: SafeServiceClient | null = null;
  private provider: ethers.providers.Web3Provider | null = null;

  async connectSafeWallet(): Promise<SafeWalletData | null> {
    try {
      // Check if wallet is available
      if (!window.ethereum) {
        toast.error('Please install MetaMask or another Ethereum wallet');
        return null;
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = this.provider.getSigner();
      const signerAddress = await signer.getAddress();
      const chainId = await signer.getChainId();

      console.log('Connected to wallet:', signerAddress, 'on chain:', chainId);

      // Create ethers adapter
      this.ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer
      });

      // Initialize Safe service client (using Optimism mainnet as default)
      const serviceUrl = this.getSafeServiceUrl(chainId);
      if (serviceUrl) {
        this.safeService = new SafeServiceClient({
          txServiceUrl: serviceUrl,
          ethAdapter: this.ethAdapter
        });
      }

      // Try to find existing Safe wallets for this owner
      const safeAddresses = await this.findSafeAddresses(signerAddress, chainId);
      
      if (safeAddresses.length === 0) {
        toast.warning('No Safe wallets found. You can create one at safe.optimism.io');
        return null;
      }

      // Use the first Safe found
      const safeAddress = safeAddresses[0];
      
      // Initialize Safe SDK
      this.safe = await Safe.create({
        ethAdapter: this.ethAdapter,
        safeAddress
      });

      // Get Safe info
      const owners = await this.safe.getOwners();
      const threshold = await this.safe.getThreshold();
      const balance = await this.provider.getBalance(safeAddress);
      
      // Get pending transactions count
      let pendingTransactions = 0;
      if (this.safeService) {
        try {
          const pendingTxs = await this.safeService.getPendingTransactions(safeAddress);
          pendingTransactions = pendingTxs.count;
        } catch (error) {
          console.log('Could not fetch pending transactions:', error);
        }
      }

      const safeData: SafeWalletData = {
        safeAddress,
        owners,
        threshold,
        chainId,
        balance: ethers.utils.formatEther(balance),
        pendingTransactions
      };

      toast.success(`Connected to Safe wallet on ${this.getChainName(chainId)}`);
      return safeData;

    } catch (error: any) {
      console.error('Error connecting to Safe wallet:', error);
      toast.error(`Failed to connect Safe wallet: ${error.message}`);
      return null;
    }
  }

  private async findSafeAddresses(ownerAddress: string, chainId: number): Promise<string[]> {
    // For now, we'll return mock addresses since we need actual Safe wallets to test
    // In production, you would use the Safe service to find real Safe addresses
    if (this.safeService) {
      try {
        const safes = await this.safeService.getSafesByOwner(ownerAddress);
        return safes.safes;
      } catch (error) {
        console.log('Could not fetch Safe addresses from service:', error);
      }
    }

    // Mock Safe addresses for different chains for demo purposes
    const mockSafes: Record<number, string[]> = {
      1: ['0x1234567890123456789012345678901234567890'], // Ethereum
      10: ['0x2345678901234567890123456789012345678901'], // Optimism
      8453: ['0x3456789012345678901234567890123456789012'], // Base
      42161: ['0x4567890123456789012345678901234567890123'] // Arbitrum
    };

    return mockSafes[chainId] || [];
  }

  private getSafeServiceUrl(chainId: number): string | null {
    const serviceUrls: Record<number, string> = {
      1: 'https://safe-transaction-mainnet.safe.global',
      10: 'https://safe-transaction-optimism.safe.global',
      8453: 'https://safe-transaction-base.safe.global',
      42161: 'https://safe-transaction-arbitrum.safe.global',
      11155111: 'https://safe-transaction-sepolia.safe.global' // Sepolia testnet
    };

    return serviceUrls[chainId] || null;
  }

  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      10: 'Optimism',
      8453: 'Base',
      42161: 'Arbitrum',
      11155111: 'Sepolia'
    };

    return chainNames[chainId] || `Chain ${chainId}`;
  }

  async signMessage(message: string): Promise<string | null> {
    if (!this.safe || !this.ethAdapter) {
      throw new Error('Safe wallet not connected');
    }

    try {
      const signer = this.ethAdapter.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error: any) {
      console.error('Error signing message:', error);
      toast.error('Failed to sign message');
      return null;
    }
  }

  getSafeInfo(): SafeWalletData | null {
    return this.safe ? {
      safeAddress: this.safe.getAddress(),
      owners: [],
      threshold: 0,
      chainId: 0,
      balance: '0',
      pendingTransactions: 0
    } : null;
  }

  disconnect(): void {
    this.safe = null;
    this.ethAdapter = null;
    this.safeService = null;
    this.provider = null;
    console.log('Safe wallet disconnected');
  }
}
