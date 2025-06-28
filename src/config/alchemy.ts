
// Alchemy configuration with BlockDrive app API key
export const ALCHEMY_API_KEY = "Li9cWiYrJ3_IAAHwaJHPIB9WvUTIzf8s";

export const alchemyConfig = {
  apiKey: ALCHEMY_API_KEY,
  chains: {
    ethereum: {
      chain: "eth-sepolia", // Ethereum testnet
      rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    },
    polygon: {
      chain: "polygon-mumbai", // Polygon testnet
      rpcUrl: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    },
    // Note: Alchemy doesn't directly support Solana, but we can configure other chains
    arbitrum: {
      chain: "arb-sepolia", // Arbitrum testnet
      rpcUrl: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    }
  },
  gasManagerConfig: {
    policyId: "your-gas-policy-id-here", // Replace with your actual gas policy ID
  },
};

// Enhanced client configuration with actual API key
export const createAlchemyClient = async (chainType: 'ethereum' | 'polygon' | 'arbitrum' = 'ethereum') => {
  console.log(`Creating Alchemy client for ${chainType} with API key configured`);
  
  const config = alchemyConfig.chains[chainType];
  if (!config) {
    throw new Error(`Unsupported chain type: ${chainType}`);
  }
  
  return {
    apiKey: ALCHEMY_API_KEY,
    rpcUrl: config.rpcUrl,
    chain: config.chain,
    gasManagerConfig: alchemyConfig.gasManagerConfig
  };
};

// Utility function to get RPC URL for a specific chain
export const getAlchemyRpcUrl = (chainType: 'ethereum' | 'polygon' | 'arbitrum' = 'ethereum') => {
  const config = alchemyConfig.chains[chainType];
  return config?.rpcUrl || alchemyConfig.chains.ethereum.rpcUrl;
};
