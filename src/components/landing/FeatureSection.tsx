import { useState } from 'react';

interface Feature {
  id: string;
  tag: string;
  title: string;
  description: string;
  details: string[];
  visual: () => JSX.Element;
}

const features: Feature[] = [
  {
    id: 'incompleteness',
    tag: 'Core Innovation',
    title: 'Programmed Incompleteness',
    description:
      'Every file is encrypted, then 16 critical bytes are extracted and stored separately with a ZK proof. Without all fragments, data is permanently unreadable.',
    details: [
      'AES-256-GCM encryption with wallet-derived keys',
      '16 critical bytes extracted before upload',
      'ZK proof commits fragment integrity on-chain',
      'No single provider ever holds a complete file',
    ],
    visual: IncompletenessVisual,
  },
  {
    id: 'revoke',
    tag: 'Unique to BlockDrive',
    title: 'Instant Revoke Sharing',
    description:
      'Share files internally with other BlockDrive users. Revoke access at any time—the critical bytes are deleted, making the file permanent garbage. External sharing requires file reconstruction.',
    details: [
      'ECDH key exchange for delegation',
      'On-chain delegation PDAs with permission levels',
      'Revoke deletes critical bytes—files become unreadable',
      'Session delegation with time-limited access',
    ],
    visual: RevokeVisual,
  },
  {
    id: 'multichain',
    tag: 'Solana',
    title: 'Embedded Wallet Authentication',
    description:
      'Dynamic handles identity and auto-creates an embedded Solana MPC wallet via Fireblocks TSS. Users can also authenticate via MetaMask or Coinbase for EVM-based sign-in.',
    details: [
      'Dynamic sign-in (email, social, passkey, or EVM wallet)',
      'Fireblocks TSS-MPC embedded Solana wallet on signup',
      'Keys derived per-file for encryption',
      'No browser extension required',
    ],
    visual: MultichainVisual,
  },
  {
    id: 'storage',
    tag: 'Multi-Provider',
    title: 'Redundant Decentralized Storage',
    description:
      'Files distributed across Filebase IPFS, Cloudflare R2, and Arweave. Automatic failover ensures 99.99% availability with zero single points of failure.',
    details: [
      'Filebase IPFS for content-addressed bulk storage',
      'Cloudflare R2 for ZK proofs and critical bytes (zero egress fees)',
      'Arweave permanent storage for critical data',
      'Automatic health checks and provider failover',
    ],
    visual: StorageVisual,
  },
];

export const FeatureSection = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const feature = features[activeFeature];

  return (
    <section id="features" className="py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-20">
          <span className="inline-block font-mono text-xs uppercase tracking-[0.2em] text-primary mb-4">
            Architecture
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Security that's{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              mathematically proven
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Not just encrypted—designed so that even if every provider is breached, what attackers find is
            incomplete, useless data. No single point holds a complete file.
          </p>
        </div>

        {/* Feature tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left - Tab list */}
          <div className="lg:col-span-5 space-y-2">
            {features.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveFeature(i)}
                className={`w-full text-left p-5 rounded-xl border transition-all duration-300 group ${
                  activeFeature === i
                    ? 'bg-card/80 border-primary/30 shadow-lg shadow-primary/5'
                    : 'bg-transparent border-border/20 hover:border-border/40 hover:bg-card/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                      activeFeature === i
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {f.tag}
                  </span>
                </div>
                <h3
                  className={`text-base font-semibold mb-1 transition-colors ${
                    activeFeature === i ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  {f.title}
                </h3>
                {activeFeature === i && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    {f.description}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Right - Visual + details */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden">
              {/* Visual */}
              <div className="p-8 lg:p-12 flex items-center justify-center min-h-[320px] border-b border-border/20">
                <feature.visual />
              </div>

              {/* Detail list */}
              <div className="p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {feature.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground leading-relaxed">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Feature Visuals ─── */

function IncompletenessVisual() {
  return (
    <div className="flex items-center gap-6">
      {/* Original file */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">FILE</span>
      </div>

      {/* Arrow */}
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-muted-foreground/40">
        <path d="M0 12H36M36 12L28 6M36 12L28 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Fragments */}
      <div className="flex flex-col gap-2">
        {[
          { label: 'ENCRYPTED', color: 'border-blue-500/30 bg-blue-500/10', w: 'w-24' },
          { label: 'ZK PROOF', color: 'border-purple-500/30 bg-purple-500/10', w: 'w-20' },
          { label: '16 BYTES', color: 'border-cyan-400/40 bg-cyan-400/10', w: 'w-12' },
        ].map((frag) => (
          <div
            key={frag.label}
            className={`h-5 ${frag.w} rounded border ${frag.color} flex items-center justify-center`}
          >
            <span className="text-[8px] font-mono uppercase tracking-wider text-foreground/60">
              {frag.label}
            </span>
          </div>
        ))}
      </div>

      {/* Arrow */}
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-muted-foreground/40">
        <path d="M0 12H36M36 12L28 6M36 12L28 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Providers */}
      <div className="flex flex-col gap-2">
        {[
          { label: 'IPFS', color: 'border-blue-500/30' },
          { label: 'R2', color: 'border-orange-500/30' },
          { label: 'VAULT', color: 'border-cyan-400/40' },
        ].map((provider) => (
          <div
            key={provider.label}
            className={`h-5 w-14 rounded border ${provider.color} bg-card/50 flex items-center justify-center`}
          >
            <span className="text-[8px] font-mono uppercase tracking-wider text-foreground/60">
              {provider.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevokeVisual() {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xs">
      {/* Shared state */}
      <div className="flex items-center gap-4 w-full">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-primary">A</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-card border border-primary/20">
            <span className="text-[8px] font-mono text-primary">DELEGATED</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-emerald-400">B</span>
        </div>
      </div>

      {/* Revoke action */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 bg-destructive/5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        <span className="text-xs font-mono text-destructive uppercase tracking-wider">Revoke Access</span>
      </div>

      {/* Revoked state */}
      <div className="flex items-center gap-4 w-full opacity-50">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-primary">A</span>
        </div>
        <div className="flex-1 h-px border-t border-dashed border-destructive/40 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-card border border-destructive/20">
            <span className="text-[8px] font-mono text-destructive">REVOKED</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-muted/30 border border-border/30 flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-muted-foreground">B</span>
        </div>
      </div>
    </div>
  );
}

function MultichainVisual() {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Dynamic auth → wallet flow */}
      <div className="flex items-center gap-3">
        <div className="px-3 py-2 rounded-lg border border-border/40 bg-card/60">
          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/70">Dynamic Auth</span>
        </div>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className="text-muted-foreground/40">
          <path d="M0 6H20M20 6L16 2M20 6L16 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div className="px-3 py-2 rounded-lg border border-primary/30 bg-primary/5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-primary">Fireblocks MPC</span>
        </div>
      </div>

      {/* Solana embedded wallet (primary) */}
      <div className="w-full max-w-xs space-y-3">
        <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-foreground/80">Solana</span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Embedded Wallet</span>
        </div>

        {/* EVM auth options (sign-in only) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Auth Only</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'MetaMask', color: 'border-orange-500/20 bg-orange-500/5' },
            { name: 'Coinbase', color: 'border-blue-500/20 bg-blue-500/5' },
          ].map((wallet) => (
            <div
              key={wallet.name}
              className={`px-3 py-2 rounded-lg ${wallet.color} border flex items-center justify-center`}
            >
              <span className="text-[10px] font-mono font-medium text-foreground/50">{wallet.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StorageVisual() {
  const providers = [
    { name: 'Filebase', role: 'IPFS Primary', pct: 70, color: 'bg-blue-500' },
    { name: 'Cloudflare R2', role: 'ZK Proofs', pct: 15, color: 'bg-orange-500' },
    { name: 'S3', role: 'Backup', pct: 10, color: 'bg-emerald-500' },
    { name: 'Arweave', role: 'Permanent', pct: 5, color: 'bg-purple-500' },
  ];

  return (
    <div className="w-full max-w-sm space-y-5">
      {providers.map((p) => (
        <div key={p.name} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${p.color}`} />
              <span className="text-sm font-medium text-foreground">{p.name}</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{p.role}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full rounded-full ${p.color} opacity-60`}
              style={{ width: `${p.pct}%`, transition: 'width 1s ease-out' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
