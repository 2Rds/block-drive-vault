
import { useState, useEffect } from 'react';
import { BaseAuthService } from '@/services/baseAuthService';
import { BaseSubdomainService } from '@/services/baseSubdomainService';
import { toast } from 'sonner';

export const useBaseAuth = (walletAddress?: string) => {
  const [hasNFT, setHasNFT] = useState(false);
  const [hasSubdomain, setHasSubdomain] = useState(false);
  const [isFullyVerified, setIsFullyVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nftData, setNftData] = useState<any>(null);
  const [subdomainData, setSubdomainData] = useState<any>(null);

  const checkBase2FA = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      const verification = await BaseSubdomainService.verifyBase2FA(walletAddress);
      
      setHasNFT(verification.hasNFT);
      setHasSubdomain(verification.hasSubdomain);
      setIsFullyVerified(verification.isFullyVerified);

      // Get detailed data
      if (verification.hasNFT) {
        const nftResult = await BaseAuthService.verifySoulboundNFT(walletAddress);
        setNftData(nftResult.nftData);
      }

      if (verification.hasSubdomain) {
        const subdomainResult = await BaseAuthService.verifyBaseSubdomain(walletAddress);
        setSubdomainData(subdomainResult.subdomainData);
      }

    } catch (error) {
      console.error('Base 2FA check error:', error);
      toast.error('Failed to verify Base authentication');
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithBase = async (signature: string, message: string) => {
    if (!walletAddress) return { success: false, error: 'No wallet address' };
    
    setLoading(true);
    try {
      const result = await BaseAuthService.authenticateWithBase2FA(walletAddress, signature, message);
      
      if (result.success) {
        await checkBase2FA(); // Refresh status
      }
      
      return result;
    } catch (error: any) {
      console.error('Base authentication error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const createSubdomain = async (subdomainName: string) => {
    if (!walletAddress) return { success: false, error: 'No wallet address' };
    
    const result = await BaseSubdomainService.createBaseSubdomain(walletAddress, subdomainName);
    
    if (result.success) {
      await checkBase2FA(); // Refresh status
    }
    
    return result;
  };

  useEffect(() => {
    if (walletAddress) {
      checkBase2FA();
    }
  }, [walletAddress]);

  return {
    hasNFT,
    hasSubdomain,
    isFullyVerified,
    loading,
    nftData,
    subdomainData,
    checkBase2FA,
    authenticateWithBase,
    createSubdomain
  };
};
