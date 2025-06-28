
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { UnifiedAuthFlow } from '@/components/auth/UnifiedAuthFlow';

const Auth = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (user && session) {
      console.log('User authenticated, redirecting to dashboard');
      navigate('/index');
    }
  }, [user, session, navigate]);

  const handleAuthenticationSuccess = (authData: any) => {
    console.log('Authentication successful:', authData);
    // Navigation will be handled by the auth context
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <img 
                src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" 
                alt="BlockDrive Logo" 
                className="w-10 h-10 object-contain" 
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">BlockDrive</h1>
              <p className="text-xs text-slate-400">Web3 Storage Platform</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-120px)]">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">
              Welcome to 
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent ml-3">
                BlockDrive
              </span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Experience secure Web3 authentication with support for both Solana and EVM ecosystems. 
              Connect your wallet for maximum security and decentralized storage access.
            </p>
          </div>

          <UnifiedAuthFlow onAuthenticationSuccess={handleAuthenticationSuccess} />

          {/* Bottom Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-400/20 flex items-center justify-center border border-purple-500/30">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Secure by Design</h3>
              <p className="text-slate-400 text-sm">Built with smart contract security and cryptographic verification</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-blue-400/20 flex items-center justify-center border border-blue-500/30">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
              <p className="text-slate-400 text-sm">Instant uploads and downloads with IPFS integration</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r from-emerald-600/20 to-emerald-400/20 flex items-center justify-center border border-emerald-500/30">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Decentralized</h3>
              <p className="text-slate-400 text-sm">True ownership with decentralized storage and blockchain verification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
