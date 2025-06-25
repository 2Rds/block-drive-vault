
import { PublicKey } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { toast } from "@/hooks/use-toast";
import { convertSignatureToHex, createAuthMessage, encodeMessage, detectWalletExtension } from '@/utils/walletUtils';
import { ConnectedWallet, WalletConnectionResult } from '@/types/wallet';

export class PhantomWalletService {
  private adapter: PhantomWalletAdapter | null = null;

  async connect(
    onSuccess: (wallet: ConnectedWallet, signature: string) => Promise<void>,
    autoConnect = false
  ): Promise<WalletConnectionResult> {
    try {
      if (!detectWalletExtension('phantom')) {
        toast({
          title: "Phantom Extension Not Detected",
          description: "Please install the Phantom extension to connect your wallet.",
          variant: "destructive",
        });
        return { success: false, error: "Extension not detected" };
      }

      this.adapter = new PhantomWalletAdapter();
      await this.adapter.connect();

      const publicKey = new PublicKey(this.adapter.publicKey as any);
      const address = publicKey.toBase58();

      // Sign authentication message
      const message = createAuthMessage();
      const encodedMessage = encodeMessage(message);
      const signature = await this.adapter.signMessage!(encodedMessage);
      const signatureHex = convertSignatureToHex(signature);

      const walletInfo: ConnectedWallet = { address, blockchain: 'solana' };
      await onSuccess(walletInfo, signatureHex);

      return { success: true };
    } catch (error: any) {
      console.error('Error connecting to Phantom wallet:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to Phantom wallet.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  }

  getAdapter() {
    return this.adapter;
  }

  disconnect() {
    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
    }
  }
}
