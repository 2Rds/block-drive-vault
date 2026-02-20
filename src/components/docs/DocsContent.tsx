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
                Learn how to integrate wallet authentication with support for multiple blockchains via Dynamic embedded wallets.
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
                Sign in with Dynamic (email, social login, or wallet). An embedded wallet is automatically created for you.
              </p>
              <CodeBlock id="connect-wallet">
{`// Connect wallet using Dynamic
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

<DynamicWidget>
  Connect Wallet
</DynamicWidget>`}
              </CodeBlock>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">Solana</Badge>
                <Badge variant="secondary">Ethereum</Badge>
                <Badge variant="secondary">Base</Badge>
                <Badge variant="secondary">Polygon</Badge>
                <Badge variant="secondary">Arbitrum</Badge>
                <Badge variant="secondary">Optimism</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <CardTitle>Derive Your Encryption Keys</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Before uploading, your wallet signs a message to derive encryption keys
                via HKDF — keys are generated client-side and never leave your device. The signing happens
                automatically when your Dynamic session is active.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Session keys expire after 4 hours or when you close the tab. Logging out clears all cached keys.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <CardTitle>Upload Your First File</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Click the Upload button in the Files page header or drag files directly onto the page.
                Files are encrypted client-side with AES-256-GCM before upload to IPFS. A ZK proof of the
                critical bytes is generated and registered on Solana.
              </p>
              <CodeBlock id="upload-file">
{`// Files page: compact upload button + page-level drag-and-drop
// 1. Click "Upload" in header → file picker opens
// 2. Or drag files from your OS onto the page → blue overlay appears
// 3. Files are encrypted at Maximum security level
// 4. Uploaded to IPFS via Filebase with ZK proof
// 5. FileRecord registered on Solana blockchain`}
              </CodeBlock>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <CardTitle>Organize and Share</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Create folders, drag files into them, move files between folders via the context menu,
                and share encrypted files with teammates or external recipients.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Folder Management</h4>
                  <p className="text-sm text-muted-foreground">Create folders, drag-and-drop files into them, or use "Move to Folder" from the file menu</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Team Collaboration</h4>
                  <p className="text-sm text-muted-foreground">Share files with on-chain delegation, send to teammates, or move to team folders</p>
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
                  Secure upload to IPFS via Filebase
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
                Solana Blockchain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Solana-native architecture with SNS domains, soulbound cNFTs, and embedded wallets via Dynamic.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  SNS subdomain identity (label.blockdrive.sol)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Embedded wallets via Dynamic
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Soulbound cNFTs for access credentials
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Treasury-signed transactions (gas-free for users)
                </li>
              </ul>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                  Powered by Solana • Bubblegum V2 cNFTs • MPL-Core Collections
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
                  🔒 99.9% Uptime SLA • Multi-Provider Redundancy
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
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pro</CardTitle>
                <p className="text-sm text-muted-foreground">$15/month</p>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">1 TB</p>
                <p className="text-xs text-muted-foreground">Storage + Bandwidth &middot; +$10/mo per additional TB &middot; 7-day trial</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Scale</CardTitle>
                <p className="text-sm text-muted-foreground">$29/seat/month</p>
                <Badge variant="secondary" className="w-fit">Most Popular</Badge>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">2 TB per seat</p>
                <p className="text-xs text-muted-foreground">2–99 seats &middot; +$10/seat/mo per additional TB</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Enterprise</CardTitle>
                <p className="text-sm text-muted-foreground">Custom pricing</p>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">100+ seats</p>
                <p className="text-xs text-muted-foreground">SSO &middot; Whitelabeling &middot; Dedicated support &middot; SLA</p>
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
            Dynamic embedded wallets auto-created on sign-up.
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
                <h4 className="font-medium mb-2">Embedded Wallets</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Dynamic Embedded Wallets</li>
                  <li>Auto-created on sign-up</li>
                  <li>Email-linked via Dynamic</li>
                  <li>Server-side fallback</li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Supported Networks</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Solana (primary)</li>
                  <li>Ethereum / Base</li>
                  <li>Polygon / Arbitrum</li>
                  <li>Optimism</li>
                </ul>
              </div>
            </div>
            <CodeBlock id="wallet-connect">
{`// Connect wallet using Dynamic
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

<DynamicWidget>
  Connect Wallet
</DynamicWidget>`}
            </CodeBlock>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'dynamic-auth-integration') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Dynamic Auth + Wallet Integration</h1>
          <p className="text-lg text-muted-foreground">
            Enterprise-grade authentication and embedded wallet infrastructure powering BlockDrive.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Key Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock id="dynamic-auth-components">
{`// Core authentication setup in BlockDrive
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';

// Provider hierarchy in main.tsx
<DynamicContextProvider
  settings={{
    environmentId: DYNAMIC_ENV_ID,
    walletConnectors: [SolanaWalletConnectors],
  }}
>
  <App />
</DynamicContextProvider>

// Using the auth hook
const { user, isSignedIn, wallet } = useAuth();`}
            </CodeBlock>

            <div className="grid gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">🔐 DynamicContextProvider</h4>
                <p className="text-sm text-muted-foreground">User authentication, session management, social login, and embedded wallet creation</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">💼 SolanaWalletConnectors</h4>
                <p className="text-sm text-muted-foreground">Embedded wallets with automatic creation on signup</p>
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
              Dynamic provides embedded wallets supporting multiple chains out of the box.
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
              { step: 1, title: "User Initiation", desc: "User clicks 'Sign In' or 'Sign Up' button" },
              { step: 2, title: "Dynamic Authentication", desc: "Email, social login, or wallet connection via Dynamic" },
              { step: 3, title: "Wallet Creation", desc: "Dynamic auto-creates an embedded wallet linked to the user's account" },
              { step: 4, title: "Session Established", desc: "Dynamic session token issued, Supabase client authenticated" },
              { step: 5, title: "Wallet Ready", desc: "Solana and EVM addresses available via useDynamicWallet hook" },
              { step: 6, title: "Redirect", desc: "User redirected to onboarding (new) or dashboard (returning)" }
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
                <h4 className="font-medium mb-2">📡 Filebase Provider</h4>
                <p className="text-sm text-muted-foreground">S3-compatible IPFS gateway with 3x redundancy</p>
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
            The Files page provides a clean, files-first interface with folder management, drag-and-drop, and per-file actions.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Layout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The Files page uses a compact header with action buttons (Upload, New Folder) and maximizes the grid area for file visualization. The old full-width upload block has been replaced.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Header action buttons: Upload (or Set Up Keys) and New Folder</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Status badges: Vault Active, Organization name, Initialize Vault</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Slim progress bar during uploads with percentage and status message</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Tabs: Team Files, My Files, Shared With Me, Trash</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Folders and files displayed in separate, labeled sections</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Folder Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Folders are stored as sentinel rows in the <code className="text-primary">files</code> table with <code className="text-primary">content_type: 'application/x-directory'</code>. They persist across sessions and support hierarchical navigation.
              </p>
              <CodeBlock id="folder-ops">
{`// Create folder (stored in Supabase files table)
await FileDatabaseService.createFolder(
  supabase, userId, "Project Documents", "/",
  orgId,       // optional: organization scope
  "private"    // optional: visibility
);

// Delete folder
await FileDatabaseService.deleteFolder(supabase, folderId, userId);

// Move file into folder
await FileDatabaseService.moveFileToFolder(
  supabase, fileId, userId, "/Project Documents", "report.pdf"
);`}
              </CodeBlock>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drag-and-Drop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Two types of drag-and-drop are supported:</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">External File Drop</h4>
                  <p className="text-sm text-muted-foreground">Drag files from your OS onto the page. A blue overlay appears confirming the drop target. Files are encrypted and uploaded.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Internal File Move</h4>
                  <p className="text-sm text-muted-foreground">Drag a file card onto a folder card to move it. The folder highlights blue as a drop target. The page overlay does not appear for internal drags.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Context Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Each file card has a context menu (top-right) with these actions:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><strong>View</strong> — Preview the encrypted file in-browser</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><strong>Download</strong> — Decrypt and download to local device</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><strong>Share</strong> — On-chain delegation (requires file registration)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><strong>Move to Folder</strong> — Opens a folder picker modal</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><strong>Send to Teammate</strong> — Direct send within organization</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full" /><strong>Delete</strong> — Remove from storage</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Directory Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Files are filtered by the current directory path. When you navigate into a folder, only files at that
                level are displayed. Files that have been moved into subfolders are not shown at the parent level.
                A Back button appears when inside a subfolder. The current path is displayed in the page header.
              </p>
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
            Storage and bandwidth limits based on your subscription plan. Quarterly and annual billing available with discounts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storage by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {[
                { plan: "Pro", storage: "1 TB", bandwidth: "1 TB", price: "$15/month", note: "7-day free trial · +$10/mo per additional TB" },
                { plan: "Scale", storage: "2 TB/seat", bandwidth: "2 TB/seat", price: "$29/seat/month", note: "2–99 seats · +$10/seat/mo per additional TB" },
                { plan: "Enterprise", storage: "Custom", bandwidth: "Custom", price: "Custom", note: "100+ seats · SSO · Whitelabeling · SLA" }
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
                      {tier.note && <p className="text-xs text-muted-foreground">{tier.note}</p>}
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
          <h1 className="text-3xl font-bold text-foreground mb-4">Teams & Organizations</h1>
          <p className="text-lg text-muted-foreground">
            Powered by Dynamic Organizations with BlockDrive extensions for SNS subdomains, NFT ownership, and Supabase data.
          </p>
        </div>

        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-2">Architecture</h3>
            <p className="text-muted-foreground">
              Dynamic handles organization membership, switching, metadata, and invitations natively.
              Supabase stores BlockDrive-specific data: SNS subdomain records, NFT ownership, custom invite codes,
              email domain verification, and organization settings.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Dynamic Organizations</h4>
                  <p className="text-sm text-muted-foreground">Native org management with admin/member roles</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">SNS Subdomains</h4>
                  <p className="text-sm text-muted-foreground">Each org gets a .blockdrive.sol subdomain</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Email Domain Verification</h4>
                  <p className="text-sm text-muted-foreground">Auto-join organizations by verified email domain</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Invite Codes</h4>
                  <p className="text-sm text-muted-foreground">Custom invite codes alongside native invites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Data Model</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock id="team-ops">
{`// Combined Organization type
interface Organization {
  // From auth provider
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  membersCount: number;
  role: string;

  // From Supabase (BlockDrive extensions)
  subdomain?: string;        // .blockdrive.sol subdomain
  snsDomain?: string;        // Full SNS domain
  subscriptionTier?: 'business' | 'enterprise';
  hasSubdomainNft?: boolean; // NFT-gated features
}

// Usage with the useOrganizations hook
const { activeOrg, organizations, switchOrg } = useOrganizations();`}
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
                  <h4 className="font-medium mb-2">Scale Plan</h4>
                  <p className="text-sm text-muted-foreground">$29/seat/month (2–99 seats) &middot; 2 TB/seat &middot; Team collaboration &middot; Dynamic Organizations</p>
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
          <h1 className="text-3xl font-bold text-foreground mb-4">Pricing Plans</h1>
          <p className="text-lg text-muted-foreground">
            Flexible pricing with monthly, quarterly, and annual billing options.
            Pay with card (Stripe) or crypto (USDC, SOL, ETH via embedded wallet).
          </p>
        </div>

        <div className="grid gap-6">
          {[
            {
              name: "Pro",
              prices: { monthly: "$15", quarterly: "$40", annual: "$149" },
              savings: { quarterly: "Save 11%", annual: "Save 17%" },
              storage: "1 TB storage & bandwidth (+$10/mo per additional TB)",
              users: "1 user",
              features: ["Blockchain authentication", "File encryption & ZK proofs", "Instant revoke sharing (internal)", "7-day free trial"],
              popular: false
            },
            {
              name: "Scale",
              prices: { monthly: "$29/seat", quarterly: "$79/seat", annual: "$299/seat" },
              savings: { quarterly: "Save 9%", annual: "Save 14%" },
              storage: "2 TB storage & bandwidth per seat (+$10/seat/mo per additional TB)",
              users: "2–99 users (2 seat minimum)",
              features: ["Team collaboration tools", "Dynamic Organizations + SSO", "24/7 priority support", "Advanced integrations"],
              popular: true
            },
            {
              name: "Enterprise",
              prices: { monthly: "Custom", quarterly: "Custom", annual: "Custom" },
              savings: {},
              storage: "Custom storage allocation",
              users: "100+ users",
              features: ["Everything in Scale", "SSO & SAML", "Whitelisted solutions", "Custom branding", "Dedicated account manager", "SLA guarantees"],
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
                    <CardDescription>
                      {plan.prices.monthly}/mo &middot; {plan.prices.quarterly}/qtr ({plan.savings.quarterly}) &middot; {plan.prices.annual}/yr ({plan.savings.annual})
                    </CardDescription>
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
                { name: "upload-to-ipfs", desc: "Handle file uploads to IPFS via Worker gateway with metadata storage" },
                { name: "security-question", desc: "Get, set, and verify security questions (legacy — not used in current key derivation)" },
                { name: "auth-webhook", desc: "Handle user/org events, provision storage folders, sync profiles" },
                { name: "check-subscription", desc: "Verify user subscription status and quotas" },
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

        <Card>
          <CardHeader>
            <CardTitle>Key Derivation Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Encryption keys are derived from a wallet signature via HKDF. The wallet signs a derivation message,
              and the 64-byte signature is used as HKDF input with level-specific info strings to produce 3 independent
              AES-256-GCM keys. The server never sees the signature or derived keys.
            </p>
            <CodeBlock id="aes-encrypt">
{`// 1. Wallet signs derivation message (automatic when session active)
// 2. Signature used as HKDF input with level-specific info strings
// 3. 3 independent AES-256-GCM keys derived client-side

const signature = await wallet.signMessage("BlockDrive Key Derivation v1");
const keys = await deriveKeysFromSignature(signature);
// keys: Map<SecurityLevel, DerivedEncryptionKey>

// Each level uses different HKDF info for cryptographic independence:
//   Standard:  HKDF(sig, salt, "blockdrive-level-1-encryption")
//   Sensitive: HKDF(sig, salt, "blockdrive-level-2-encryption")
//   Maximum:   HKDF(sig, salt, "blockdrive-level-3-encryption")

// Keys never leave the browser - 4-hour session`}
            </CodeBlock>
          </CardContent>
        </Card>
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
            Unique to BlockDrive: share files internally with other BlockDrive users while retaining the ability to permanently revoke access.
            Note: External sharing (outside BlockDrive) requires file reconstruction, and Instant Revoke does not apply.
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
            Automatic failover across Filebase, Cloudflare R2, and Arweave for maximum reliability.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filebase (Primary)</CardTitle>
              <Badge variant="secondary">IPFS</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">S3-compatible IPFS API with 3x redundancy, global CDN, and automatic pinning.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cloudflare R2</CardTitle>
              <Badge variant="secondary">ZK Proofs</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Zero-egress-fee storage for ZK proof packages and critical bytes.</p>
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

  if (activeSection === 'sns-verification') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">SNS Domain Verification</h1>
          <p className="text-lg text-muted-foreground">
            Solana Naming Service subdomains under blockdrive.sol for human-readable wallet identities.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Each BlockDrive user can claim a subdomain like <code className="text-primary">username.blockdrive.sol</code>.
              Subdomains are registered on-chain via Bonfida's SPL Name Service and require NFT membership.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Availability Check</h4>
                <p className="text-sm text-muted-foreground">Real-time lookup against the SNS registry</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">On-Chain Registration</h4>
                <p className="text-sm text-muted-foreground">Signed via Dynamic embedded wallet</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Ownership Verification</h4>
                <p className="text-sm text-muted-foreground">Resolve subdomain to wallet address</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Transfer & Release</h4>
                <p className="text-sm text-muted-foreground">Transfer ownership or release subdomains</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />3-32 characters, alphanumeric and hyphens only</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Cannot start or end with a hyphen, no consecutive hyphens</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Reserved names blocked (www, api, admin, etc.)</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />NFT membership required for registration</li>
            </ul>
          </CardContent>
        </Card>

        <CodeBlock id="sns-usage">
{`// SNS Subdomain Service
import { snsSubdomainService } from '@/services/snsSubdomainService';

// Check availability
const result = await snsSubdomainService.checkAvailability('myname');
// { available: true, subdomain: 'myname', fullDomain: 'myname.blockdrive.sol' }

// Register subdomain (requires Dynamic signer)
const reg = await snsSubdomainService.registerSubdomain(
  'myname', walletAddress, dynamicSigner
);

// Resolve to wallet address
const owner = await snsSubdomainService.resolveSubdomain('myname');

// Verify ownership
const isOwner = await snsSubdomainService.verifyOwnership('myname', walletAddress);`}
        </CodeBlock>
      </div>
    );
  }


  if (activeSection === 'onchain-registry') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">On-Chain Registry</h1>
          <p className="text-lg text-muted-foreground">
            Every file uploaded to BlockDrive is registered on Solana with cryptographic commitments
            using Multi-PDA Sharding for scalability beyond 1,000 files.
          </p>
        </div>

        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-2">What Gets Stored On-Chain</h3>
            <p className="text-muted-foreground">
              File content is never stored on Solana. Only cryptographic commitments, file metadata hashes,
              storage provider CIDs, security levels, and delegation records are registered as PDAs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: 1, title: "Encrypt & Split", desc: "AES-256-GCM encrypt, extract critical 16 bytes" },
              { step: 2, title: "Generate Commitments", desc: "SHA-256 of critical bytes and encrypted content" },
              { step: 3, title: "Upload Content", desc: "Encrypted file (minus critical bytes) to Filebase IPFS" },
              { step: 4, title: "Upload Proof", desc: "ZK proof package to Cloudflare R2" },
              { step: 5, title: "Register PDA", desc: "FileRecord PDA created on Solana with commitments and CIDs" }
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

        <Card>
          <CardHeader>
            <CardTitle>Multi-PDA Sharding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              To overcome Solana's account size limits, BlockDrive uses a sharding system where vault data
              is distributed across multiple shard PDAs. This supports 1,000+ files per user without hitting
              on-chain storage limits.
            </p>
            <CodeBlock id="sharding">
{`// Sharding architecture
// Seeds: ["shard", vault_pubkey, shard_index]
pub struct UserVaultShard {
    pub vault: Pubkey,           // Parent vault
    pub shard_index: u16,        // Shard number
    pub file_records: Vec<Pubkey>, // File record references
    pub file_count: u16,
}

// ShardingClient handles auto-allocation
const client = new ShardingClient(connection, programId);
await client.registerFile(vault, fileRecord);`}
            </CodeBlock>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'user-vault') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">UserVault PDA</h1>
          <p className="text-lg text-muted-foreground">
            The root on-chain account for each user, storing their master key commitment and vault configuration.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Structure</CardTitle>
            <CardDescription>Seeds: ["vault", owner_pubkey] &middot; Size: 170 bytes</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock id="uservault-struct">
{`pub struct UserVault {
    pub bump: u8,                          // PDA bump seed
    pub owner: Pubkey,                     // Owner's wallet address
    pub master_key_commitment: [u8; 32],   // SHA256(master_key)
    pub file_count: u64,                   // Total files in vault
    pub total_storage: u64,                // Total bytes stored
    pub created_at: i64,                   // Creation timestamp
    pub updated_at: i64,                   // Last activity
    pub status: VaultStatus,               // Active | Frozen | Deleted
    pub reserved: [u8; 64],                // Future use
}`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vault Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <h4 className="font-medium">Active</h4>
                <p className="text-xs text-muted-foreground mt-1">Normal operations allowed</p>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <h4 className="font-medium">Frozen</h4>
                <p className="text-xs text-muted-foreground mt-1">Read-only, no new uploads</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <h4 className="font-medium">Deleted</h4>
                <p className="text-xs text-muted-foreground mt-1">Soft-deleted, data retained</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><code>initialize_vault</code> &mdash; Creates vault PDA with master key commitment</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><code>add_file</code> &mdash; Increments file_count and total_storage</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><code>remove_file</code> &mdash; Decrements counters (saturating)</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /><code>is_active</code> / <code>is_frozen</code> &mdash; Status checks</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'file-record') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">FileRecord PDA</h1>
          <p className="text-lg text-muted-foreground">
            On-chain record for each encrypted file, storing commitments, CIDs, and delegation metadata.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Structure</CardTitle>
            <CardDescription>Seeds: ["file", vault_pubkey, file_id] &middot; Size: 406 bytes</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock id="filerecord-struct">
{`pub struct FileRecord {
    pub bump: u8,
    pub vault: Pubkey,                      // Parent vault
    pub owner: Pubkey,                      // Owner wallet
    pub file_id: [u8; 16],                  // UUID bytes
    pub filename_hash: [u8; 32],            // SHA256(filename) for privacy
    pub file_size: u64,                     // Original size
    pub encrypted_size: u64,                // Encrypted size
    pub mime_type_hash: [u8; 32],           // SHA256(mime_type)
    pub security_level: SecurityLevel,      // Standard | Enhanced | Maximum
    pub encryption_commitment: [u8; 32],    // SHA256(encrypted_content)
    pub critical_bytes_commitment: [u8; 32],// SHA256(critical_bytes)
    pub primary_cid: [u8; 64],             // Filebase IPFS CID
    pub redundancy_cid: [u8; 64],          // Backup storage CID
    pub provider_count: u8,                 // Number of storage providers
    pub created_at: i64,
    pub accessed_at: i64,
    pub status: FileStatus,                 // Active | Archived | Deleted
    pub is_shared: bool,
    pub delegation_count: u8,
    pub reserved: [u8; 32],
}`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Standard</h4>
                <p className="text-xs text-muted-foreground mt-1">AES-256-GCM, 1KB critical bytes</p>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <h4 className="font-medium">Enhanced</h4>
                <p className="text-xs text-muted-foreground mt-1">+ additional verification, 3KB critical bytes</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <h4 className="font-medium">Maximum</h4>
                <p className="text-xs text-muted-foreground mt-1">+ multi-layer encryption, 5KB critical bytes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'delegation') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Delegation PDA</h1>
          <p className="text-lg text-muted-foreground">
            On-chain file access delegation with ECDH-encrypted keys, permission levels, and expiration.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Structure</CardTitle>
            <CardDescription>Seeds: ["delegation", file_record_pubkey, grantee_pubkey] &middot; Size: 302 bytes</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock id="delegation-struct">
{`pub struct Delegation {
    pub bump: u8,
    pub file_record: Pubkey,               // Target file
    pub grantor: Pubkey,                    // File owner
    pub grantee: Pubkey,                    // Recipient
    pub encrypted_file_key: [u8; 128],     // ECDH-encrypted file key
    pub permission_level: PermissionLevel, // View | Download | Reshare
    pub expires_at: i64,                   // 0 = no expiry
    pub created_at: i64,
    pub is_active: bool,
    pub is_accepted: bool,
    pub access_count: u64,
    pub last_accessed_at: i64,
    pub reserved: [u8; 32],
}`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permission Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">View</h4>
                <p className="text-xs text-muted-foreground mt-1">Can view file metadata only</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h4 className="font-medium">Download</h4>
                <p className="text-xs text-muted-foreground mt-1">Can download and decrypt file</p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <h4 className="font-medium">Reshare</h4>
                <p className="text-xs text-muted-foreground mt-1">Can create sub-delegations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ECDH Key Exchange</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The file encryption key is re-encrypted for the recipient using ECDH (P-256) key exchange.
              An ephemeral key pair is generated, a shared secret derived, then AES-GCM encrypts the
              critical bytes + IV for the grantee. Only the grantee's private key can decrypt.
            </p>
            <CodeBlock id="ecdh-delegation">
{`// Encrypt critical bytes for a recipient
const pkg = await ecdhKeyExchange.encryptCriticalBytesForRecipient(
  criticalBytes, fileIv, recipientPublicKey
);
// Returns: { encryptedCriticalBytes, ephemeralPublicKey, iv }

// Recipient decrypts
const { criticalBytes, fileIv } = await ecdhKeyExchange
  .decryptCriticalBytesFromDelegation(pkg, recipientPrivateKey);`}
            </CodeBlock>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'session-delegation') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Session Delegation</h1>
          <p className="text-lg text-muted-foreground">
            Gasless operations via a trusted relayer with time-limited, permission-scoped session keys.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Structure</CardTitle>
            <CardDescription>Seeds: ["session", owner_pubkey, relayer_pubkey]</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock id="session-struct">
{`pub struct SessionDelegation {
    pub owner: Pubkey,              // User's wallet
    pub relayer: Pubkey,            // Trusted backend relayer
    pub nonce: u64,                 // Replay attack protection
    pub allowed_operations: u8,     // Bitmap of permissions
    pub expires_at: i64,            // Max 7 days from creation
    pub is_active: bool,
    pub max_operations: u32,        // 0 = unlimited
    pub operations_used: u32,
}`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operation Permissions (Bitmap)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm">
                <p>UPLOAD &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 0b00000001</p>
                <p>UPDATE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 0b00000010</p>
                <p>CREATE_SHARD = 0b00000100</p>
                <p>ARCHIVE &nbsp;&nbsp;&nbsp;&nbsp;= 0b00001000</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <h4 className="font-medium mb-2">Security Note</h4>
                <p className="text-xs text-muted-foreground">
                  DELETE (hard delete) is intentionally NOT delegatable. Self-delegation is prevented.
                  Nonce verification prevents replay attacks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'file-sharing') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">File Sharing</h1>
          <p className="text-lg text-muted-foreground">
            Cryptographically secure file sharing using ECDH key exchange and on-chain delegation PDAs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sharing Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: 1, title: "Select File", desc: "Owner selects file and recipient" },
              { step: 2, title: "ECDH Key Exchange", desc: "File key re-encrypted for recipient using P-256 ECDH" },
              { step: 3, title: "Create Delegation PDA", desc: "On-chain record with encrypted key, permission level, and optional expiry" },
              { step: 4, title: "Recipient Decrypts", desc: "Recipient derives shared secret, decrypts critical bytes + IV" },
              { step: 5, title: "Download & Reassemble", desc: "Critical bytes + encrypted content merged and decrypted" }
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{item.step}</div>
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share Modalities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Direct Share</h4>
                <p className="text-sm text-muted-foreground">Share to a specific wallet address with on-chain delegation</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Team Share</h4>
                <p className="text-sm text-muted-foreground">Move files to team storage within an organization</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Send to Teammate</h4>
                <p className="text-sm text-muted-foreground">Share with org members by email or wallet</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Instant Revoke (Internal Only)</h4>
                <p className="text-sm text-muted-foreground">Delete delegation PDA to permanently revoke access for internal BlockDrive recipients. External sharing requires file reconstruction.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'access-control') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Access Control</h1>
          <p className="text-lg text-muted-foreground">
            Multi-layered access control combining Dynamic auth, on-chain delegations, and cryptographic enforcement.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Access Control Layers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Layer 1: Dynamic Authentication</h4>
                <p className="text-sm text-muted-foreground">Session-based auth with Dynamic. ProtectedRoute guards all app pages. Supabase client authenticated via Dynamic JWT.</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Layer 2: Organization Membership</h4>
                <p className="text-sm text-muted-foreground">Dynamic Organizations control team-level access. Admin vs member roles determine who can invite, manage settings, and access team files.</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Layer 3: On-Chain Delegation</h4>
                <p className="text-sm text-muted-foreground">Solana Delegation PDAs enforce file-level permissions (View, Download, Reshare) with optional time-based expiration.</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Layer 4: Cryptographic Enforcement</h4>
                <p className="text-sm text-muted-foreground">Files are mathematically unreadable without both critical bytes and the encrypted content. ECDH ensures only authorized recipients can decrypt.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription-Based Gating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The SubscriptionGate component checks the user's active subscription tier before allowing
              access to premium features like team creation, advanced sharing, and increased storage quotas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'stripe-atlas') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Stripe Atlas</h1>
          <p className="text-lg text-muted-foreground">
            Form a Delaware C-Corp with integrated Stripe payments, directly from BlockDrive.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Delaware C-Corp</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Banking Ready</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Settings className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Tax & Legal</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Registered agent for one year</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />IRS EIN filing and 83(b) election</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Customizable legal documents and cap table</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />$100K+ in partner perks</li>
            </ul>
            <div className="mt-4 p-4 bg-violet-500/10 rounded-lg border border-violet-500/20">
              <p className="text-sm"><span className="font-medium">One-time fee:</span> $500</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'clerky') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Clerky</h1>
          <p className="text-lg text-muted-foreground">
            VC-standard legal paperwork for startups, built by lawyers. Used by Y Combinator companies.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Services Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Legal Docs</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Hiring</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Fundraising</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Delaware incorporation with standard startup docs</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Employee and contractor agreements with equity</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />SAFE notes and convertible instruments</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Series A financing documents</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Board consents and corporate housekeeping</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'recovery-sdk') {
    return (
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Recovery SDK</h1>
          </div>
          <p className="text-lg text-muted-foreground mt-4">
            Open-source Python SDK for recovering files encrypted with BlockDrive, ensuring users are never locked in.
          </p>
        </div>

        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-2">No Vendor Lock-In</h3>
            <p className="text-muted-foreground">
              Even if BlockDrive's services go offline, users can independently recover their files using this
              open-source SDK with their wallet signature and the on-chain records.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installation</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock id="sdk-install">
{`# Basic installation
pip install blockdrive-recovery

# With Solana verification support
pip install blockdrive-recovery[solana]

# With Filebase enterprise gateway
pip install blockdrive-recovery[filebase]`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock id="sdk-usage">
{`from blockdrive import BlockDriveRecovery, SecurityLevel

# Initialize with wallet signature
recovery = BlockDriveRecovery(
    signatures={SecurityLevel.STANDARD: signature_bytes},
)

# Recover file using content CID and proof CID
result = recovery.recover_file(
    content_cid="bafybeig...",
    proof_cid="proof-abc123",
    security_level=SecurityLevel.STANDARD,
)

if result.success:
    with open("recovered.pdf", "wb") as f:
        f.write(result.data)`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SDK Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-mono font-medium text-sm mb-2">KeyDerivation</h4>
                <p className="text-xs text-muted-foreground">Derive encryption keys from wallet signatures</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-mono font-medium text-sm mb-2">AESDecryptor</h4>
                <p className="text-xs text-muted-foreground">AES-256-GCM decryption with critical bytes reassembly</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-mono font-medium text-sm mb-2">IPFSClient / FilebaseClient</h4>
                <p className="text-xs text-muted-foreground">Retrieve encrypted content from IPFS/Filebase</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-mono font-medium text-sm mb-2">SolanaVerifier</h4>
                <p className="text-xs text-muted-foreground">Verify on-chain file records and commitments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'zk-circuits') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">ZK Circuit Compilation</h1>
          <p className="text-lg text-muted-foreground">
            Building and deploying the Groth16 circuits that power BlockDrive's zero-knowledge proofs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Circuit: CriticalBytesCommitment</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock id="circuit-code">
{`// criticalBytesCommitment.circom
template CriticalBytesCommitment() {
    signal input criticalBytes[128];   // 16 bytes as 128 bits (private)
    signal input commitment[256];      // SHA-256 hash (public)

    // Binary constraint for each bit
    for (var i = 0; i < 128; i++) {
        criticalBytes[i] * (1 - criticalBytes[i]) === 0;
    }

    // Compute SHA-256 and constrain to public commitment
    component sha256Hasher = Sha256(128);
    for (var i = 0; i < 128; i++) {
        sha256Hasher.in[i] <== criticalBytes[i];
    }
    for (var i = 0; i < 256; i++) {
        sha256Hasher.out[i] === commitment[i];
    }
}

component main {public [commitment]} = CriticalBytesCommitment();`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Build Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: 1, title: "Install circomlib", desc: "npm install circomlib" },
              { step: 2, title: "Compile circuit", desc: "circom → R1CS + WASM + symbols" },
              { step: 3, title: "Powers of Tau", desc: "Download Hermez ceremony (2^14 constraints)" },
              { step: 4, title: "Generate proving key", desc: "Groth16 setup + contribution + beacon" },
              { step: 5, title: "Export verification key", desc: "JSON verification key for client-side verification" },
              { step: 6, title: "Generate Solidity verifier", desc: "Optional on-chain verification contract" }
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{item.step}</div>
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
            <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                For production, a multi-party trusted setup ceremony is required. See scripts/trusted-setup-ceremony.md
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Build Artifacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-mono text-sm">.wasm</p>
                <p className="text-xs text-muted-foreground mt-1">Circuit for browser proving</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-mono text-sm">.zkey</p>
                <p className="text-xs text-muted-foreground mt-1">Proving key</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-mono text-sm">verification_key.json</p>
                <p className="text-xs text-muted-foreground mt-1">Public verification key</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'billing') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Payments & Billing</h1>
          <p className="text-lg text-muted-foreground">
            Dual-rail payment system supporting both fiat (Stripe) and crypto (via embedded wallet) with automatic recurring billing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fiat Payments (Stripe)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Stripe Checkout for card/bank payments</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />2.9% processing fee</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Automatic recurring billing</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Customer portal for self-service</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Webhook-driven subscription management</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Crypto Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />USDC, SOL, ETH accepted</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />~1.3% processing fee</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Auto-debit via pg_cron scheduler</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />Dynamic embedded wallet integration</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" />On-ramp support for fiat-to-crypto</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Billing Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-medium">Monthly</p>
                <p className="text-xs text-muted-foreground mt-1">Standard pricing</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-medium">Quarterly</p>
                <p className="text-xs text-muted-foreground mt-1">Save 9-11%</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="font-medium">Annual</p>
                <p className="text-xs text-muted-foreground mt-1">Save 14-17%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treasury</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Crypto payments are routed to the BlockDrive treasury wallet:
            </p>
            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
              <code className="text-sm text-primary">neo.blockdrive.sol</code>
              <p className="text-xs text-muted-foreground mt-1">GABYjW8LgkLBTFzkJSzTFZGnuZbZaw36xcDv6cVFRg2y</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'key-derivation') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Key Derivation & Session Management</h1>
          <p className="text-lg text-muted-foreground">
            BlockDrive derives encryption keys from a wallet signature via HKDF-SHA256. The server never sees
            the signature or derived keys.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Wallet Signature Key Derivation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary shrink-0">1.</span>
                <span><strong>Signing:</strong> The wallet signs a fixed message (<code className="text-primary">"BlockDrive Key Derivation v1"</code>) using Ed25519. This produces a 64-byte signature.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary shrink-0">2.</span>
                <span><strong>HKDF derivation:</strong> The signature is used as HKDF-SHA256 input with 3 level-specific info strings, producing 3 independent AES-256-GCM keys.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary shrink-0">3.</span>
                <span><strong>Client-only:</strong> Keys exist only in browser memory. The server never sees the signature or keys.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary shrink-0">4.</span>
                <span><strong>Deterministic:</strong> The same wallet always produces the same signature for the same message, so the same keys are derived on any device.</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Persistence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Keys are held in a module-level singleton shared across all React components via <code className="text-primary">useSyncExternalStore</code>.
              Keys persist across route navigation without re-signing.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Auto-Restore</h4>
                <p className="text-sm text-muted-foreground">When a wallet connects, keys are automatically derived in the background. If the CryptoSetupModal opens but keys are already initialized, it immediately completes.</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Session Boundaries</h4>
                <p className="text-sm text-muted-foreground">Keys expire after 4 hours. Closing the browser tab clears all keys. Logging out explicitly clears all cached keys.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Module-Level Singleton</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              The <code className="text-primary">useWalletCrypto</code> hook uses a module-level singleton store shared across all
              hook instances via <code className="text-primary">useSyncExternalStore</code>. This ensures all components see the same
              key state without prop drilling or context providers.
            </p>
            <CodeBlock id="key-singleton">
{`// Module-level singleton (shared across all hook instances)
let _keys: WalletDerivedKeys | null = null;
let _session: KeyDerivationSession | null = null;

// All components using useWalletCrypto() share the same keys
const { state, initializeKeys, getKey } = useWalletCrypto();

// getKey() auto-refreshes expired sessions via wallet signature
const cryptoKey = await getKey(SecurityLevel.MAXIMUM);`}
            </CodeBlock>
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