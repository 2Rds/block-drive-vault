import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Wallet, Shield, Database, Sparkles, QrCode, ExternalLink, User, Mail, UserPlus } from 'lucide-react';
import { WalletConnector } from '@/components/WalletConnector';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  blockchain: 'solana' | 'ethereum' | 'ton';
}

const Auth = () => {
  const {
    user,
    connectWallet
  } = useAuth();
  const navigate = useNavigate();
  const [showQRCode, setShowQRCode] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<{address: string, blockchain: string} | null>(null);
  const [showSignupForm, setShowSignupForm] = useState(false);
  
  const form = useForm({
    defaultValues: {
      email: '',
      fullName: '',
      organization: '',
      walletAddress: '',
      blockchainType: ''
    }
  });

  useEffect(() => {
    if (user) {
      console.log('User authenticated, redirecting to index dashboard');
      navigate('/index');
    }
  }, [user, navigate]);
  
  const walletOptions: WalletOption[] = [{
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    blockchain: 'solana'
  }, {
    id: 'solflare',
    name: 'Solflare',
    icon: '🔥',
    blockchain: 'solana'
  }, {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    blockchain: 'ethereum'
  }, {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    blockchain: 'ethereum'
  }, {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🛡️',
    blockchain: 'ethereum'
  }, {
    id: 'exodus',
    name: 'Exodus',
    icon: '🚀',
    blockchain: 'ethereum'
  }, {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '⭕',
    blockchain: 'ethereum'
  }, {
    id: 'ledger',
    name: 'Ledger',
    icon: '🔒',
    blockchain: 'ethereum'
  }];
  
  const detectWallet = (walletId: string) => {
    switch (walletId) {
      case 'phantom':
        return (window as any).phantom?.solana;
      case 'solflare':
        return (window as any).solflare;
      case 'metamask':
        return (window as any).ethereum?.isMetaMask;
      case 'coinbase':
        return (window as any).ethereum?.isCoinbaseWallet;
      case 'trust':
        return (window as any).ethereum?.isTrust;
      case 'exodus':
        return (window as any).ethereum?.isExodus;
      case 'okx':
        return (window as any).okxwallet;
      case 'ledger':
        return (window as any).ethereum?.isLedgerConnect;
      default:
        return false;
    }
  };
  
  const connectToWallet = async (walletId: string, blockchain: 'solana' | 'ethereum' | 'ton') => {
    try {
      let walletAddress = '';
      let signature = 'demo_signature';
      switch (walletId) {
        case 'phantom':
          if ((window as any).phantom?.solana) {
            const response = await (window as any).phantom.solana.connect();
            walletAddress = response.publicKey.toString();
          } else {
            throw new Error('Phantom wallet not found');
          }
          break;
        case 'solflare':
          if ((window as any).solflare) {
            await (window as any).solflare.connect();
            walletAddress = (window as any).solflare.publicKey?.toString() || '';
          } else {
            throw new Error('Solflare wallet not found');
          }
          break;
        case 'metamask':
        case 'coinbase':
        case 'trust':
        case 'exodus':
        case 'okx':
        case 'ledger':
          if ((window as any).ethereum) {
            const accounts = await (window as any).ethereum.request({
              method: 'eth_requestAccounts'
            });
            walletAddress = accounts[0];
          } else {
            throw new Error(`${walletId} wallet not found`);
          }
          break;
        default:
          throw new Error('Unsupported wallet');
      }
      if (!walletAddress) {
        throw new Error('Failed to get wallet address');
      }
      return {
        walletAddress,
        signature
      };
    } catch (error: any) {
      throw new Error(error.message || `Failed to connect to ${walletId}`);
    }
  };
  
  const handleWalletConnect = async (wallet: WalletOption) => {
    const walletDetected = detectWallet(wallet.id);
    if (!walletDetected && wallet.id !== 'ledger') {
      toast.error(`${wallet.name} wallet not detected. Please install it first.`);
      return;
    }
    setIsConnecting(wallet.id);
    try {
      const {
        walletAddress,
        signature
      } = await connectToWallet(wallet.id, wallet.blockchain);
      
      console.log('Wallet connected, attempting authentication...');
      
      // Try to authenticate with the connected wallet
      const { error } = await connectWallet(walletAddress, signature, wallet.blockchain);
      
      if (error) {
        console.log('Authentication failed, showing signup form');
        // If authentication fails, show the signup form with wallet info
        setConnectedWallet({ address: walletAddress, blockchain: wallet.blockchain });
        form.setValue('walletAddress', walletAddress);
        form.setValue('blockchainType', wallet.blockchain);
        setShowSignupForm(true);
        toast.info(`${wallet.name} connected! Please complete signup to receive your authentication token.`);
      } else {
        console.log('Magic link sent, user should check email');
        // Magic link sent - user will complete authentication via email
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to connect ${wallet.name}`);
    }
    setIsConnecting(null);
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
        toast.success('Authentication token sent! Now connect your wallet again to receive a magic link for access.');
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0">
                  <Wallet className="w-4 h-4 mr-2" />
                  {connectedWallet ? 'Reconnect Wallet' : 'Connect Wallet'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 bg-gray-800 border border-gray-600 shadow-xl rounded-xl z-50" align="end">
                <DropdownMenuLabel className="text-white text-center py-3">
                  Choose Your Wallet
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-600" />
                
                {walletOptions.map(wallet => {
                  const isDetected = detectWallet(wallet.id) || wallet.id === 'ledger';
                  const isConnectingWallet = isConnecting === wallet.id;
                  return (
                    <DropdownMenuItem 
                      key={wallet.id} 
                      className="text-gray-300 hover:bg-gray-700 cursor-pointer p-3 m-1 rounded-lg" 
                      onClick={() => handleWalletConnect(wallet)} 
                      disabled={isConnectingWallet}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{wallet.icon}</span>
                          <div>
                            <p className="font-medium text-white">{wallet.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{wallet.blockchain}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isDetected && wallet.id !== 'ledger' && (
                            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                              Not Installed
                            </span>
                          )}
                          {isDetected && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                              {wallet.id === 'ledger' ? 'Hardware' : 'Detected'}
                            </span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
                
                <DropdownMenuSeparator className="bg-gray-600" />
                <DropdownMenuItem 
                  className="text-gray-300 hover:bg-gray-700 cursor-pointer p-3 m-1 rounded-lg" 
                  onClick={() => setShowQRCode(!showQRCode)}
                >
                  <QrCode className="w-4 h-4 mr-3" />
                  <span>Scan QR Code</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-700 max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-white">Scan with Your Wallet</CardTitle>
              <CardDescription className="text-gray-300">
                Open your wallet app and scan this QR code to connect
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center">
                <QrCode className="w-32 h-32 text-gray-800" />
              </div>
              <p className="text-gray-400 text-sm text-center">
                Supported by most mobile wallet apps including Trust Wallet, MetaMask Mobile, and Phantom Mobile
              </p>
              <Button 
                variant="outline" 
                onClick={() => setShowQRCode(false)} 
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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
                  ? 'Your wallet is connected. Complete your signup to receive your authentication token, then reconnect your wallet to get a magic link.'
                  : 'Connect your wallet to access your decentralized storage dashboard via magic link authentication.'
                }
              </p>
            </div>

            {/* Wallet Connection Status */}
            {connectedWallet && (
              <Card className="bg-green-900/20 border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-green-400 font-medium">Wallet Connected</p>
                      <p className="text-green-300 text-sm">
                        {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)} ({connectedWallet.blockchain})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {showSignupForm && (
              <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Request Authentication Token
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Complete your details to receive your authentication token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField 
                        control={form.control} 
                        name="fullName" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your full name" 
                                className="bg-gray-800 border-gray-700 text-white" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                      
                      <FormField 
                        control={form.control} 
                        name="email" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Enter your email" 
                                className="bg-gray-800 border-gray-700 text-white" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />

                      <FormField 
                        control={form.control} 
                        name="organization" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Organization (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Company or organization" 
                                className="bg-gray-800 border-gray-700 text-white" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />

                      <Button 
                        type="submit" 
                        disabled={isSubmittingRequest}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0"
                      >
                        {isSubmittingRequest ? 'Sending...' : 'Get Authentication Token'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {!showSignupForm && (
              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
                <h4 className="font-semibold text-white mb-3">Ready to Access BlockDrive?</h4>
                <p className="text-gray-400 text-sm mb-4">
                  If you already have an authentication token, connect your wallet above and we'll send you a magic link. 
                  If you're new to BlockDrive, connect your wallet and complete the signup process.
                </p>
                <div className="flex items-center space-x-2 text-xs text-blue-400">
                  <Shield className="w-4 h-4" />
                  <span>Secure • Magic Link • Passwordless</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Features */}
          <div className="space-y-6">
            <Card className="bg-gray-900/40 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-600/20 rounded-lg">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Magic Link Authentication</h3>
                    <p className="text-gray-300 text-sm">
                      Secure, passwordless login via email magic links. No need to remember passwords or manage keys.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/40 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-purple-600/20 rounded-lg">
                    <Database className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Decentralized Storage</h3>
                    <p className="text-gray-300 text-sm">
                      Store your files securely on the blockchain with guaranteed availability and censorship resistance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/40 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-green-600/20 rounded-lg">
                    <Sparkles className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Multi-Wallet Support</h3>
                    <p className="text-gray-300 text-sm">
                      Connect with Phantom, MetaMask, Trust Wallet, Ledger, and more. Works across Solana, Ethereum, and TON networks.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-2 text-sm">Already have an authentication token?</h4>
              <p className="text-gray-400 text-xs mb-3">
                Connect your wallet above and we'll send you a magic link to your registered email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
