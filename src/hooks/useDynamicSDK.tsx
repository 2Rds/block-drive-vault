
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
      
      // Use the correct environment ID
      const ENVIRONMENT_ID = '63b19e36-1946-4cfa-a62d-3c6edea09860';
      
      if (!ENVIRONMENT_ID) {
        throw new Error('Missing Dynamic Environment ID');
      }

      console.log('Using Environment ID:', ENVIRONMENT_ID);
      
      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Dynamically import the Dynamic SDK modules with error handling
      const [
        { DynamicContextProvider, DynamicWidget, useDynamicContext },
        { EthereumWalletConnectors },
        { SolanaWalletConnectors }
      ] = await Promise.all([
        import('@dynamic-labs/sdk-react-core').catch(err => {
          console.error('Failed to load Dynamic core:', err);
          throw new Error('Failed to load Dynamic core SDK');
        }),
        import('@dynamic-labs/ethereum').catch(err => {
          console.error('Failed to load Ethereum connectors:', err);
          throw new Error('Failed to load Ethereum wallet connectors');
        }),
        import('@dynamic-labs/solana').catch(err => {
          console.error('Failed to load Solana connectors:', err);
          throw new Error('Failed to load Solana wallet connectors');
        })
      ]);

      console.log('Dynamic SDK modules loaded successfully');

      // Verify components are loaded
      if (!DynamicContextProvider || !DynamicWidget || !useDynamicContext) {
        throw new Error('Dynamic SDK components not properly loaded');
      }

      // Verify wallet connectors are properly loaded
      if (!EthereumWalletConnectors || !SolanaWalletConnectors) {
        throw new Error('Failed to load wallet connectors');
      }

      console.log('Wallet connectors loaded:', {
        ethereum: Array.isArray(EthereumWalletConnectors) ? EthereumWalletConnectors.length : 'Available',
        solana: Array.isArray(SolanaWalletConnectors) ? SolanaWalletConnectors.length : 'Available'
      });

      // Store the components
      setDynamicComponents({
        DynamicContextProvider,
        DynamicWidget,
        useDynamicContext,
        EthereumWalletConnectors,
        SolanaWalletConnectors,
        ENVIRONMENT_ID
      });
      
      setIsDynamicLoaded(true);
      console.log('Dynamic SDK loaded successfully with Environment ID:', ENVIRONMENT_ID);
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
