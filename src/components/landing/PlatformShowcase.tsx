import { useState } from 'react';

const steps = [
  {
    number: '01',
    title: 'Sign up with Clerk',
    description: 'Email, social login, or SSO. Crossmint auto-creates an embedded Solana MPC wallet automatically.',
    mockContent: SignupMock,
  },
  {
    number: '02',
    title: 'Upload & encrypt',
    description: 'Drag files in. AES-256 encrypts with wallet-derived keys. 16 critical bytes extracted. ZK proof generated.',
    mockContent: UploadMock,
  },
  {
    number: '03',
    title: 'Distribute across providers',
    description: 'Encrypted content → IPFS via Filebase. Critical bytes + ZK proof → Cloudflare R2. On-chain registry updated.',
    mockContent: DistributeMock,
  },
  {
    number: '04',
    title: 'Share & revoke instantly',
    description: 'Share internally with other BlockDrive users via ECDH key exchange. Revoke access anytime—critical bytes deleted, file becomes permanent garbage. External sharing requires file reconstruction.',
    mockContent: ShareMock,
  },
];

export const PlatformShowcase = () => {
  const [activeStep, setActiveStep] = useState(0);
  const StepContent = steps[activeStep].mockContent;

  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="inline-block font-mono text-xs uppercase tracking-[0.2em] text-primary mb-4">
            How it works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Four steps to{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              unbreakable storage
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Steps */}
          <div className="lg:col-span-4 space-y-1">
            {steps.map((step, i) => (
              <button
                key={step.number}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left p-5 rounded-xl transition-all duration-300 group border ${
                  activeStep === i
                    ? 'bg-card/60 border-border/40'
                    : 'bg-transparent border-transparent hover:bg-card/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`font-mono text-sm font-bold transition-colors ${
                      activeStep === i ? 'text-primary' : 'text-muted-foreground/40'
                    }`}
                  >
                    {step.number}
                  </span>
                  <div>
                    <h3
                      className={`text-sm font-semibold mb-1 transition-colors ${
                        activeStep === i ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    >
                      {step.title}
                    </h3>
                    {activeStep === i && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/20 bg-card/40">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-muted/30 text-[10px] font-mono text-muted-foreground">
                    app.blockdrive.xyz
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 lg:p-12 min-h-[360px] flex items-center justify-center">
                <StepContent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Step Mocks ─── */

function SignupMock() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-5">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <img
            src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png"
            alt=""
            className="w-6 h-6 object-contain"
          />
        </div>
        <h4 className="text-lg font-semibold text-foreground">Welcome to BlockDrive</h4>
        <p className="text-xs text-muted-foreground">Sign up to get your encrypted vault</p>
      </div>

      {/* Mock form */}
      <div className="space-y-3">
        <div className="h-10 rounded-lg border border-border/40 bg-muted/20 px-3 flex items-center">
          <span className="text-sm text-muted-foreground">you@company.com</span>
        </div>
        <div className="h-10 rounded-lg bg-primary/90 flex items-center justify-center">
          <span className="text-sm font-medium text-primary-foreground">Continue with Email</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[10px] text-muted-foreground uppercase">or</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-lg border border-border/40 bg-muted/10 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Google</span>
          </div>
          <div className="h-10 rounded-lg border border-border/40 bg-muted/10 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">GitHub</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <span className="text-[10px] text-muted-foreground/60">
          Powered by Clerk + Crossmint embedded wallets
        </span>
      </div>
    </div>
  );
}

function UploadMock() {
  return (
    <div className="w-full max-w-md space-y-4">
      {/* Upload zone */}
      <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center bg-primary/[0.02]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" className="mx-auto mb-3 opacity-60">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-sm text-muted-foreground">Drag files or click to upload</p>
      </div>

      {/* Processing file */}
      <div className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <span className="text-[10px] font-mono text-blue-400">PDF</span>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">contract_v2.pdf</div>
              <div className="text-[10px] text-muted-foreground">4.2 MB</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Encrypting...</span>
        </div>

        {/* Progress phases */}
        <div className="space-y-1.5">
          {[
            { label: 'AES-256 encryption', done: true },
            { label: 'Extract 16 critical bytes', done: true },
            { label: 'Generate ZK proof', active: true },
            { label: 'Upload to IPFS', done: false },
          ].map((phase) => (
            <div key={phase.label} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full flex items-center justify-center ${
                  phase.done
                    ? 'bg-emerald-500/20 border border-emerald-500/40'
                    : phase.active
                      ? 'bg-primary/20 border border-primary/40'
                      : 'bg-muted/20 border border-border/30'
                }`}
              >
                {phase.done && (
                  <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="rgb(52, 211, 153)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                {phase.active && <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />}
              </div>
              <span className={`text-[11px] ${phase.done ? 'text-muted-foreground' : phase.active ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                {phase.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DistributeMock() {
  return (
    <div className="w-full max-w-lg">
      <div className="grid grid-cols-4 gap-3">
        {[
          { name: 'Filebase IPFS', role: 'Encrypted content', size: '4.18 MB', color: 'border-blue-500/30 bg-blue-500/5', status: 'Pinned' },
          { name: 'Cloudflare R2', role: 'ZK proof + 16 bytes', size: '2.1 KB', color: 'border-orange-500/30 bg-orange-500/5', status: 'Stored' },
          { name: 'S3 Backup', role: 'Redundancy copy', size: '4.18 MB', color: 'border-emerald-500/30 bg-emerald-500/5', status: 'Synced' },
          { name: 'Solana', role: 'On-chain registry', size: '406 B', color: 'border-purple-500/30 bg-purple-500/5', status: 'Committed' },
        ].map((provider) => (
          <div key={provider.name} className={`rounded-xl border ${provider.color} p-4 space-y-3`}>
            <div>
              <div className="text-xs font-semibold text-foreground">{provider.name}</div>
              <div className="text-[10px] text-muted-foreground">{provider.role}</div>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">{provider.size}</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400">{provider.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareMock() {
  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="rounded-xl border border-border/30 bg-card/40 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Share "contract_v2.pdf"</h4>

        {/* Search */}
        <div className="h-9 rounded-lg border border-border/40 bg-muted/20 px-3 flex items-center">
          <span className="text-xs text-muted-foreground">Search by email or wallet...</span>
        </div>

        {/* Shared with */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Shared with</span>

          {[
            { name: 'sarah@team.co', perm: 'View', color: 'bg-blue-500' },
            { name: 'marcus@team.co', perm: 'Edit', color: 'bg-emerald-500' },
          ].map((user) => (
            <div key={user.name} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-full ${user.color}/20 flex items-center justify-center`}>
                  <span className="text-[10px] font-bold text-foreground/60">{user.name[0].toUpperCase()}</span>
                </div>
                <span className="text-xs text-foreground">{user.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{user.perm}</span>
                <button className="text-[10px] text-destructive/60 hover:text-destructive font-mono uppercase tracking-wider">
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <span className="text-[10px] text-muted-foreground/60">
          Revoke deletes critical 16 bytes — file becomes permanent garbage
        </span>
      </div>
    </div>
  );
}
