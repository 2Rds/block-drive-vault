import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink, FileText, Users, Shield, Zap, Settings, Code, Globe, Copy, Check } from 'lucide-react';
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
{`// Connect wallet using Dynamic SDK
import { DynamicConnectButton } from '@dynamic-labs/sdk-react-core';

<DynamicConnectButton>
  Connect Wallet
</DynamicConnectButton>`}
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

  // Default content for other sections
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-4 capitalize">
          {activeSection.replace('-', ' ')}
        </h1>
        <p className="text-lg text-muted-foreground">
          Documentation for {activeSection.replace('-', ' ')} functionality.
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