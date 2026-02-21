import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@/components/auth/ConnectButton';

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% 50%, hsl(var(--primary) / 0.06), transparent 70%)
            `,
          }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-8">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
          Don't just store your data.
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Finally own it.
          </span>
        </h2>

        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
          Start with a 7-day free trial on Pro, then $15/mo.
          Your files are encrypted with wallet-derived keys from the first upload.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <ConnectButton variant="hero" />
          <Button
            variant="ghost"
            size="lg"
            className="text-base px-6 py-6 group text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-border/40 hover:border-border/70 transition-all"
            onClick={() => navigate('/pricing')}
          >
            View pricing
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>

        {/* Pricing teaser */}
        <div className="inline-flex items-center gap-6 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">Pro</span> $15/mo for 1TB
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>
            <span className="font-semibold text-foreground">Scale</span> $29/seat for 2TB
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>
            <span className="font-semibold text-foreground">Enterprise</span> 100+ seats
          </span>
        </div>
      </div>
    </section>
  );
};
