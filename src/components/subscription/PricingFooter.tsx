
import React from 'react';
import { Shield, Lock, Zap } from 'lucide-react';

const guarantees = [
  {
    icon: <Shield className="w-5 h-5 text-blue-400" />,
    title: 'Breached data is worthless',
    description: 'Files never exist in complete form at any single point. Even if breached, attackers get incomplete, useless data.',
  },
  {
    icon: <Lock className="w-5 h-5 text-blue-400" />,
    title: 'Cancel anytime',
    description: 'No lock-in contracts. Your data stays yours even after cancellation.',
  },
  {
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    title: 'Permanent redundancy',
    description: 'Arweave permanent storage ensures your data can always be recovered, even in the worst case.',
  },
];

export const PricingFooter: React.FC = () => {
  return (
    <div className="mt-20">
      {/* Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
        {guarantees.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-white mb-1">{item.title}</div>
              <div className="text-xs text-zinc-500 leading-relaxed">{item.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fine print */}
      <div className="text-center space-y-2">
        <p className="text-xs text-zinc-600">
          All plans include blockchain authentication, end-to-end encryption, and Programmed Incompleteness.
          Enterprise plans include custom SLAs, dedicated account management, and SSO.
        </p>
        <p className="text-xs text-zinc-700">
          * Free trial requires payment information. Cancel before trial ends to avoid charges.
          Prices shown in USD. Crypto payments accepted via USDC.
        </p>
      </div>
    </div>
  );
};
