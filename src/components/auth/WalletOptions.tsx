
import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Wallet, QrCode } from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  blockchain: 'solana';
}

interface WalletOptionsProps {
  connectedWallet: {address: string, blockchain: string} | null;
  isConnecting: string | null;
  onWalletConnect: (wallet: WalletOption) => void;
  onShowQRCode: () => void;
}

export const WalletOptions = ({ connectedWallet, isConnecting, onWalletConnect, onShowQRCode }: WalletOptionsProps) => {
  const walletOptions: WalletOption[] = [{
    id: 'phantom',
    name: 'Phantom',
    icon: '\u{1F47B}',
    blockchain: 'solana'
  }, {
    id: 'solflare',
    name: 'Solflare',
    icon: '\u{1F525}',
    blockchain: 'solana'
  }];

  const detectWallet = (walletId: string) => {
    switch (walletId) {
      case 'phantom':
        return (window as any).phantom?.solana;
      case 'solflare':
        return (window as any).solflare;
      default:
        return false;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0">
          <Wallet className="w-4 h-4 mr-2" />
          {connectedWallet ? 'Reconnect Wallet' : 'Connect Wallet'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-card border border-border shadow-xl rounded-xl z-50" align="end">
        <DropdownMenuLabel className="text-foreground text-center py-3">
          Choose Your Solana Wallet
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />

        {walletOptions.map(wallet => {
          const isDetected = detectWallet(wallet.id);
          const isConnectingWallet = isConnecting === wallet.id;
          return (
            <DropdownMenuItem
              key={wallet.id}
              className="text-muted-foreground hover:bg-muted cursor-pointer p-3 m-1 rounded-lg"
              onClick={() => onWalletConnect(wallet)}
              disabled={isConnectingWallet}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{wallet.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{wallet.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{wallet.blockchain}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!isDetected && (
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                      Not Installed
                    </span>
                  )}
                  {isDetected && (
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                      Detected
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="text-muted-foreground hover:bg-muted cursor-pointer p-3 m-1 rounded-lg"
          onClick={onShowQRCode}
        >
          <QrCode className="w-4 h-4 mr-3" />
          <span>Scan QR Code</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
