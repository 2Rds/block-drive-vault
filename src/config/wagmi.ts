/**
 * Wagmi Configuration for BlockDrive
 *
 * Configures the EVM chain (Base) for USDC subscriptions, Aave yield, and ENS.
 * Dynamic SDK handles wallet creation; wagmi handles on-chain interactions.
 */

import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { dynamicConfig } from './dynamic';

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(dynamicConfig.baseRpcUrl),
    [baseSepolia.id]: http(),
  },
  // Dynamic SDK manages wallet connection — no connectors needed here.
  // We use wagmi only for readContract / writeContract via the wallet client
  // that Dynamic's primaryWallet.getWalletClient() provides.
});
