
import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseAuthService } from '@/services/baseAuthService';

export const BaseSoulboundNFTInfo = () => {
  const handleMintNFT = () => {
    BaseAuthService.redirectToSoulboundNFTMint();
  };

  return (
    <div className="bg-gradient-to-r from-blue-800/20 to-purple-800/20 rounded-lg border border-blue-700/50 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="w-6 h-6 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Base Soulbound NFT Authentication</h3>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-xs">1</span>
            </div>
            <div>
              <p className="text-blue-400 font-medium">Mint Your Free Soulbound NFT</p>
              <p className="text-gray-400">Get your permanent Base authentication NFT</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-xs">2</span>
            </div>
            <div>
              <p className="text-purple-400 font-medium">Create Base Subdomain</p>
              <p className="text-gray-400">Register your blockdrive.eth subdomain</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <Button 
            onClick={handleMintNFT}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Mint Free Base Soulbound NFT
          </Button>
          
          <div className="mt-3 p-3 bg-orange-900/20 border border-orange-700/50 rounded">
            <p className="text-orange-200 text-xs">
              <strong>🔒 Soulbound Feature:</strong> This NFT is permanently bound to your Base wallet and cannot be transferred, ensuring authentic identity verification on the Base L2 network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
