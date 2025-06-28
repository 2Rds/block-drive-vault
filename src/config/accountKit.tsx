
import { AlchemyAccountsUIConfig, createConfig } from "@account-kit/react";
import { sepolia, alchemy } from "@account-kit/infra";
import { QueryClient } from "@tanstack/react-query";

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: "linear",
  auth: {
    sections: [[{"type":"external_wallets","walletConnect":{"projectId":"your-project-id"}}]],
    addPasskeyOnSignup: false,
    header: <img src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" alt="BlockDrive Logo" />,
  },
};

export const config = createConfig({
  // API key from BlockDrive app configuration
  transport: alchemy({ apiKey: "Li9cWiYrJ3_IAAHwaJHPIB9WvUTIzf8s" }),
  chain: sepolia,
  ssr: false, // Set to false for client-side apps like yours
  enablePopupOauth: true,
}, uiConfig);

export const queryClient = new QueryClient();
