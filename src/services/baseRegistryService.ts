
import { ethers } from 'ethers';
import { toast } from 'sonner';

// Registry contract address on Base
const REGISTRY_ADDRESS = '0xb40eb0c9edd1ccf5305dccf7da92291f8059d947';
const RESOLVER_ADDRESS = '0x253e86cb173de2e6ef8f160697f5b7621c135f8bcb248c31bca065da48b94e84';

// Basic ABI for the registry contract
const REGISTRY_ABI = [
  'function addRegistrar(address registrar) external',
  'function register(string memory name, address owner) external',
  'function isRegistered(string memory name) external view returns (bool)',
  'function owner(string memory name) external view returns (address)',
  'function setResolver(string memory name, address resolver) external'
];

const RESOLVER_ABI = [
  'function setAddr(bytes32 node, address addr) external',
  'function addr(bytes32 node) external view returns (address)'
];

export interface BaseRegistryResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class BaseRegistryService {
  /**
   * Connect L2 Registrar to L2 Registry (final step)
   */
  static async connectRegistrarToRegistry(
    registrarAddress: string,
    walletProvider: any
  ): Promise<BaseRegistryResult> {
    try {
      console.log('Connecting L2 Registrar to L2 Registry...');
      
      const provider = new ethers.providers.Web3Provider(walletProvider);
      const signer = provider.getSigner();
      
      const registryContract = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        signer
      );

      // Call addRegistrar() on the registry with the registrar address
      const tx = await registryContract.addRegistrar(registrarAddress);
      console.log('Transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.transactionHash);

      toast.success('L2 Registrar successfully connected to L2 Registry!');
      
      return {
        success: true,
        txHash: receipt.transactionHash
      };

    } catch (error: any) {
      console.error('Error connecting registrar to registry:', error);
      toast.error('Failed to connect registrar to registry');
      
      return {
        success: false,
        error: error.message || 'Failed to connect registrar'
      };
    }
  }

  /**
   * Register a blockdrive.eth subdomain on Base
   */
  static async registerSubdomain(
    subdomainName: string,
    ownerAddress: string,
    walletProvider: any
  ): Promise<BaseRegistryResult> {
    try {
      console.log('Registering subdomain on Base:', subdomainName);
      
      const provider = new ethers.providers.Web3Provider(walletProvider);
      const signer = provider.getSigner();
      
      const registryContract = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        signer
      );

      // Register the subdomain
      const tx = await registryContract.register(subdomainName, ownerAddress);
      console.log('Registration transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Registration confirmed:', receipt.transactionHash);

      // Set resolver for the subdomain
      await this.setSubdomainResolver(subdomainName, walletProvider);

      toast.success(`${subdomainName}.blockdrive.eth registered successfully on Base!`);
      
      return {
        success: true,
        txHash: receipt.transactionHash
      };

    } catch (error: any) {
      console.error('Error registering subdomain:', error);
      toast.error('Failed to register subdomain on Base');
      
      return {
        success: false,
        error: error.message || 'Failed to register subdomain'
      };
    }
  }

  /**
   * Set resolver for a subdomain
   */
  static async setSubdomainResolver(
    subdomainName: string,
    walletProvider: any
  ): Promise<BaseRegistryResult> {
    try {
      const provider = new ethers.providers.Web3Provider(walletProvider);
      const signer = provider.getSigner();
      
      const registryContract = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        signer
      );

      const tx = await registryContract.setResolver(subdomainName, RESOLVER_ADDRESS);
      const receipt = await tx.wait();
      
      console.log('Resolver set for subdomain:', subdomainName);
      
      return {
        success: true,
        txHash: receipt.transactionHash
      };

    } catch (error: any) {
      console.error('Error setting resolver:', error);
      return {
        success: false,
        error: error.message || 'Failed to set resolver'
      };
    }
  }

  /**
   * Check if a subdomain is available
   */
  static async isSubdomainAvailable(
    subdomainName: string,
    walletProvider: any
  ): Promise<boolean> {
    try {
      const provider = new ethers.providers.Web3Provider(walletProvider);
      const registryContract = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        provider
      );

      const isRegistered = await registryContract.isRegistered(subdomainName);
      return !isRegistered;

    } catch (error) {
      console.error('Error checking subdomain availability:', error);
      return false;
    }
  }

  /**
   * Get the owner of a subdomain
   */
  static async getSubdomainOwner(
    subdomainName: string,
    walletProvider: any
  ): Promise<string | null> {
    try {
      const provider = new ethers.providers.Web3Provider(walletProvider);
      const registryContract = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        provider
      );

      const owner = await registryContract.owner(subdomainName);
      return owner === ethers.constants.AddressZero ? null : owner;

    } catch (error) {
      console.error('Error getting subdomain owner:', error);
      return null;
    }
  }
}
