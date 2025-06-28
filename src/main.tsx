
import { createRoot } from 'react-dom/client'
import React from 'react'
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import App from './App.tsx'
import './index.css'

const ENVIRONMENT_ID = '63b19e36-1946-4cfa-a62d-3c6edea09860'

if (!ENVIRONMENT_ID) {
  console.error('Missing Dynamic Environment ID')
}

// Add error boundary for Dynamic SDK
const DynamicWrapper = ({ children }: { children: React.ReactNode }) => {
  if (!ENVIRONMENT_ID) {
    console.warn('Dynamic SDK not initialized - missing environment ID')
    return <>{children}</>
  }

  try {
    return (
      <DynamicContextProvider 
        settings={{
          environmentId: ENVIRONMENT_ID,
          walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
          appName: 'BlockDrive',
          appLogoUrl: '/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png',
          // Simplified settings to reduce potential conflicts
          initialAuthenticationMode: 'connect-only',
          enableVisitTrackingOnConnectOnly: false,
          shadowDOMEnabled: false,
          // Add retry and timeout settings
          debugError: false, // Disable debug to reduce console noise
        }}
      >
        {children}
      </DynamicContextProvider>
    )
  } catch (error) {
    console.error('Dynamic SDK initialization failed:', error)
    return <>{children}</>
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DynamicWrapper>
      <App />
    </DynamicWrapper>
  </React.StrictMode>
);
