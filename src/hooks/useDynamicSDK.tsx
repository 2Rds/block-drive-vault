
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
      
      // Dynamically import the Dynamic SDK modules
      const [
        { DynamicContextProvider, DynamicWidget, useDynamicContext },
        { EthereumWalletConnectors },
        { SolanaWalletConnectors }
      ] = await Promise.all([
        import('@dynamic-labs/sdk-react-core'),
        import('@dynamic-labs/ethereum'),
        import('@dynamic-labs/solana')
      ]);

      const ENVIRONMENT_ID = '63b19e36-1946-4cfa-a62d-3c6edea09860';
      
      if (!ENVIRONMENT_ID) {
        throw new Error('Missing Dynamic Environment ID');
      }

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
      console.log('Dynamic SDK loaded successfully');
      toast.success('Wallet connectors loaded successfully!');
    } catch (error) {
      console.error('Failed to load Dynamic SDK:', error);
      setDynamicError('Failed to load wallet connectors. Please try again.');
      toast.error('Failed to load wallet connectors');
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
