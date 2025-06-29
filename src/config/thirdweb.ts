
import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { ethereum } from "thirdweb/chains";

export const thirdwebClient = createThirdwebClient({
  clientId: "cf74fd6b0c10ccf7ff0ab35e790c369a",
});

export const supportedWallets = [
  // Ethereum and EVM-compatible wallets
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("walletConnect"),
  createWallet("com.trustwallet.app"),
  createWallet("io.rabby"),
  createWallet("me.rainbow"),
  createWallet("app.phantom"), // Phantom supports both Ethereum and Solana
];

export const supportedChains = [ethereum];
