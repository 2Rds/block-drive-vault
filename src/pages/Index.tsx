import { lazy, Suspense, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LandingNavigation } from '@/components/landing/LandingNavigation';
import { LandingHero } from '@/components/landing/LandingHero';

const FeatureSection = lazy(() =>
  import('@/components/landing/FeatureSection').then(m => ({ default: m.FeatureSection }))
);
const StatsSection = lazy(() =>
  import('@/components/landing/StatsSection').then(m => ({ default: m.StatsSection }))
);
const PlatformShowcase = lazy(() =>
  import('@/components/landing/PlatformShowcase').then(m => ({ default: m.PlatformShowcase }))
);
const TestimonialsSection = lazy(() =>
  import('@/components/landing/TestimonialsSection').then(m => ({ default: m.TestimonialsSection }))
);
const CTASection = lazy(() =>
  import('@/components/landing/CTASection').then(m => ({ default: m.CTASection }))
);

const LAZY_CONTENT_STYLE = {
  contentVisibility: 'auto' as const,
  containIntrinsicSize: '1000px',
};

function Index(): JSX.Element {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <LandingNavigation />

      <div className="pt-16">
        <LandingHero />
        <Suspense fallback={<div className="h-24" />}>
          <div style={LAZY_CONTENT_STYLE}>
            <StatsSection />
            <FeatureSection />
            <PlatformShowcase />
            <TestimonialsSection />
            <CTASection />
          </div>
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-16 bg-card/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Brand */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png"
                  alt="BlockDrive Logo"
                  className="w-7 h-7 object-contain"
                />
                <span className="font-display text-base font-semibold tracking-wider text-foreground">
                  BLOCKDRIVE
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
                Secure data management through Programmed Incompleteness.
                Even if breached, your data is incomplete and worthless.
              </p>
              <div className="text-xs text-muted-foreground/50">
                &copy; {new Date().getFullYear()} BlockDrive. All rights reserved.
              </div>
            </div>

            {/* Links */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-foreground mb-4">Product</h4>
              <div className="space-y-2.5">
                <FooterLink label="Features" href="#features" />
                <FooterLink label="Pricing" to="/pricing" />
                <FooterLink label="Documentation" to="/docs" />
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-foreground mb-4">Security</h4>
              <div className="space-y-2.5">
                <FooterLink label="Architecture" to="/docs" />
                <FooterLink label="ZK Proofs" to="/docs" />
                <FooterLink label="Recovery SDK" to="/docs" />
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-foreground mb-4">Company</h4>
              <div className="space-y-2.5">
                <FooterLink label="About" href="#" />
                <FooterLink label="Blog" href="#" />
                <FooterLink label="Careers" href="#" />
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-foreground mb-4">Legal</h4>
              <div className="space-y-2.5">
                <FooterLink label="Terms of Service" to="/terms-of-service" />
                <FooterLink label="Privacy Policy" to="/privacy-policy" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterLink({ label, to, href }: { label: string; to?: string; href?: string }) {
  if (to) {
    return (
      <div>
        <Link
          to={to}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          {label}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <a
        href={href || '#'}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        onClick={(e) => {
          if (href?.startsWith('#')) {
            e.preventDefault();
            document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        {label}
      </a>
    </div>
  );
}

export default Index;
