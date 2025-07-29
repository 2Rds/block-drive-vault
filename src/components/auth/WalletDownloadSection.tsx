import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const WalletDownloadSection = () => {
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="mb-4">
            <Download className="w-12 h-12 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              New to Web3?
            </h3>
            <p className="text-muted-foreground">
              Don't have a wallet yet? Download Phantom to get started with secure Web3 storage.
            </p>
          </div>
          
          <Button 
            onClick={() => window.open('https://phantom.com/download', '_blank')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white border-0 px-6 py-3 rounded-xl font-medium transition-all duration-200"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Phantom Wallet
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
          
          <p className="text-xs text-muted-foreground mt-3">
            Free • Secure • Easy to use
          </p>
        </div>
      </CardContent>
    </Card>
  );
};