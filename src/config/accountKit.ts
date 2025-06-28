
import { createConfig, cookieStorage } from "@account-kit/react";
import { QueryClient } from "@tanstack/react-query";
import { sepolia, alchemy } from "@account-kit/infra";

export const config = createConfig(
  {
    transport: alchemy({ apiKey: "Li9cWiYrJ3_IAAHwaJHPIB9WvUTIzf8s" }),
    chain: sepolia,
    ssr: false, // Set to false for client-side apps like yours
    storage: cookieStorage,
    enablePopupOauth: true,
  },
  {
    auth: {
      sections: [
        [{ type: "email" }],
        [
          { type: "passkey" },
          { type: "social", authProviderId: "google", mode: "popup" },
        ],
      ],
      addPasskeyOnSignup: true,
    },
  },
);

export const queryClient = new QueryClient();
