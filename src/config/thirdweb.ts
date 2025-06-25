
import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { ethereum, solana } from "thirdweb/chains";

export const thirdwebClient = createThirdwebClient({
  clientId: "cf74fd6b0c10ccf7ff0ab35e790c369a",
});

export const supportedWallets = [
  // Ethereum wallets
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("walletConnect"),
  createWallet("com.trustwallet.app"),
  createWallet("io.rabby"),
  
  // Solana wallets
  createWallet("app.phantom"),
  createWallet("com.solflare"),
  createWallet("com.backpack"),
];

export const supportedChains = [ethereum, solana];
