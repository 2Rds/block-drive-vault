import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClerkConnectButton } from '@/components/auth/ClerkConnectButton';
import { useEffect, useRef } from 'react';

export const LandingHero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background layers */}
      <HeroBackground />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left - Copy */}
          <div>
            {/* Status badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary/20 bg-primary/[0.06] mb-10 animate-fade-in">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Programmed Incompleteness
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.05] mb-8 animate-fade-in-up">
              <span className="text-foreground">Your files.</span>
              <br />
              <span className="text-foreground">Permanently </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                incomplete.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl animate-fade-in-up delay-100">
              BlockDrive splits every file across providers with 16 critical bytes extracted and stored
              separately. Without all fragments, data is{' '}
              <span className="text-foreground font-medium">permanently unreadable</span>
              —even by us.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up delay-200">
              <ClerkConnectButton variant="hero" />
              <Button
                variant="ghost"
                size="lg"
                className="text-base px-6 py-6 group text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-border/40 hover:border-border/70 transition-all"
                onClick={() => navigate('/docs')}
              >
                Read the docs
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>

            {/* Proof points */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 animate-fade-in-up delay-300">
              {[
                { value: 'AES-256', label: 'Encryption' },
                { value: 'ZK Proofs', label: 'Verification' },
                { value: 'Solana', label: 'Powered' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-semibold text-foreground">{item.value}</span>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Animated vault visualization */}
          <div className="hidden lg:block animate-fade-in delay-200">
            <VaultVisualization />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
    </section>
  );
};

/** Animated SVG showing the file fragmentation concept */
function VaultVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Animate the fragments on mount
    const fragments = container.querySelectorAll('.vault-fragment');
    fragments.forEach((el, i) => {
      const element = el as HTMLElement;
      element.style.animationDelay = `${i * 0.12}s`;
    });
  }, []);

  return (
    <div ref={containerRef} className="relative w-full aspect-square max-w-[520px] mx-auto">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border border-border/20" />
      <div className="absolute inset-4 rounded-full border border-border/15" />
      <div
        className="absolute inset-8 rounded-full border border-primary/10"
        style={{ animation: 'vault-ring-rotate 60s linear infinite' }}
      />

      {/* Center vault icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Glow */}
          <div className="absolute -inset-8 bg-primary/10 rounded-full blur-2xl" />

          {/* Lock body */}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-card via-card to-card/80 border border-border/50 flex items-center justify-center shadow-2xl">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" fill="hsl(var(--primary))" />
            </svg>
          </div>
        </div>
      </div>

      {/* Orbiting data fragments */}
      {[
        { label: 'IPFS', color: 'from-blue-500/20 to-blue-600/10', borderColor: 'border-blue-500/30', angle: 0, radius: 42, icon: '01' },
        { label: 'R2', color: 'from-orange-500/20 to-orange-600/10', borderColor: 'border-orange-500/30', angle: 72, radius: 42, icon: '02' },
        { label: 'ZK', color: 'from-purple-500/20 to-purple-600/10', borderColor: 'border-purple-500/30', angle: 144, radius: 42, icon: '03' },
        { label: 'S3', color: 'from-emerald-500/20 to-emerald-600/10', borderColor: 'border-emerald-500/30', angle: 216, radius: 42, icon: '04' },
        { label: '16B', color: 'from-cyan-500/20 to-cyan-600/10', borderColor: 'border-cyan-400/40', angle: 288, radius: 42, icon: 'CB' },
      ].map((fragment, i) => {
        const rad = (fragment.angle * Math.PI) / 180;
        const x = 50 + fragment.radius * Math.cos(rad);
        const y = 50 + fragment.radius * Math.sin(rad);

        return (
          <div
            key={i}
            className="vault-fragment absolute flex flex-col items-center gap-1"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              animation: 'vault-block-float 4s ease-in-out infinite',
            }}
          >
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${fragment.color} border ${fragment.borderColor} flex items-center justify-center backdrop-blur-sm shadow-lg`}
            >
              <span className="font-mono text-xs font-bold text-foreground/80">{fragment.icon}</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{fragment.label}</span>
          </div>
        );
      })}

      {/* Connection lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
        {[0, 72, 144, 216, 288].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 42 * Math.cos(rad);
          const y = 50 + 42 * Math.sin(rad);
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              stroke="hsl(var(--primary))"
              strokeWidth="0.3"
              strokeDasharray="2 2"
              opacity="0.3"
              style={{ animation: 'vault-border-dash 2s linear infinite' }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/** Atmospheric background with grid, gradient, and noise */
function HeroBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 30% 20%, hsl(var(--primary) / 0.08), transparent 70%),
            radial-gradient(ellipse 60% 50% at 70% 60%, hsl(185 85% 50% / 0.05), transparent 70%),
            radial-gradient(ellipse 40% 40% at 50% 90%, hsl(280 80% 60% / 0.04), transparent)
          `,
        }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vertical gradient line accent */}
      <div
        className="absolute left-[20%] top-0 w-px h-full"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.1) 30%, hsl(var(--primary) / 0.05) 70%, transparent)',
        }}
      />
      <div
        className="absolute right-[30%] top-0 w-px h-full"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(var(--border) / 0.3) 40%, hsl(var(--border) / 0.1) 60%, transparent)',
        }}
      />
    </div>
  );
}
