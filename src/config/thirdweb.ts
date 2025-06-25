
import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { ethereum, solana } from "thirdweb/chains";

export const thirdwebClient = createThirdwebClient({
  clientId: "your_thirdweb_client_id_here", // You'll need to get this from Thirdweb dashboard
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
