
// Simplified Alchemy configuration to avoid version conflicts
export const ALCHEMY_API_KEY = "your-alchemy-api-key-here";

export const alchemyConfig = {
  apiKey: ALCHEMY_API_KEY,
  chain: 'sepolia',
  gasManagerConfig: {
    policyId: "your-gas-policy-id",
  },
};
