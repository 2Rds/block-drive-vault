
import { PublicKey } from '@solana/web3.js';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { toast } from "@/hooks/use-toast";
import { convertSignatureToHex, createAuthMessage, encodeMessage } from '@/utils/walletUtils';
import { ConnectedWallet, WalletConnectionResult } from '@/types/wallet';

export class SolflareWalletService {
  private adapter: SolflareWalletAdapter | null = null;

  async connect(
    onSuccess: (wallet: ConnectedWallet, signature: string) => Promise<void>,
    autoConnect = false
  ): Promise<WalletConnectionResult> {
    try {
      this.adapter = new SolflareWalletAdapter();
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
      console.error('Error connecting to Solflare wallet:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to Solflare wallet.",
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
