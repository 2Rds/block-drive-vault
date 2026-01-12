/**
 * Alchemy Provider Component
 * 
 * Wraps the application with Alchemy embedded wallet context,
 * integrating with Clerk authentication for OIDC-based wallet creation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Connection, Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { alchemyConfig, createAlchemySolanaConnection, validateAlchemyConfig } from '@/config/alchemy';

interface AlchemyWalletContextType {
  // Wallet state
  solanaAddress: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Connection
  connection: Connection | null;
  
  // Wallet operations
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<string>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  
  // Initialize wallet manually if needed
  initializeWallet: () => Promise<void>;
}

const AlchemyWalletContext = createContext<AlchemyWalletContextType | null>(null);

export function useAlchemyWallet(): AlchemyWalletContextType {
  const context = useContext(AlchemyWalletContext);
  if (!context) {
    throw new Error('useAlchemyWallet must be used within AlchemyProvider');
  }
  return context;
}

interface AlchemyProviderProps {
  children: React.ReactNode;
}

export function AlchemyProvider({ children }: AlchemyProviderProps) {
  const { session } = useSession();
  const { isSignedIn, getToken } = useClerkAuth();
  
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create connection once
  const connection = useMemo(() => {
    const config = validateAlchemyConfig();
    if (!config.valid) {
      console.warn('[AlchemyProvider] Missing config:', config.missing);
      return null;
    }
    return createAlchemySolanaConnection();
  }, []);

  /**
   * Initialize the embedded wallet using Clerk session token
   */
  const initializeWallet = useCallback(async () => {
    if (!isSignedIn || !session) {
      console.log('[AlchemyProvider] User not signed in, skipping wallet init');
      return;
    }

    const config = validateAlchemyConfig();
    if (!config.valid) {
      setError(`Missing Alchemy configuration: ${config.missing.join(', ')}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the Clerk session token for OIDC auth
      const token = await getToken();
      
      if (!token) {
        throw new Error('Failed to get Clerk session token');
      }

      console.log('[AlchemyProvider] Initializing embedded wallet with Clerk token');
      
      // In a full Alchemy SDK integration, we would initialize the signer here.
      // For now, we'll generate a deterministic address based on the user ID
      // This ensures consistent addresses while the full SDK integration is pending.
      
      // Deterministic wallet address generation (temporary until full SDK)
      const userId = session.user?.id;
      if (userId) {
        // Generate a pseudo-deterministic address for demo purposes
        // In production, Alchemy SDK handles this via OIDC
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(`blockdrive-solana-${userId}`);
        // Convert to ArrayBuffer properly for crypto.subtle
        const dataBuffer = dataBytes.buffer.slice(
          dataBytes.byteOffset, 
          dataBytes.byteOffset + dataBytes.byteLength
        ) as ArrayBuffer;
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = new Uint8Array(hashBuffer);
        
        // Create a valid Solana address format (32 bytes, base58 encoded)
        const addressBytes = hashArray.slice(0, 32);
        const publicKey = new PublicKey(addressBytes);
        
        setSolanaAddress(publicKey.toBase58());
        setIsInitialized(true);
        
        console.log('[AlchemyProvider] Wallet initialized:', publicKey.toBase58());
        
        // Sync wallet to database
        await syncWalletToDatabase(publicKey.toBase58(), token);
      }
    } catch (err) {
      console.error('[AlchemyProvider] Wallet initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, session, getToken]);

  /**
   * Sync the wallet address to Supabase
   */
  const syncWalletToDatabase = async (address: string, token: string) => {
    try {
      const response = await fetch(
        'https://uxwfbialyxqaduiartpu.supabase.co/functions/v1/sync-alchemy-wallet',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            solanaAddress: address,
            walletProvider: 'alchemy_embedded',
          }),
        }
      );

      if (!response.ok) {
        console.warn('[AlchemyProvider] Failed to sync wallet to database');
      } else {
        console.log('[AlchemyProvider] Wallet synced to database');
      }
    } catch (err) {
      console.warn('[AlchemyProvider] Wallet sync error:', err);
    }
  };

  /**
   * Sign a transaction using the embedded wallet
   */
  const signTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> => {
    if (!isInitialized || !solanaAddress) {
      throw new Error('Wallet not initialized');
    }

    // In production with full Alchemy SDK:
    // return await alchemySigner.signTransaction(transaction);
    
    // For now, log the intent and return the transaction
    // The actual signing will be implemented with full SDK
    console.log('[AlchemyProvider] signTransaction called - SDK integration pending');
    throw new Error('Transaction signing requires full Alchemy SDK integration');
  }, [isInitialized, solanaAddress]);

  /**
   * Sign and send a transaction with gas sponsorship
   */
  const signAndSendTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<string> => {
    if (!isInitialized || !solanaAddress || !connection) {
      throw new Error('Wallet not initialized');
    }

    // In production with full Alchemy SDK:
    // const signedTx = await alchemySigner.signTransaction(transaction);
    // return await connection.sendRawTransaction(signedTx.serialize());
    
    console.log('[AlchemyProvider] signAndSendTransaction called - SDK integration pending');
    throw new Error('Transaction sending requires full Alchemy SDK integration');
  }, [isInitialized, solanaAddress, connection]);

  /**
   * Sign an arbitrary message
   */
  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!isInitialized || !solanaAddress) {
      throw new Error('Wallet not initialized');
    }

    // In production with full Alchemy SDK:
    // return await alchemySigner.signMessage(message);
    
    console.log('[AlchemyProvider] signMessage called - SDK integration pending');
    throw new Error('Message signing requires full Alchemy SDK integration');
  }, [isInitialized, solanaAddress]);

  // Auto-initialize wallet when user signs in
  useEffect(() => {
    if (isSignedIn && !isInitialized && !isLoading) {
      initializeWallet();
    }
  }, [isSignedIn, isInitialized, isLoading, initializeWallet]);

  const value: AlchemyWalletContextType = useMemo(() => ({
    solanaAddress,
    isInitialized,
    isLoading,
    error,
    connection,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    initializeWallet,
  }), [
    solanaAddress,
    isInitialized,
    isLoading,
    error,
    connection,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    initializeWallet,
  ]);

  return (
    <AlchemyWalletContext.Provider value={value}>
      {children}
    </AlchemyWalletContext.Provider>
  );
}

export default AlchemyProvider;
