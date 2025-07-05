import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { PhantomWalletService } from '@/services/phantomWalletService';
import { SolflareWalletService } from '@/services/solflareWalletService';
import { ConnectedWallet } from '@/types/wallet';
import { toast } from "@/hooks/use-toast";
export const WalletConnector = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const handleWalletConnection = async (wallet: ConnectedWallet, signature: string) => {
    console.log('Wallet connected:', wallet);
    toast({
      title: "Wallet Connected",
      description: `Successfully connected ${wallet.blockchain} wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    });
  };
  const connectPhantom = async () => {
    setIsConnecting(true);
    const phantomService = new PhantomWalletService();
    await phantomService.connect(handleWalletConnection);
    setIsConnecting(false);
  };
  const connectSolflare = async () => {
    setIsConnecting(true);
    const solflareService = new SolflareWalletService();
    await solflareService.connect(handleWalletConnection);
    setIsConnecting(false);
  };
  return <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800">
      
    </Card>;
};