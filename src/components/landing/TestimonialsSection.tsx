/** Comparison section showing how BlockDrive differs from traditional cloud storage */

const comparisons = [
  {
    category: 'Encryption',
    traditional: 'Provider holds your keys. They can read your files.',
    blockdrive: 'Wallet-derived keys. Only you can decrypt. Provider never sees plaintext.',
  },
  {
    category: 'Data Integrity',
    traditional: 'Single provider. Single point of failure.',
    blockdrive: '4 providers with automatic failover. On-chain registry for immutable audit trail.',
  },
  {
    category: 'Access Revocation',
    traditional: 'Remove permission flag. Data still readable by provider.',
    blockdrive: 'Delete 16 critical bytes. File becomes permanent garbage data everywhere.',
  },
  {
    category: 'Authentication',
    traditional: 'Email + password. Phishable. Provider controls access.',
    blockdrive: 'Dynamic SSO + Fireblocks MPC wallets. Cryptographic identity. No passwords.',
  },
  {
    category: 'Compliance',
    traditional: 'Trust the provider\'s word. Opaque infrastructure.',
    blockdrive: 'ZK proofs on Solana. Cryptographically verifiable. Open-source recovery SDK.',
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block font-mono text-xs uppercase tracking-[0.2em] text-primary mb-4">
            Comparison
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Not just another{' '}
            <span className="text-muted-foreground line-through decoration-destructive/40">cloud drive</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Traditional cloud storage trusts the provider with your keys. BlockDrive makes it
            architecturally impossible for anyone to access your data.
          </p>
        </div>

        {/* Comparison table */}
        <div className="max-w-4xl mx-auto">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-4 mb-6 px-5">
            <div className="col-span-3" />
            <div className="col-span-4">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60">
                Traditional Cloud
              </span>
            </div>
            <div className="col-span-5">
              <span className="text-xs font-mono uppercase tracking-wider text-primary">
                BlockDrive
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {comparisons.map((row) => (
              <div
                key={row.category}
                className="grid grid-cols-12 gap-4 rounded-xl border border-border/20 hover:border-border/40 bg-card/20 hover:bg-card/40 transition-all duration-300 p-5 group"
              >
                <div className="col-span-3 flex items-start">
                  <span className="text-sm font-semibold text-foreground">{row.category}</span>
                </div>
                <div className="col-span-4 flex items-start">
                  <p className="text-sm text-muted-foreground/60 leading-relaxed">{row.traditional}</p>
                </div>
                <div className="col-span-5 flex items-start gap-2.5">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{row.blockdrive}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
