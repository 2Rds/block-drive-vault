
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
      
      // Use the new environment ID
      const ENVIRONMENT_ID = 'dyn_GVYFZ0QJSLhoBKEXyV0nc63Kw8oLtEUgHqvsdsUumeuB1BB8mV4w8HJy';
      
      if (!ENVIRONMENT_ID) {
        throw new Error('Missing Dynamic Environment ID');
      }

      console.log('Using Environment ID:', ENVIRONMENT_ID);
      
      // Import Dynamic SDK modules with better error handling
      const DynamicCore = await import('@dynamic-labs/sdk-react-core');
      console.log('Dynamic Core loaded:', !!DynamicCore.DynamicContextProvider);

      const EthereumModule = await import('@dynamic-labs/ethereum');
      console.log('Ethereum module loaded:', !!EthereumModule.EthereumWalletConnectors);

      const SolanaModule = await import('@dynamic-labs/solana');
      console.log('Solana module loaded:', !!SolanaModule.SolanaWalletConnectors);

      const { DynamicContextProvider, DynamicWidget, useDynamicContext } = DynamicCore;
      const { EthereumWalletConnectors = [] } = EthereumModule;
      const { SolanaWalletConnectors = [] } = SolanaModule;

      // Verify components are loaded
      if (!DynamicContextProvider || !DynamicWidget || !useDynamicContext) {
        throw new Error('Dynamic SDK components not properly loaded');
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
      setDynamicError(errorMessage);
      toast.error(`Failed to load wallet connectors: ${errorMessage}`);
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
