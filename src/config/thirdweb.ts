
import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { base } from "thirdweb/chains";

export const thirdwebClient = createThirdwebClient({
  clientId: "cf74fd6b0c10ccf7ff0ab35e790c369a",
});

export const supportedWallets = [
  // Base L2 compatible wallets
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"), // Coinbase Wallet has native Base support
  createWallet("walletConnect"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
];

export const supportedChains = [base]; // Only Base L2
