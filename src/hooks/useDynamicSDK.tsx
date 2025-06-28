
import { useState } from 'react';
import { toast } from 'sonner';

export const useDynamicSDK = () => {
  const [isDynamicLoaded, setIsDynamicLoaded] = useState(false);
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);
  const [dynamicError, setDynamicError] = useState<string | null>(null);
  const [DynamicComponents, setDynamicComponents] = useState<any>(null);

  const loadDynamicSDK = async () => {
    if (isDynamicLoaded || isLoadingDynamic) return;
    
    setIsLoadingDynamic(true);
    setDynamicError(null);
    
    try {
      console.log('Loading Dynamic SDK...');
      
      // Use environment ID with proper validation
      const ENVIRONMENT_ID = 'dyn_GVYFZ0QJSLhoBKEXyV0nc63Kw8oLtEUgHqvsdsUumeuB1BB8mV4w8HJy';
      
      if (!ENVIRONMENT_ID) {
        throw new Error('Missing Dynamic Environment ID');
      }

      console.log('Using Environment ID:', ENVIRONMENT_ID);
      
      // Import Dynamic SDK modules with aggressive timeout and error handling
      const loadWithTimeout = (promise: Promise<any>, timeout = 5000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SDK load timeout - this may be due to CORS restrictions')), timeout)
          )
        ]);
      };

      let DynamicCore, EthereumModule, SolanaModule;

      try {
        DynamicCore = await loadWithTimeout(import('@dynamic-labs/sdk-react-core'));
        console.log('Dynamic Core loaded successfully');
      } catch (coreError) {
        console.error('Failed to load Dynamic Core:', coreError);
        throw new Error('Dynamic SDK core module failed to load due to network restrictions. Please check your internet connection and try again.');
      }

      try {
        EthereumModule = await loadWithTimeout(import('@dynamic-labs/ethereum'));
        console.log('Ethereum module loaded successfully');
      } catch (ethError) {
        console.warn('Ethereum module failed to load, continuing without it:', ethError);
        EthereumModule = { EthereumWalletConnectors: [] };
      }

      try {
        SolanaModule = await loadWithTimeout(import('@dynamic-labs/solana'));
        console.log('Solana module loaded successfully');
      } catch (solError) {
        console.warn('Solana module failed to load, continuing without it:', solError);
        SolanaModule = { SolanaWalletConnectors: [] };
      }

      const { DynamicContextProvider, DynamicWidget, useDynamicContext } = DynamicCore;
      const { EthereumWalletConnectors = [] } = EthereumModule;
      const { SolanaWalletConnectors = [] } = SolanaModule;

      // Verify core components are loaded
      if (!DynamicContextProvider || !DynamicWidget || !useDynamicContext) {
        throw new Error('Critical Dynamic SDK components not properly loaded');
      }

      console.log('All Dynamic components loaded successfully');

      // Store the components with safe defaults
      setDynamicComponents({
        DynamicContextProvider,
        DynamicWidget,
        useDynamicContext,
        EthereumWalletConnectors: Array.isArray(EthereumWalletConnectors) ? EthereumWalletConnectors : [],
        SolanaWalletConnectors: Array.isArray(SolanaWalletConnectors) ? SolanaWalletConnectors : [],
        ENVIRONMENT_ID
      });
      
      setIsDynamicLoaded(true);
      console.log('Dynamic SDK loaded successfully');
      toast.success('Wallet connectors loaded successfully!');
    } catch (error) {
      console.error('Failed to load Dynamic SDK:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load wallet connectors';
      
      // Provide specific error messages for common issues
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS') || errorMessage.includes('network restrictions')) {
        const corsError = 'Network/CORS error loading wallet connectors. This may be due to domain restrictions in Dynamic\'s configuration. Please try refreshing the page or contact support.';
        setDynamicError(corsError);
        toast.error(corsError);
        
        // Trigger fallback after a delay
        setTimeout(() => {
          console.log('Triggering Web3 MFA fallback due to Dynamic CORS issues');
          window.dispatchEvent(new CustomEvent('trigger-web3-mfa'));
        }, 2000);
      } else if (errorMessage.includes('timeout')) {
        setDynamicError('Connection timeout loading wallet connectors. Please check your internet connection and try again.');
        toast.error('Connection timeout. Please try again.');
      } else {
        setDynamicError(errorMessage);
        toast.error(`Failed to load wallet connectors: ${errorMessage}`);
      }
    } finally {
      setIsLoadingDynamic(false);
    }
  };

  return {
    isDynamicLoaded,
    isLoadingDynamic,
    dynamicError,
    DynamicComponents,
    loadDynamicSDK
  };
};
