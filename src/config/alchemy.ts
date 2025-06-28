
// Simplified Alchemy configuration to avoid type conflicts
export const ALCHEMY_API_KEY = "your-alchemy-api-key-here";

export const alchemyConfig = {
  apiKey: ALCHEMY_API_KEY,
  chain: "sepolia", // Using string instead of chain object to avoid viem conflicts
  gasManagerConfig: {
    policyId: "your-gas-policy-id",
  },
};

// Simple client configuration without complex types
export const createAlchemyClient = async () => {
  // This will be implemented when the user provides their API key
  console.log('Alchemy client configuration ready');
  return null;
};
