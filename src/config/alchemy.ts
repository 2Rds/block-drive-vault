
import { createAlchemySmartAccountClient } from "@alchemy/aa-alchemy";
import { sepolia } from "viem/chains";

// You'll need to replace this with your actual Alchemy API key
export const ALCHEMY_API_KEY = "your-alchemy-api-key-here";

// Configure Alchemy client
export const alchemyClient = createAlchemySmartAccountClient({
  apiKey: ALCHEMY_API_KEY,
  chain: sepolia, // You can change this to mainnet or other chains
  gasManagerConfig: {
    policyId: "your-gas-policy-id", // Optional: for sponsored transactions
  },
});

export const alchemyConfig = {
  apiKey: ALCHEMY_API_KEY,
  chain: sepolia,
  gasManagerConfig: {
    policyId: "your-gas-policy-id",
  },
};
