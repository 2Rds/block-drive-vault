
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense, startTransition } from 'react';
import Index from "./pages/Index";
import { SecurityHeaders } from "./components/SecurityHeaders";
import { SecurityService } from "./services/securityService";

// Lazy load all auth providers to reduce initial bundle size
// These are heavy libraries that aren't needed for landing page
const SimplifiedAuthProvider = lazy(() => import("./components/auth/SimplifiedAuthProvider").then(m => ({ default: m.SimplifiedAuthProvider })));
const DynamicProviderWrapper = lazy(() => import("./components/auth/DynamicProviderWrapper").then(m => ({ default: m.DynamicProviderWrapper })));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute").then(m => ({ default: m.ProtectedRoute })));

// Lazy load all non-landing pages to reduce initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const IPFSFiles = lazy(() => import("./pages/IPFSFiles"));
const Docs = lazy(() => import("./pages/Docs"));
const Account = lazy(() => import("./pages/Account"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TermsOfService = lazy(() => import("./pages/TermsOfService").then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const Pricing = lazy(() => import("./pages/Pricing"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const SubscriptionCancel = lazy(() => import("./pages/SubscriptionCancel"));
const Teams = lazy(() => import("./pages/Teams"));
const TeamInvitation = lazy(() => import("./pages/TeamInvitation"));

// Optimize QueryClient for better TBT performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce background refetching to prevent blocking
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Use smaller batch sizes to prevent blocking
      networkMode: 'online'
    },
    mutations: {
      // Don't retry mutations aggressively to reduce TBT
      retry: 1
    }
  }
});

const App = () => {
  useEffect(() => {
    // Aggressively defer security monitoring to prevent TBT
    // Use multiple idle callbacks to break up the work
    const initSecurityInChunks = () => {
      // First chunk: just basic header validation
      const initBasicSecurity = () => {
        startTransition(() => {
          SecurityService.validateSecurityHeaders();
        });
      };
      
      // Second chunk: session monitoring (defer more)
      const initSessionMonitoring = () => {
        startTransition(() => {
          SecurityService.initializeSessionMonitoring();
        });
      };
      
      // Third chunk: activity monitoring (defer most)
      const initActivityMonitoring = () => {
        startTransition(() => {
          SecurityService.initializeActivityMonitoring();
        });
      };
      
      if ('requestIdleCallback' in window) {
        // Spread initialization across multiple idle periods
        requestIdleCallback(initBasicSecurity, { timeout: 500 });
        requestIdleCallback(initSessionMonitoring, { timeout: 2000 });
        requestIdleCallback(initActivityMonitoring, { timeout: 5000 });
      } else {
        // Fallback with increased delays
        setTimeout(initBasicSecurity, 100);
        setTimeout(initSessionMonitoring, 1000);
        setTimeout(initActivityMonitoring, 3000);  
      }
    };
    
    // Defer the entire initialization even further
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initSecurityInChunks, { timeout: 2000 });
    } else {
      setTimeout(initSecurityInChunks, 1000);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SecurityHeaders />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="text-foreground">Loading application...</div>
            </div>
          }>
            <Routes>
              {/* Landing page loads immediately without auth providers */}
              <Route path="/" element={<Index />} />
              
              {/* All other routes wrapped with lazy-loaded auth providers */}
              <Route path="/*" element={
                <DynamicProviderWrapper>
                  <SimplifiedAuthProvider>
                    <Suspense fallback={
                      <div className="min-h-screen bg-background flex items-center justify-center">
                        <div className="text-foreground">Loading...</div>
                      </div>
                    }>
                      <Routes>
                        <Route path="/docs" element={<Docs />} />
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/terms-of-service" element={<TermsOfService />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                        <Route path="/subscription-cancel" element={<SubscriptionCancel />} />
                        <Route path="/dashboard" element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        } />
                        <Route path="/files" element={
                          <ProtectedRoute>
                            <IPFSFiles />
                          </ProtectedRoute>
                        } />
                        <Route path="/index" element={
                          <ProtectedRoute>
                            <IPFSFiles />
                          </ProtectedRoute>
                        } />
                        <Route path="/account" element={
                          <ProtectedRoute>
                            <Account />
                          </ProtectedRoute>
                        } />
                        <Route path="/teams" element={<Teams />} />
                        <Route path="/team-invitation" element={<TeamInvitation />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </SimplifiedAuthProvider>
                </DynamicProviderWrapper>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
