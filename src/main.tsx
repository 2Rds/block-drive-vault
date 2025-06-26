
import { createRoot } from 'react-dom/client'
import React from 'react'
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import App from './App.tsx'
import './index.css'

const ENVIRONMENT_ID = '2762a57b-faa4-41ce-9f16-abff9300e2c9'

if (!ENVIRONMENT_ID) {
  throw new Error('Missing Dynamic Environment ID')
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DynamicContextProvider 
      settings={{
        environmentId: ENVIRONMENT_ID,
        walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
      }}
    >
      <App />
    </DynamicContextProvider>
  </React.StrictMode>
);
