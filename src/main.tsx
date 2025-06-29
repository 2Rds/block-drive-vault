
import { createRoot } from 'react-dom/client'
import React from 'react'
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import App from './App.tsx'
import './index.css'

const ENVIRONMENT_ID = '63b19e36-1946-4cfa-a62d-3c6edea09860'

if (!ENVIRONMENT_ID) {
  throw new Error('Missing Dynamic Environment ID')
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DynamicContextProvider 
      settings={{
        environmentId: ENVIRONMENT_ID,
        walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
        appName: 'BlockDrive',
        appLogoUrl: '/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png',
        networkValidationMode: 'always',
        initialAuthenticationMode: 'connect-only',
        // Add error handling and retry logic
        enableVisitTrackingOnConnectOnly: false,
        // Reduce network calls that might be causing issues
        shadowDOMEnabled: false,
      }}
    >
      <App />
    </DynamicContextProvider>
  </React.StrictMode>
);
