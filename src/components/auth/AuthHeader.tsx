
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const AuthHeader = () => {
  const [copied, setCopied] = useState(false);
  const tokenCA = "3KkBgDMKPx1qtQUhLnU8RLQnFLNX8eC2rbJekJjYpump";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tokenCA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <img src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" alt="BlockDrive Logo" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BlockDrive</h1>
            <p className="text-xs text-muted-foreground">Next-Gen Web3 Data Management Platform</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Solana Token CA</p>
            <div className="flex items-center space-x-2">
              <code className="text-sm font-mono text-foreground">
                {tokenCA.slice(0, 8)}...{tokenCA.slice(-8)}
              </code>
              <button
                onClick={copyToClipboard}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Copy full address"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
