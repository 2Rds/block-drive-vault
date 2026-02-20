/**
 * Yield Summary Card
 *
 * Compact card for the Dashboard showing combined yield across both chains.
 * Links to the full YieldDashboard for supply/withdraw actions.
 */

import { TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import { useAaveYield } from '@/hooks/useAaveYield';
import { useKaminoYield } from '@/hooks/useKaminoYield';
import { useDynamicAuth } from '@/contexts/DynamicAuthContext';

export function YieldSummaryCard() {
  const { isSignedIn } = useDynamicAuth();
  const aave = useAaveYield();
  const kamino = useKaminoYield();

  // Don't show if not signed in
  if (!isSignedIn) return null;

  const totalSupplied = aave.supplied + kamino.supplied;
  const totalEarned = aave.earned + kamino.earned;
  const isLoading = aave.isLoading || kamino.isLoading;
  const blendedApy =
    totalSupplied > 0
      ? (aave.supplied * aave.apy + kamino.supplied * kamino.apy) / totalSupplied
      : ((aave.apy + kamino.apy) / 2);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-medium text-foreground">USDC Yield</h3>
        </div>
        <span className="text-xs text-muted-foreground">Aave + Kamino</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading yield data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Supplied</p>
            <p className="text-lg font-semibold text-foreground">${totalSupplied.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg APY</p>
            <p className="text-lg font-semibold text-green-400">{blendedApy.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Earned</p>
            <p className="text-lg font-semibold text-foreground">${totalEarned.toFixed(4)}</p>
          </div>
        </div>
      )}

      {totalSupplied === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground/70 mt-2">
          Supply USDC to earn yield on Base (Aave ~{aave.apy}%) or Solana (Kamino ~{kamino.apy}%).
        </p>
      )}
    </div>
  );
}
