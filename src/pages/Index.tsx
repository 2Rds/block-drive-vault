import { lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
const CTASection = lazy(() =>
  import('@/components/landing/CTASection').then(m => ({ default: m.CTASection }))
);

const LAZY_CONTENT_STYLE = {
  contentVisibility: 'auto' as const,
  containIntrinsicSize: '1000px',
};

function LoadingFallback(): JSX.Element {
  return (
    <div className="h-24 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

function Index(): JSX.Element {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LandingNavigation />

      <div className="pt-16">
        <LandingHero />
        <Suspense fallback={<LoadingFallback />}>
          <div style={LAZY_CONTENT_STYLE}>
            <FeatureSection />
            <StatsSection />
            <PlatformShowcase />
            <CTASection />
          </div>
        </Suspense>
      </div>

      <footer className="bg-card/50 border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png"
                  alt="BlockDrive Logo"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold text-foreground">BlockDrive</span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-md">
                The ultimate data privacy ecosystem. Store, secure, and scale with proprietary enterprise-grade infrastructure.
              </p>
              <div className="text-sm text-muted-foreground">2025 BlockDrive. All rights reserved.</div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Features</div>
                <div>Pricing</div>
                <div>Documentation</div>
                <div>API Reference</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="cursor-pointer hover:text-foreground transition-colors">About</div>
                <div className="cursor-pointer hover:text-foreground transition-colors">Blog</div>
                <div className="cursor-pointer hover:text-foreground transition-colors">Careers</div>
                <div className="cursor-pointer hover:text-foreground transition-colors">Contact</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => navigate('/terms-of-service')}
                >
                  Terms of Service
                </div>
                <div
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => navigate('/privacy-policy')}
                >
                  Privacy Policy
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Index;