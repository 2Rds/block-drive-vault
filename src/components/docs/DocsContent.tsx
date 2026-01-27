import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink, FileText, Users, Shield, Zap, Settings, Code, Globe, Copy, Check, Wallet, BarChart3, Lock, Building2, Database, RefreshCcw, FileKey } from 'lucide-react';
import { useState } from 'react';

interface DocsContentProps {
  activeSection: string;
}

export const DocsContent = ({ activeSection }: DocsContentProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ children, id, language = 'typescript' }: { children: string; id: string; language?: string }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code className="text-foreground">{children}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8 p-0"
        onClick={() => copyToClipboard(children, id)}
      >
        {copiedCode === id ? (
          <Check className="w-3 h-3" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </Button>
    </div>
  );

  if (activeSection === 'overview' || !activeSection) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
            <FileText className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            👋 Welcome to BlockDrive!
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            BlockDrive is the leading Web3 data management platform, providing users with secure 
            decentralized storage, multi-chain wallet authentication, and enterprise-grade features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Getting Started</CardTitle>
                  <CardDescription>Quick setup and first steps</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Get up and running with BlockDrive in minutes. Connect your wallet, upload files, and explore the platform.
              </p>
              <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                Start Guide <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Authentication</CardTitle>
                  <CardDescription>Secure wallet connections</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Learn how to integrate wallet authentication with support for 50+ blockchains and wallet providers.
              </p>
              <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                View Docs <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">IPFS Storage</CardTitle>
                  <CardDescription>Decentralized file management</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Store files on IPFS with automatic pinning, global CDN access, and enterprise-grade reliability.
              </p>
              <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                Learn More <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Code className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Developer APIs</CardTitle>
                  <CardDescription>Build with our platform</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Integrate BlockDrive into your applications with our comprehensive APIs and SDKs.
              </p>
              <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                API Docs <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Have a question?
                </h3>
                <p className="text-muted-foreground">
                  Join our community or contact support for help with your BlockDrive implementation.
                </p>
              </div>
              <Button>
                Get Support <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'quick-start') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Quick Start Guide</h1>
          <p className="text-lg text-muted-foreground">
            Get started with BlockDrive in just a few steps. This guide will help you set up your account, 
            connect your wallet, and upload your first file.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <CardTitle>Connect Your Wallet</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Start by connecting your preferred wallet. We support 50+ wallets across multiple blockchains.
              </p>
              <CodeBlock id="connect-wallet">
{`// Connect wallet using Clerk + Crossmint
import { SignInButton } from '@clerk/clerk-react';

<SignInButton mode="modal">
  Connect Wallet
</SignInButton>`}
              </CodeBlock>
              <div className="flex gap-2">
                <Badge variant="secondary">Ethereum</Badge>
                <Badge variant="secondary">Solana</Badge>
                <Badge variant="secondary">Polygon</Badge>
                <Badge variant="secondary">+47 more</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <CardTitle>Upload Your First File</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Once authenticated, you can upload files directly to IPFS with automatic pinning and CDN access.
              </p>
              <CodeBlock id="upload-file">
{`// Upload file to IPFS
import { IPFSService } from '@/services/ipfsService';

const uploadFile = async (file: File) => {
  const result = await IPFSService.uploadFile(file);
  console.log('File uploaded:', result.cid);
  return result;
};`}
              </CodeBlock>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <CardTitle>Manage and Share</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Organize your files in folders, invite team members, and share files securely.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">📁 File Organization</h4>
                  <p className="text-sm text-muted-foreground">Create folders and organize your files</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">👥 Team Collaboration</h4>
                  <p className="text-sm text-muted-foreground">Invite members and manage permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeSection === 'core-features') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Core Features</h1>
          <p className="text-xl text-muted-foreground">
            Discover the powerful features that make BlockDrive the leading Web3 data management platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                IPFS Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Decentralized file storage with enterprise-grade reliability and global accessibility.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Secure upload to IPFS via Pinata
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Organize files in folders with metadata
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Files pinned for guaranteed availability
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Global CDN for fast access worldwide
                </li>
              </ul>
              <div className="bg-muted/50 p-3 rounded-lg">
                <code className="text-sm">
                  const result = await IPFSService.uploadFile(file);
                </code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Multi-Chain Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Connect with 50+ blockchain networks and wallet providers seamlessly.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Ethereum, Solana, and 50+ other chains
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Phantom, MetaMask, WalletConnect support
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Secure authentication without private keys
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Cross-chain compatibility
                </li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  💡 Supported: Ethereum • Solana • Polygon • BSC • Avalanche
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Enterprise Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Bank-grade security with blockchain-powered authentication and encryption.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  End-to-end encryption for all files
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Blockchain authentication proofs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Comprehensive audit trails
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Role-based access controls
                </li>
              </ul>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                  🔒 SOC 2 Compliant • 99.9% Uptime SLA
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Real-Time Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Monitor your storage usage, team activity, and platform performance in real-time.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Storage metrics and quota tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Network status monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Activity logs and audit trails
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Performance insights dashboard
                </li>
              </ul>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                  📊 Real-time metrics • Sub-100ms response times
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Storage Quotas by Plan</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Starter</CardTitle>
                <p className="text-sm text-muted-foreground">$9/month</p>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">50 GB</p>
                <p className="text-xs text-muted-foreground">Storage + Bandwidth</p>
              </CardContent>
            </Card>
            
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pro</CardTitle>
                <p className="text-sm text-muted-foreground">$29/month</p>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">150 GB</p>
                <p className="text-xs text-muted-foreground">Storage + Bandwidth</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Growth</CardTitle>
                <p className="text-sm text-muted-foreground">$59/month</p>
                <Badge variant="secondary" className="w-fit">Most Popular</Badge>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">300 GB</p>
                <p className="text-xs text-muted-foreground">Storage + Bandwidth</p>
              </CardContent>
            </Card>
            
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Scale</CardTitle>
                <p className="text-sm text-muted-foreground">$99/month/seat</p>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">500 GB</p>
                <p className="text-xs text-muted-foreground">Per seat</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'wallet-auth') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Wallet Authentication</h1>
          <p className="text-lg text-muted-foreground">
            Connect securely with 50+ blockchain wallets across multiple networks.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Supported Wallets & Networks</CardTitle>
            <CardDescription>
              BlockDrive supports a wide range of wallets and blockchain networks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">🦊 Popular Wallets</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>MetaMask</li>
                  <li>Phantom</li>
                  <li>Solflare</li>
                  <li>WalletConnect</li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">⛓️ Supported Networks</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Ethereum</li>
                  <li>Solana</li>
                  <li>Polygon</li>
                  <li>+47 more chains</li>
                </ul>
              </div>
            </div>
            <CodeBlock id="wallet-connect">
{`// Connect wallet using Clerk + Crossmint
import { SignInButton } from '@clerk/clerk-react';

<SignInButton mode="modal">
  Connect Wallet
</SignInButton>`}
            </CodeBlock>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'clerk-crossmint-integration') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Clerk + Crossmint Integration</h1>
          <p className="text-lg text-muted-foreground">
            Enterprise-grade authentication and embedded wallet infrastructure powering BlockDrive.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Key Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock id="clerk-crossmint-components">
{`// Core authentication setup in BlockDrive
import { ClerkProvider, SignInButton, useUser } from '@clerk/clerk-react';
import { CrossmintProvider, useCrossmintWallet } from '@crossmint/client-sdk-react-ui';

// Provider hierarchy in main.tsx
<ClerkProvider publishableKey={CLERK_KEY}>
  <CrossmintProvider apiKey={CROSSMINT_KEY}>
    <App />
  </CrossmintProvider>
</ClerkProvider>

// Using the auth hook
const { user, isSignedIn, wallet } = useAuth();`}
            </CodeBlock>

            <div className="grid gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">🔐 ClerkProvider</h4>
                <p className="text-sm text-muted-foreground">User authentication, session management, and social login support</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">💼 CrossmintProvider</h4>
                <p className="text-sm text-muted-foreground">MPC-based embedded wallets with automatic creation on signup</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">🎯 useAuth Hook</h4>
                <p className="text-sm text-muted-foreground">Unified hook providing user info, session state, and wallet access</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Multichain Wallet Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Crossmint provides MPC-based embedded wallets supporting multiple chains out of the box.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <h4 className="font-medium mb-2">Solana</h4>
                <p className="text-sm text-muted-foreground">Native Solana support with devnet and mainnet</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h4 className="font-medium mb-2">EVM Chains</h4>
                <p className="text-sm text-muted-foreground">Ethereum, Base, Polygon, Arbitrum, Optimism</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'auth-flow') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Authentication Flow</h1>
          <p className="text-lg text-muted-foreground">
            Step-by-step process of how wallet authentication works in BlockDrive.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Process</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { step: 1, title: "User Initiation", desc: "User clicks 'Connect Wallet' button" },
              { step: 2, title: "Wallet Selection", desc: "Choose from 50+ supported wallets" },
              { step: 3, title: "Connection", desc: "Clerk + Crossmint handle wallet authentication" },
              { step: 4, title: "Verification", desc: "Cryptographic signature verification" },
              { step: 5, title: "Session Creation", desc: "Generate secure session tokens" },
              { step: 6, title: "Redirection", desc: "Automatic redirect to dashboard" }
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'ipfs-integration') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">IPFS Integration</h1>
          <p className="text-lg text-muted-foreground">
            Decentralized storage powered by IPFS with enterprise-grade reliability.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>IPFS Architecture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">📡 Pinata Provider</h4>
                <p className="text-sm text-muted-foreground">Primary IPFS gateway for reliable storage</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">🌍 Global CDN</h4>
                <p className="text-sm text-muted-foreground">Fast access through worldwide gateway network</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">📌 Auto Pinning</h4>
                <p className="text-sm text-muted-foreground">Automatic pinning for permanent storage</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">🔒 Redundant Storage</h4>
                <p className="text-sm text-muted-foreground">Multiple nodes ensure data availability</p>
              </div>
            </div>
            
            <CodeBlock id="ipfs-upload">
{`// Upload file to IPFS
import { IPFSService } from '@/services/ipfsService';

const uploadFile = async (file: File) => {
  const result = await IPFSService.uploadFile(file);
  console.log('File uploaded:', result.cid);
  return result; // Returns CID and metadata
};

// Retrieve file from IPFS
const downloadFile = async (cid: string) => {
  const blob = await IPFSService.retrieveFile(cid);
  return blob;
};`}
            </CodeBlock>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'file-management') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">File Management</h1>
          <p className="text-lg text-muted-foreground">
            Organize, search, and manage your files with enterprise-grade tools.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">📁 Folder Organization</h4>
                  <p className="text-sm text-muted-foreground">Hierarchical folder structure for organization</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">🏷️ File Metadata</h4>
                  <p className="text-sm text-muted-foreground">Size, type, upload date, blockchain info</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">🔍 Search & Filter</h4>
                  <p className="text-sm text-muted-foreground">Find files by name, type, or date</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">📦 Batch Operations</h4>
                  <p className="text-sm text-muted-foreground">Upload and manage multiple files</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock id="file-ops">
{`// Create folder
const createFolder = async (folderName: string) => {
  const folder = await folderService.create(folderName);
  return folder;
};

// Search files
const searchFiles = async (query: string) => {
  const results = await fileService.search(query);
  return results;
};

// Generate sharing link
const shareFile = async (fileId: string) => {
  const link = await fileService.generateShareLink(fileId);
  return link;
};`}
              </CodeBlock>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeSection === 'storage-quotas') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Storage Quotas</h1>
          <p className="text-lg text-muted-foreground">
            Storage and bandwidth limits based on your subscription plan.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storage by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {[
                { plan: "Starter", storage: "50 GB", bandwidth: "50 GB", price: "$9/month" },
                { plan: "Pro", storage: "150 GB", bandwidth: "150 GB", price: "$29/month" },
                { plan: "Growth", storage: "300 GB", bandwidth: "300 GB", price: "$59/month" },
                { plan: "Scale", storage: "500 GB/seat", bandwidth: "500 GB/seat", price: "$99/month/seat" }
              ].map((tier) => (
                <div key={tier.plan} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{tier.plan}</h4>
                      <p className="text-sm text-muted-foreground">{tier.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Storage: {tier.storage}</p>
                      <p className="text-sm">Bandwidth: {tier.bandwidth}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'team-management') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Team Management</h1>
          <p className="text-lg text-muted-foreground">
            Create teams, invite members, and manage collaborative workspaces.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">👥 Multiple Teams</h4>
                  <p className="text-sm text-muted-foreground">Create and manage multiple teams</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">🛡️ Role-Based Access</h4>
                  <p className="text-sm text-muted-foreground">Owner and Member roles with different permissions</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">📧 Email Invitations</h4>
                  <p className="text-sm text-muted-foreground">Invite members via secure email links</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">📁 Shared Storage</h4>
                  <p className="text-sm text-muted-foreground">Team-specific file storage and sharing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock id="team-ops">
{`// Team file upload
const teamUpload = async (file: File, teamId: string) => {
  const result = await uploadToTeamStorage(file, teamId);
  return result;
};

// Invite team member
const inviteMember = async (email: string, teamId: string, role: string) => {
  const invitation = await sendTeamInvitation(email, teamId, role);
  return invitation;
};`}
              </CodeBlock>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Growth Plan</h4>
                  <p className="text-sm text-muted-foreground">1 team, up to 3 members total</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Scale Plan</h4>
                  <p className="text-sm text-muted-foreground">Unlimited teams and members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeSection === 'slack') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Slack Integration</h1>
          <p className="text-lg text-muted-foreground">
            Share files directly to Slack channels with notifications and commands.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Slack Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">📤 File Sharing</h4>
                <p className="text-sm text-muted-foreground">Share files to Slack channels</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">🔔 Notifications</h4>
                <p className="text-sm text-muted-foreground">Real-time upload notifications</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">⌨️ Commands</h4>
                <p className="text-sm text-muted-foreground">Slash command interactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'pricing-tiers') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Pricing Tiers</h1>
          <p className="text-lg text-muted-foreground">
            Flexible pricing plans to match your storage and collaboration needs.
          </p>
        </div>

        <div className="grid gap-6">
          {[
            {
              name: "Starter",
              price: "$9/month",
              storage: "50 GB storage & bandwidth",
              users: "1 user",
              features: ["Basic blockchain features", "7-day free trial"],
              popular: false
            },
            {
              name: "Pro", 
              price: "$29/month",
              storage: "150 GB storage & bandwidth",
              users: "Enhanced features",
              features: ["Priority support", "Advanced sharing"],
              popular: false
            },
            {
              name: "Growth",
              price: "$59/month",
              storage: "300 GB storage & bandwidth", 
              users: "Up to 3 team members",
              features: ["Team collaboration tools", "Advanced analytics"],
              popular: true
            },
            {
              name: "Scale",
              price: "$99/month/seat",
              storage: "500 GB per seat",
              users: "Unlimited team members",
              features: ["Custom solutions", "24/7 support"],
              popular: false
            }
          ].map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {plan.popular && <Badge>Most Popular</Badge>}
                    </CardTitle>
                    <CardDescription>{plan.price}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{plan.storage}</p>
                  <p className="text-muted-foreground">{plan.users}</p>
                  <ul className="text-sm space-y-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="text-muted-foreground">• {feature}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeSection === 'edge-functions') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Edge Functions</h1>
          <p className="text-lg text-muted-foreground">
            Serverless functions powering BlockDrive's backend operations.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Core Functions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {[
                { name: "upload-to-ipfs", desc: "Handle file uploads to IPFS with metadata storage" },
                { name: "check-subscription", desc: "Verify user subscription status and quotas" },
                { name: "secure-wallet-auth", desc: "Authenticate wallet connections securely" },
                { name: "create-checkout", desc: "Process Stripe payments and subscriptions" },
                { name: "send-team-invitation", desc: "Handle team member invitation emails" }
              ].map((func) => (
                <div key={func.name} className="p-4 border rounded-lg">
                  <h4 className="font-medium font-mono text-sm">{func.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{func.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'programmed-incompleteness') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Programmed Incompleteness</h1>
          <p className="text-lg text-muted-foreground">
            BlockDrive's proprietary privacy-first architecture that makes data theft mathematically impossible.
          </p>
        </div>

        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-2">Core Innovation</h3>
            <p className="text-muted-foreground">
              Encrypted files are split into two components that are stored separately. Neither component alone 
              can reconstruct the original file, making theft of either component useless.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Critical 16 Bytes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The first 16 bytes of every encrypted file are extracted and stored separately:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Embedded in Zero-Knowledge Proofs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Stored on secure S3 infrastructure
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Commitment stored on Solana blockchain
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Encrypted Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The remaining encrypted file content is stored on decentralized providers:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Uploaded to Filebase (IPFS)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Redundantly stored on S3 and Arweave
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Without critical bytes, content is garbage
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <CodeBlock id="pi-flow">
{`// Programmed Incompleteness flow
const uploadWithPI = async (file: File) => {
  // 1. Encrypt file with wallet-derived key
  const encrypted = await aesEncrypt(file, walletKey);
  
  // 2. Extract critical 16 bytes
  const criticalBytes = encrypted.slice(0, 16);
  const remainingContent = encrypted.slice(16);
  
  // 3. Generate ZK proof of critical bytes knowledge
  const { proof, commitment } = await generateZkProof(criticalBytes);
  
  // 4. Store separately
  await storeCriticalBytes(criticalBytes, commitment);  // S3
  await storeContent(remainingContent);                   // IPFS
  await registerOnChain(commitment, proof);               // Solana
};`}
        </CodeBlock>
      </div>
    );
  }

  if (activeSection === 'aes-encryption') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">AES-256 Encryption</h1>
          <p className="text-lg text-muted-foreground">
            Military-grade encryption with three security levels derived from wallet signatures.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Standard</CardTitle>
              <Badge variant="secondary">General Files</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Basic wallet-derived encryption key. Suitable for general documents.</p>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-500/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sensitive</CardTitle>
              <Badge className="bg-yellow-500/20 text-yellow-600">Business Docs</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Enhanced HKDF key derivation with additional iterations.</p>
            </CardContent>
          </Card>
          
          <Card className="border-red-500/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Maximum</CardTitle>
              <Badge className="bg-red-500/20 text-red-600">Critical Data</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Strongest key derivation with maximum security parameters.</p>
            </CardContent>
          </Card>
        </div>

        <CodeBlock id="aes-encrypt">
{`// AES-256-GCM encryption with wallet-derived keys
import { blockDriveCryptoService } from '@/services/crypto';

// Initialize from 3-message wallet signature
await blockDriveCryptoService.initializeKeys(wallet, 'maximum');

// Encrypt file
const { encrypted, iv, authTag } = await blockDriveCryptoService.encryptFile(file);

// Keys never touch application servers - derived client-side only`}
        </CodeBlock>
      </div>
    );
  }

  if (activeSection === 'zk-proofs') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Zero-Knowledge Proofs</h1>
          <p className="text-lg text-muted-foreground">
            Groth16 ZK proofs via snarkjs/circom prove critical bytes knowledge without revealing them.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Circuit Architecture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm">
              <p className="text-muted-foreground">// criticalBytesCommitment.circom</p>
              <p>template CriticalBytesCommitment() {"{"}</p>
              <p className="ml-4">signal input criticalBytes[16];</p>
              <p className="ml-4">signal input salt[4];</p>
              <p className="ml-4">signal output commitment;</p>
              <p className="ml-4">// Poseidon hash for commitment</p>
              <p>{"}"}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-medium">Proof Size</p>
                <p className="text-2xl font-bold text-primary">~200 bytes</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-medium">Verification</p>
                <p className="text-2xl font-bold text-primary">&lt; 10ms</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-medium">Security</p>
                <p className="text-2xl font-bold text-primary">128-bit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <CodeBlock id="zk-generate">
{`// Generate Groth16 proof
import { snarkjsService } from '@/services/crypto';

const { proof, publicSignals } = await snarkjsService.generateProof(
  criticalBytes,
  salt,
  circuitWasm,
  provingKey
);

// Verify proof
const isValid = await snarkjsService.verifyProof(
  proof,
  publicSignals,
  verificationKey
);`}
        </CodeBlock>
      </div>
    );
  }

  if (activeSection === 'instant-revoke') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Instant Revoke</h1>
          <p className="text-lg text-muted-foreground">
            Unique to BlockDrive: share files while retaining the ability to permanently revoke access.
          </p>
        </div>

        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <RefreshCcw className="w-8 h-8 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">How It Works</h3>
                <p className="text-muted-foreground">
                  When you share a file, the recipient receives encrypted critical bytes via ECDH key exchange.
                  To revoke access, you simply delete the critical bytes commitment on-chain. The file becomes
                  permanently unreadable - even if the recipient saved a copy of the encrypted content.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Traditional Cloud Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Once shared, control is lost
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Recipients can copy and save files
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Revocation only removes access, not copies
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">BlockDrive Instant Revoke</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Sender retains cryptographic control
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Copies become permanently unreadable
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Mathematically enforced revocation
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeSection === 'mca-auth') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Multichain Authentication (MCA)</h1>
          <p className="text-lg text-muted-foreground">
            Dual-chain verification requiring ownership of both Solana and Base domain names.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>MCA Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <h4 className="font-medium mb-2">Solana Domain</h4>
                <p className="font-mono text-sm text-purple-400">label.blockdrive.sol</p>
                <p className="text-xs text-muted-foreground mt-2">SNS subdomain verification</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h4 className="font-medium mb-2">Base Domain</h4>
                <p className="font-mono text-sm text-blue-400">label.blockdrive.base</p>
                <p className="text-xs text-muted-foreground mt-2">Basenames subdomain verification</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: 1, title: "POST /mca/start", desc: "Returns canonical challenge with nonce" },
              { step: 2, title: "Sign Challenge", desc: "User signs with both Solana and EVM wallets" },
              { step: 3, title: "POST /mca/verify", desc: "Validates signatures and domain ownership" },
              { step: 4, title: "JWT Issued", desc: "Short-lived JWT (TTL ≤ 15 min) returned" },
              { step: 5, title: "GET /mca/check", desc: "Validates JWT for subsequent API calls" }
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-medium font-mono text-sm">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'otoco') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">OtoCo Integration</h1>
          <p className="text-lg text-muted-foreground">
            Instantly spin up an onchain LLC or Delaware C-Corp without leaving BlockDrive.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              Onchain Company Formation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium">Instant Setup</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium">Legal Protection</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Database className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium">Onchain Registry</p>
              </div>
            </div>
            <p className="text-muted-foreground">
              OtoCo's embedded widget allows you to form a legal business entity directly within BlockDrive.
              Your company is registered on-chain, providing transparent and immutable corporate records.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'solana-architecture') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Solana Program Architecture</h1>
          <p className="text-lg text-muted-foreground">
            Anchor-based Solana program for on-chain file registry and access control.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Core Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {[
                { name: "initialize_vault", desc: "Create user vault PDA with master key commitment" },
                { name: "register_file", desc: "Register encrypted file with metadata and ZK commitment" },
                { name: "create_delegation", desc: "Share file with recipient via ECDH-encrypted key" },
                { name: "revoke_delegation", desc: "Instantly revoke access by deleting delegation" }
              ].map((inst) => (
                <div key={inst.name} className="p-4 border rounded-lg">
                  <h4 className="font-medium font-mono text-sm text-primary">{inst.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{inst.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <CodeBlock id="solana-pdas">
{`// PDA Structures
pub struct UserVault {
    pub owner: Pubkey,
    pub master_key_commitment: [u8; 32],
    pub file_count: u64,
    pub created_at: i64,
}

pub struct FileRecord {
    pub owner: Pubkey,
    pub file_id: [u8; 32],
    pub encrypted_metadata_cid: String,
    pub critical_bytes_commitment: [u8; 32],
    pub security_level: u8,
}

pub struct Delegation {
    pub grantor: Pubkey,
    pub grantee: Pubkey,
    pub file_record: Pubkey,
    pub encrypted_file_key: [u8; 48],
    pub permissions: u8,
}`}
        </CodeBlock>
      </div>
    );
  }

  if (activeSection === 'multi-provider') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Multi-Provider Storage</h1>
          <p className="text-lg text-muted-foreground">
            Automatic failover across Filebase, S3, and Arweave for maximum reliability.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filebase (Primary)</CardTitle>
              <Badge variant="secondary">IPFS</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">S3-compatible IPFS API with global CDN and automatic pinning.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Amazon S3</CardTitle>
              <Badge variant="secondary">Backup</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Critical bytes storage and redundant content backup.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Arweave</CardTitle>
              <Badge variant="secondary">Permanent</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Permanent archival storage with one-time payment model.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storage Orchestrator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Automatic health checks and failover
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Configurable redundancy per file
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Provider rotation when health checks fail
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Chunking for large files
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default content for other sections
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-4 capitalize">
          {activeSection.replace(/-/g, ' ')}
        </h1>
        <p className="text-lg text-muted-foreground">
          Documentation for {activeSection.replace(/-/g, ' ')} functionality.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Content Coming Soon</h3>
          <p className="text-muted-foreground">
            This section is currently being developed. Check back soon for detailed documentation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};