
import React, { useEffect, startTransition, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { LandingNavigation } from '@/components/landing/LandingNavigation';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { PlatformShowcase } from '@/components/landing/PlatformShowcase';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';

const Index = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { user: dynamicUser, primaryWallet } = useDynamicContext();

  // Memoize authentication status to avoid unnecessary recalculations
  const isAuthenticated = useMemo(() => {
    return !!(user && session && dynamicUser && primaryWallet);
  }, [user, session, dynamicUser, primaryWallet]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    console.log('🏠 Index page - checking auth status:', {
      hasUser: !!user,
      hasSession: !!session,
      hasDynamicUser: !!dynamicUser,
      hasPrimaryWallet: !!primaryWallet,
      isAuthenticated
    });

    if (isAuthenticated) {
      console.log('🚀 User is authenticated, redirecting to dashboard...');
      // Use startTransition to avoid blocking user interactions
      startTransition(() => {
        navigate('/dashboard', { replace: true });
      });
    }
  }, [isAuthenticated, navigate]);
  return (
    <div className="min-h-screen bg-background">
      <LandingNavigation />
      
      {/* Add padding top to account for fixed navigation */}
      <div className="pt-16">
        <LandingHero />
        <div style={{ contentVisibility: 'auto', containIntrinsicSize: '1000px' }}>
          <StatsSection />
          <FeatureSection />
          <PlatformShowcase />
          <TestimonialsSection />
          <CTASection />
        </div>
      </div>
      
      {/* Footer */}
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
                The ultimate Web3 data management platform. Store, secure, and scale 
                your decentralized applications with enterprise-grade infrastructure.
              </p>
              <div className="text-sm text-muted-foreground">
                © 2025 BlockDrive. All rights reserved.
              </div>
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
};

export default Index;
