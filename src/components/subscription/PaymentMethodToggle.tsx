import React from 'react';
import { CreditCard, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'fiat' | 'crypto';

interface PaymentMethodToggleProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  walletConnected?: boolean;
  walletBalance?: number;
  disabled?: boolean;
}

export const PaymentMethodToggle: React.FC<PaymentMethodToggleProps> = ({
  selected,
  onSelect,
  walletConnected = false,
  walletBalance,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-400">Payment Method</label>
      <div className="flex gap-2 p-1 bg-gray-800/60 rounded-lg">
        {/* Fiat Option */}
        <button
          type="button"
          onClick={() => onSelect('fiat')}
          disabled={disabled}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all',
            'text-sm font-medium',
            selected === 'fiat'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <CreditCard className="w-4 h-4" />
          <span>Card / Bank</span>
        </button>

        {/* Crypto Option */}
        <button
          type="button"
          onClick={() => onSelect('crypto')}
          disabled={disabled}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all',
            'text-sm font-medium',
            selected === 'crypto'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Wallet className="w-4 h-4" />
          <span>USDC</span>
          {selected === 'crypto' && walletConnected && walletBalance !== undefined && (
            <span className="text-xs opacity-80">(${walletBalance.toFixed(2)})</span>
          )}
        </button>
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-500">
        {selected === 'fiat' ? (
          'Pay with credit card, debit card, or bank transfer via Stripe'
        ) : (
          <>
            Pay with USDC from your embedded wallet
            {!walletConnected && ' (wallet will be created automatically)'}
          </>
        )}
      </p>

      {/* Crypto info */}
      {selected === 'crypto' && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
          Pay directly from your embedded Solana wallet
        </div>
      )}
    </div>
  );
};

export default PaymentMethodToggle;
