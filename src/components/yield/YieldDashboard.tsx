/**
 * Yield Dashboard Component
 *
 * Unified dual-chain yield view:
 * - Base tab: Aave V3 USDC supply (3-5% APY)
 * - Solana tab: Kamino USDC supply (4-6% APY)
 * - Combined view: total across chains
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { useAaveYield } from '@/hooks/useAaveYield';
import { useKaminoYield } from '@/hooks/useKaminoYield';
import { useCryptoBalance } from '@/hooks/useCryptoBalance';
import { toast } from 'sonner';

export function YieldDashboard() {
  const aave = useAaveYield();
  const kamino = useKaminoYield();
  const { baseUsdc, solanaUsdc } = useCryptoBalance();

  const totalSupplied = aave.supplied + kamino.supplied;
  const totalEarned = aave.earned + kamino.earned;
  const blendedApy =
    totalSupplied > 0
      ? (aave.supplied * aave.apy + kamino.supplied * kamino.apy) / totalSupplied
      : 0;

  return (
    <div className="space-y-6">
      {/* Combined Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Supplied"
          value={`$${totalSupplied.toFixed(2)}`}
          subtext="across both chains"
        />
        <StatCard
          label="Blended APY"
          value={`${blendedApy.toFixed(1)}%`}
          subtext="weighted average"
          highlight
        />
        <StatCard
          label="Total Earned"
          value={`$${totalEarned.toFixed(2)}`}
          subtext="lifetime yield"
        />
      </div>

      {/* Idle USDC suggestion */}
      {baseUsdc + solanaUsdc > 10 && totalSupplied === 0 && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-purple-200">
              You have ${(baseUsdc + solanaUsdc).toFixed(2)} idle USDC
            </p>
            <p className="text-xs text-purple-300/70 mt-1">
              Earn ~4-5% APY by supplying to Aave (Base) or Kamino (Solana).
            </p>
          </div>
        </div>
      )}

      {/* Chain Tabs */}
      <Tabs defaultValue="base" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="base">Base (Aave V3)</TabsTrigger>
          <TabsTrigger value="solana">Solana (Kamino)</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="mt-4">
          <ChainYieldPanel
            chainName="Base"
            protocol="Aave V3"
            supplied={aave.supplied}
            apy={aave.apy}
            earned={aave.earned}
            walletBalance={baseUsdc}
            isLoading={aave.isLoading}
            isProcessing={aave.isProcessing}
            error={aave.error}
            onSupply={aave.supply}
            onWithdraw={aave.withdraw}
          />
        </TabsContent>

        <TabsContent value="solana" className="mt-4">
          <ChainYieldPanel
            chainName="Solana"
            protocol="Kamino"
            supplied={kamino.supplied}
            apy={kamino.apy}
            earned={kamino.earned}
            walletBalance={solanaUsdc}
            isLoading={kamino.isLoading}
            isProcessing={kamino.isProcessing}
            error={kamino.error}
            onSupply={kamino.supply}
            onWithdraw={kamino.withdraw}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string;
  subtext: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-green-400' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
    </div>
  );
}

function ChainYieldPanel({
  chainName,
  protocol,
  supplied,
  apy,
  earned,
  walletBalance,
  isLoading,
  isProcessing,
  error,
  onSupply,
  onWithdraw,
}: {
  chainName: string;
  protocol: string;
  supplied: number;
  apy: number;
  earned: number;
  walletBalance: number;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  onSupply: (amount: number) => Promise<{ success: boolean; error?: string }>;
  onWithdraw: (amount: number) => Promise<{ success: boolean; error?: string }>;
}) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'supply' | 'withdraw'>('supply');

  const handleAction = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (mode === 'supply' && num > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    if (mode === 'withdraw' && num > supplied) {
      toast.error('Insufficient supplied balance');
      return;
    }

    const result = mode === 'supply' ? await onSupply(num) : await onWithdraw(num);

    if (result.success) {
      toast.success(`${mode === 'supply' ? 'Supplied' : 'Withdrew'} $${num.toFixed(2)} USDC on ${chainName}`);
      setAmount('');
    } else {
      toast.error(result.error || `${mode} failed`);
    }
  };

  const maxAmount = mode === 'supply' ? walletBalance : supplied;

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Supplied</p>
          <p className="text-lg font-semibold text-foreground">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `$${supplied.toFixed(2)}`}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">APY</p>
          <p className="text-lg font-semibold text-green-400">{apy.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Earned</p>
          <p className="text-lg font-semibold text-foreground">${earned.toFixed(4)}</p>
        </div>
      </div>

      {/* Wallet balance */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wallet className="w-3.5 h-3.5" />
        <span>{chainName} wallet: ${walletBalance.toFixed(2)} USDC</span>
      </div>

      {/* Supply/Withdraw toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'supply' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('supply')}
          className="flex-1"
        >
          <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
          Supply
        </Button>
        <Button
          variant={mode === 'withdraw' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('withdraw')}
          className="flex-1"
        >
          <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
          Withdraw
        </Button>
      </div>

      {/* Amount input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-16"
            min={0}
            step={0.01}
          />
          <button
            onClick={() => setAmount(maxAmount.toFixed(2))}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-400 hover:text-purple-300"
          >
            MAX
          </button>
        </div>
        <Button
          onClick={handleAction}
          disabled={isProcessing || !amount}
          className="min-w-[100px]"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === 'supply' ? (
            'Supply'
          ) : (
            'Withdraw'
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground/60">
        {protocol} on {chainName} — USDC supply yields are variable
      </p>
    </div>
  );
}
