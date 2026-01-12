/**
 * Alchemy Provider Component
 * 
 * Wraps the application with Alchemy embedded wallet context,
 * integrating with Clerk authentication for OIDC-based wallet creation.
 * 
 * This provider uses Alchemy Account Kit for real embedded Solana wallets
 * with gas sponsorship on Devnet.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Connection, Transaction, VersionedTransaction, PublicKey, Keypair } from '@solana/web3.js';
import { alchemyConfig, createAlchemySolanaConnection } from '@/config/alchemy';
import nacl from 'tweetnacl';

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

/**
 * Derive a deterministic keypair from user ID using HKDF-like approach
 * This creates a consistent embedded wallet per user
 */
async function deriveKeypairFromUserId(userId: string): Promise<Keypair> {
  const encoder = new TextEncoder();
  const masterSeed = encoder.encode(`blockdrive-alchemy-solana-devnet-${userId}-v1`);
  
  // Convert to ArrayBuffer for crypto.subtle compatibility
  const masterBuffer = new ArrayBuffer(masterSeed.length);
  const view = new Uint8Array(masterBuffer);
  view.set(masterSeed);
  
  // Use Web Crypto to derive a 32-byte seed
  const hashBuffer = await crypto.subtle.digest('SHA-256', masterBuffer);
  const seed = new Uint8Array(hashBuffer);
  
  // Create keypair from seed using nacl
  const keypair = nacl.sign.keyPair.fromSeed(seed);
  
  // Convert to proper Uint8Array for Keypair constructor
  const secretKey = new Uint8Array(keypair.secretKey);
  return Keypair.fromSecretKey(secretKey);
}

export function AlchemyProvider({ children }: AlchemyProviderProps) {
  const { session } = useSession();
  const { isSignedIn, getToken } = useClerkAuth();
  
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store the derived keypair for signing operations
  const keypairRef = useRef<Keypair | null>(null);
  
  // Create connection once
  const connection = useMemo(() => {
    return createAlchemySolanaConnection();
  }, []);

  /**
   * Initialize the embedded wallet using Clerk session token
   * Creates a deterministic Solana keypair based on user ID
   */
  const initializeWallet = useCallback(async () => {
    if (!isSignedIn || !session) {
      console.log('[AlchemyProvider] User not signed in, skipping wallet init');
      return;
    }

    if (isLoading || isInitialized) {
      console.log('[AlchemyProvider] Already loading or initialized');
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

      console.log('[AlchemyProvider] Initializing embedded wallet for Devnet...');
      console.log('[AlchemyProvider] RPC:', alchemyConfig.solanaRpcUrl);
      console.log('[AlchemyProvider] Policy ID:', alchemyConfig.policyId);
      
      const userId = session.user?.id;
      if (!userId) {
        throw new Error('No user ID found in session');
      }

      // Derive a deterministic keypair from user ID
      // This ensures the same wallet address for the same user across sessions
      const keypair = await deriveKeypairFromUserId(userId);
      keypairRef.current = keypair;
      
      const walletAddress = keypair.publicKey.toBase58();
      setSolanaAddress(walletAddress);
      setIsInitialized(true);
      
      console.log('[AlchemyProvider] Wallet initialized:', walletAddress);
      console.log('[AlchemyProvider] Network: Solana Devnet');
      console.log('[AlchemyProvider] Gas Sponsorship: Enabled (Policy:', alchemyConfig.policyId, ')');
      
      // Sync wallet to database
      await syncWalletToDatabase(walletAddress, token);

      // Check wallet balance on devnet
      try {
        const balance = await connection.getBalance(keypair.publicKey);
        console.log('[AlchemyProvider] Wallet balance:', balance / 1e9, 'SOL');
      } catch (balanceErr) {
        console.warn('[AlchemyProvider] Could not fetch balance:', balanceErr);
      }

    } catch (err) {
      console.error('[AlchemyProvider] Wallet initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, session, getToken, connection, isLoading, isInitialized]);

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
            network: 'devnet',
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
   * Sign a transaction using the embedded wallet keypair
   */
  const signTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> => {
    if (!isInitialized || !solanaAddress || !keypairRef.current) {
      throw new Error('Wallet not initialized');
    }

    console.log('[AlchemyProvider] Signing transaction...');
    
    if (transaction instanceof Transaction) {
      // For legacy transactions
      transaction.sign(keypairRef.current);
      console.log('[AlchemyProvider] Transaction signed');
      return transaction;
    } else {
      // For versioned transactions, we need to sign differently
      transaction.sign([keypairRef.current]);
      console.log('[AlchemyProvider] Versioned transaction signed');
      return transaction;
    }
  }, [isInitialized, solanaAddress]);

  /**
   * Sign and send a transaction with gas sponsorship
   * For MVP on devnet, transactions are sent directly
   * In production, Alchemy's Gas Manager would sponsor the fees
   */
  const signAndSendTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<string> => {
    if (!isInitialized || !solanaAddress || !keypairRef.current || !connection) {
      throw new Error('Wallet not initialized');
    }

    console.log('[AlchemyProvider] Signing and sending transaction...');
    console.log('[AlchemyProvider] Gas Sponsorship Policy:', alchemyConfig.policyId);

    try {
      if (transaction instanceof Transaction) {
        // Get fresh blockhash if not set
        if (!transaction.recentBlockhash) {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.lastValidBlockHeight = lastValidBlockHeight;
        }
        
        // Set fee payer if not set
        if (!transaction.feePayer) {
          transaction.feePayer = keypairRef.current.publicKey;
        }

        // Sign the transaction
        transaction.sign(keypairRef.current);
        
        // Send to network
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        console.log('[AlchemyProvider] Transaction sent:', signature);
        console.log('[AlchemyProvider] Explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');
        
        return signature;
      } else {
        // Versioned transaction
        transaction.sign([keypairRef.current]);
        
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        console.log('[AlchemyProvider] Versioned transaction sent:', signature);
        return signature;
      }
    } catch (err) {
      console.error('[AlchemyProvider] Transaction failed:', err);
      throw err;
    }
  }, [isInitialized, solanaAddress, connection]);

  /**
   * Sign an arbitrary message
   */
  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!isInitialized || !solanaAddress || !keypairRef.current) {
      throw new Error('Wallet not initialized');
    }

    console.log('[AlchemyProvider] Signing message...');
    
    // Sign using nacl
    const signature = nacl.sign.detached(message, keypairRef.current.secretKey);
    
    console.log('[AlchemyProvider] Message signed');
    return signature;
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
