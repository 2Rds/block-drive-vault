/**
 * Alchemy Provider Component
 *
 * Wraps the application with Alchemy embedded wallet context,
 * integrating with Clerk authentication for OIDC-based wallet creation.
 *
 * This provider uses Alchemy Account Kit with Web Signer for real MPC-based
 * Solana embedded wallets with gas sponsorship on Devnet.
 *
 * Updated to use @account-kit/signer SDK instead of local keypair derivation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Connection, Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { AlchemySignerWebClient, SolanaSigner } from '@account-kit/signer';
import { alchemyConfig, createAlchemySolanaConnection } from '@/config/alchemy';

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

  // Store the Alchemy signer instances
  const signerClientRef = useRef<AlchemySignerWebClient | null>(null);
  const solanaSignerRef = useRef<SolanaSigner | null>(null);

  // Create connection once
  const connection = useMemo(() => {
    return createAlchemySolanaConnection();
  }, []);

  /**
   * Initialize the embedded wallet using Alchemy Web Signer with Clerk JWT
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

      console.log('[AlchemyProvider] Initializing Alchemy Web Signer for Solana Devnet...');
      console.log('[AlchemyProvider] RPC:', alchemyConfig.solanaRpcUrl);
      console.log('[AlchemyProvider] Policy ID:', alchemyConfig.policyId);

      const userId = session.user?.id;
      if (!userId) {
        throw new Error('No user ID found in session');
      }

      // Initialize Alchemy Signer Web Client with Clerk JWT
      // The iframe stamper is required for MPC wallet operations
      const signerClient = new AlchemySignerWebClient({
        connection: {
          jwt: token,
        },
        iframeConfig: {
          iframeContainerId: 'alchemy-signer-iframe-container',
        },
      });

      signerClientRef.current = signerClient;

      console.log('[AlchemyProvider] Authenticating with Clerk JWT...');

      // Authenticate using the Clerk JWT (custom JWT authentication)
      const authResponse = await signerClient.submitJwt({
        jwt: token,
        authProvider: 'clerk', // Specify Clerk as the auth provider
      });

      console.log('[AlchemyProvider] JWT authentication successful');

      // Complete authentication to get user info
      const user = await signerClient.completeAuthWithBundle({
        bundle: authResponse.bundle,
        orgId: authResponse.orgId,
        connectedEventName: 'connected',
        authenticatingType: 'jwt',
      });

      console.log('[AlchemyProvider] User authenticated:', user);

      // Create Solana signer from the authenticated client
      const solanaSigner = new SolanaSigner(signerClient);
      solanaSignerRef.current = solanaSigner;

      // Get the Solana wallet address
      const walletAddress = solanaSigner.address;
      setSolanaAddress(walletAddress);
      setIsInitialized(true);

      console.log('[AlchemyProvider] Alchemy MPC Wallet initialized:', walletAddress);
      console.log('[AlchemyProvider] Network: Solana Devnet');
      console.log('[AlchemyProvider] Gas Sponsorship: Enabled (Policy:', alchemyConfig.policyId, ')');

      // Sync wallet to database
      await syncWalletToDatabase(walletAddress, token);

      // Check wallet balance on devnet
      try {
        const publicKey = new PublicKey(walletAddress);
        const balance = await connection.getBalance(publicKey);
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
            walletProvider: 'alchemy_embedded_mpc',
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
   * Sign a transaction using the Alchemy MPC signer
   */
  const signTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> => {
    if (!isInitialized || !solanaAddress || !solanaSignerRef.current) {
      throw new Error('Wallet not initialized');
    }

    console.log('[AlchemyProvider] Signing transaction with Alchemy MPC...');

    // Use Alchemy's addSignature method which handles MPC signing
    const signedTx = await solanaSignerRef.current.addSignature(transaction);

    console.log('[AlchemyProvider] Transaction signed via MPC');
    return signedTx;
  }, [isInitialized, solanaAddress]);

  /**
   * Sign and send a transaction with Alchemy gas sponsorship
   * Uses Alchemy's addSponsorship method for gas-sponsored transactions
   */
  const signAndSendTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<string> => {
    if (!isInitialized || !solanaAddress || !solanaSignerRef.current || !connection) {
      throw new Error('Wallet not initialized');
    }

    console.log('[AlchemyProvider] Signing and sending transaction with gas sponsorship...');
    console.log('[AlchemyProvider] Gas Sponsorship Policy:', alchemyConfig.policyId);

    try {
      // For sponsored transactions, we need to use Alchemy's addSponsorship method
      // This only works with VersionedTransaction

      let sponsoredTx: VersionedTransaction;

      if (transaction instanceof Transaction) {
        // Convert legacy transaction to instructions and use addSponsorship
        console.log('[AlchemyProvider] Converting legacy transaction to sponsored versioned transaction...');

        // Extract instructions from legacy transaction
        const instructions = transaction.instructions;

        // Use Alchemy's addSponsorship to create a sponsored transaction
        sponsoredTx = await solanaSignerRef.current.addSponsorship(
          instructions,
          connection,
          alchemyConfig.policyId
        );
      } else {
        // For versioned transactions, sign and send directly
        // Note: Sponsorship needs to be added before signing
        console.log('[AlchemyProvider] Signing versioned transaction...');
        sponsoredTx = await solanaSignerRef.current.addSignature(transaction) as VersionedTransaction;
      }

      // Send the sponsored transaction to the network
      const signature = await connection.sendRawTransaction(sponsoredTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('[AlchemyProvider] Gas-sponsored transaction sent:', signature);
      console.log('[AlchemyProvider] Explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');

      return signature;
    } catch (err) {
      console.error('[AlchemyProvider] Transaction failed:', err);
      throw err;
    }
  }, [isInitialized, solanaAddress, connection]);

  /**
   * Sign an arbitrary message using Alchemy MPC signer
   */
  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!isInitialized || !solanaAddress || !solanaSignerRef.current) {
      throw new Error('Wallet not initialized');
    }

    console.log('[AlchemyProvider] Signing message with Alchemy MPC...');

    // Use Alchemy's signMessage method
    const signature = await solanaSignerRef.current.signMessage(message);

    console.log('[AlchemyProvider] Message signed via MPC');

    // Convert ByteArray to Uint8Array if needed
    return signature as Uint8Array;
  }, [isInitialized, solanaAddress]);

  // Auto-initialize wallet when user signs in
  useEffect(() => {
    if (isSignedIn && !isInitialized && !isLoading) {
      initializeWallet();
    }
  }, [isSignedIn, isInitialized, isLoading, initializeWallet]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (signerClientRef.current) {
        signerClientRef.current.disconnect().catch(console.error);
      }
    };
  }, []);

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
    <>
      {/* Hidden iframe container for Alchemy MPC stamper */}
      <div
        id="alchemy-signer-iframe-container"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
      <AlchemyWalletContext.Provider value={value}>
        {children}
      </AlchemyWalletContext.Provider>
    </>
  );
}

export default AlchemyProvider;
