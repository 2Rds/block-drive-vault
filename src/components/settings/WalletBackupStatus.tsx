/**
 * Wallet Backup Status Component
 *
 * Displays the Google Drive wallet backup status from Dynamic SDK.
 * Dynamic manages the backup flow; this component reads and displays the state.
 */

import { useDynamicContext, useUserWallets, type WalletConnector } from '@dynamic-labs/sdk-react-core';
import { Shield, ShieldCheck, ShieldAlert, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WalletBackupStatus() {
  const { sdkHasLoaded, setShowDynamicUserProfile } = useDynamicContext();
  const userWallets = useUserWallets();

  if (!sdkHasLoaded) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading wallet status...</span>
      </div>
    );
  }

  const embeddedWallets = userWallets.filter(
    (w) => {
      const connector = w.connector as WalletConnector & { isEmbeddedWallet?: boolean };
      return connector?.isEmbeddedWallet === true;
    },
  );

  if (embeddedWallets.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No Embedded Wallets</p>
            <p className="text-xs text-muted-foreground">
              Embedded wallets will be created when you sign up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic manages backup state internally.
  // The embedded wallet's recovery method indicates backup status.
  const hasBackup = embeddedWallets.some(
    (w) => {
      const connector = w.connector as WalletConnector & { walletBackupType?: string; hasBackup?: boolean };
      return connector?.walletBackupType === 'google' || connector?.hasBackup;
    },
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          hasBackup ? 'bg-green-500/10' : 'bg-yellow-500/10'
        }`}>
          {hasBackup ? (
            <ShieldCheck className="w-5 h-5 text-green-400" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Wallet Backup {hasBackup ? 'Active' : 'Not Configured'}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasBackup
              ? 'Your wallet keys are backed up to Google Drive. You can recover your wallet on any device.'
              : 'Enable Google Drive backup to protect your wallet keys. Recommended for account recovery.'}
          </p>
        </div>
      </div>

      {/* Wallet list */}
      <div className="space-y-2 pl-[52px]">
        {embeddedWallets.map((wallet) => (
          <div key={wallet.address} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{wallet.chain}</span>
              <code className="text-foreground bg-background px-1.5 py-0.5 rounded truncate max-w-[200px]">
                {wallet.address}
              </code>
            </div>
          </div>
        ))}
      </div>

      {!hasBackup && (
        <div className="pl-[52px]">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              // Open Dynamic's user profile widget for backup configuration
              setShowDynamicUserProfile(true);
            }}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Enable Backup
          </Button>
        </div>
      )}
    </div>
  );
}
