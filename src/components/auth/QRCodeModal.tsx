
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';

interface QRCodeModalProps {
  showQRCode: boolean;
  onClose: () => void;
}

export const QRCodeModal = ({ showQRCode, onClose }: QRCodeModalProps) => {
  if (!showQRCode) return null;

  return (
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
            onClick={onClose} 
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
