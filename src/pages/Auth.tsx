
import React, { useState, useEffect } from 'react';
import { Database, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WalletOptions } from '@/components/auth/WalletOptions';
import { SignupForm } from '@/components/auth/SignupForm';
import { QRCodeModal } from '@/components/auth/QRCodeModal';
import { FeatureCards } from '@/components/auth/FeatureCards';
import { WalletConnectionStatus } from '@/components/auth/WalletConnectionStatus';
import { useWalletConnection } from '@/hooks/useWalletConnection';

const Auth = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [showQRCode, setShowQRCode] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  
  const { isConnecting, connectedWallet, setConnectedWallet, handleWalletConnect } = useWalletConnection();
  
  const form = useForm({
    defaultValues: {
      email: '',
      fullName: '',
      organization: '',
      walletAddress: '',
      blockchainType: ''
    }
  });

  // Check if we're in development mode
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('lovableproject.com');

  useEffect(() => {
    // Only redirect if we have a real authenticated session (not just a mock user in development)
    if (user && session && !isDevelopment) {
      console.log('User authenticated with real session, redirecting to index dashboard');
      navigate('/index');
    }
  }, [user, session, navigate, isDevelopment]);

  const onWalletConnect = (wallet: any) => {
    handleWalletConnect(wallet, (walletInfo) => {
      form.setValue('walletAddress', walletInfo.address);
      form.setValue('blockchainType', walletInfo.blockchain);
      setShowSignupForm(true);
    });
  };
  
  const onSubmit = async (data: any) => {
    if (!connectedWallet) {
      toast.error('Please connect your wallet first to receive your authentication token.');
      return;
    }

    setIsSubmittingRequest(true);
    
    try {
      console.log('Submitting access request:', data);
      
      const { data: response, error } = await supabase.functions.invoke('send-auth-token', {
        body: {
          email: data.email,
          fullName: data.fullName,
          organization: data.organization || undefined,
          walletAddress: connectedWallet.address,
          blockchainType: connectedWallet.blockchain
        }
      });

      if (error) {
        console.error('Error calling function:', error);
        toast.error('Failed to send request. Please try again.');
        return;
      }

      if (response?.success) {
        toast.success('Authentication token sent! Now connect your wallet again to authenticate using your wallet signature.');
        form.reset();
        setConnectedWallet(null);
        setShowSignupForm(false);
      } else {
        toast.error(response?.error || 'Failed to send authentication token');
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header with Connect Wallet Button */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">BlockDrive</h1>
              <p className="text-xs text-gray-300">Web3 Storage Platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isDevelopment && user && (
              <div className="text-yellow-400 text-sm bg-yellow-400/20 px-3 py-1 rounded-lg">
                Development Mode - Mock User Active
              </div>
            )}
            <WalletOptions
              connectedWallet={connectedWallet}
              isConnecting={isConnecting}
              onWalletConnect={onWalletConnect}
              onShowQRCode={() => setShowQRCode(!showQRCode)}
            />
          </div>
        </div>
      </header>

      {/* QR Code Modal */}
      <QRCodeModal 
        showQRCode={showQRCode}
        onClose={() => setShowQRCode(false)}
      />

      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Authentication Status / Sign Up Form */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-bold text-white mb-4">
                {showSignupForm ? 'Complete Your Signup' : 'Welcome to BlockDrive'}
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Web3 Storage Revolution
                </span>
              </h2>
              <p className="text-gray-300 text-lg">
                {showSignupForm 
                  ? 'Your wallet is connected. Complete your signup to receive your authentication token, then reconnect your wallet to authenticate using your wallet signature.'
                  : 'Connect your Solana wallet to access your decentralized storage dashboard via secure Web3 authentication.'
                }
              </p>
            </div>

            {/* Wallet Connection Status */}
            <WalletConnectionStatus connectedWallet={connectedWallet} />

            {showSignupForm && (
              <SignupForm 
                form={form}
                onSubmit={onSubmit}
                isSubmitting={isSubmittingRequest}
              />
            )}

            {!showSignupForm && (
              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
                <h4 className="font-semibold text-white mb-3">Ready to Access BlockDrive?</h4>
                <p className="text-gray-400 text-sm mb-4">
                  If you already have an authentication token, connect your wallet above and we'll authenticate you using your wallet signature. 
                  If you're new to BlockDrive, connect your wallet and complete the signup process.
                </p>
                <div className="flex items-center space-x-2 text-xs text-blue-400">
                  <Shield className="w-4 h-4" />
                  <span>Secure • Web3 Authentication • Passwordless</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Features */}
          <FeatureCards />
        </div>
      </div>
    </div>
  );
};

export default Auth;
