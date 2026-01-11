
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense, startTransition } from 'react';
import Index from "./pages/Index";
import { SecurityHeaders } from "./components/SecurityHeaders";
import { SecurityService } from "./services/securityService";

// MVP Auth Provider - simplified authentication for MVP demo
const MVPAuthProvider = lazy(() => import("./components/auth/MVPAuthProvider").then(m => ({ default: m.MVPAuthProvider })));
const MVPProtectedRoute = lazy(() => import("./components/MVPProtectedRoute").then(m => ({ default: m.MVPProtectedRoute })));

// Lazy load all non-landing pages to reduce initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const IPFSFiles = lazy(() => import("./pages/IPFSFiles"));
const Integrations = lazy(() => import("./pages/Integrations"));
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
const Membership = lazy(() => import("./pages/Membership"));

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
            {/* MVP Auth Provider - simplified authentication for demo */}
            <MVPAuthProvider>
              <Routes>
                {/* Public pages */}
                <Route path="/" element={<Index />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/subscription-cancel" element={<SubscriptionCancel />} />
                
                {/* Protected pages */}
                <Route path="/dashboard" element={
                  <MVPProtectedRoute>
                    <Dashboard />
                  </MVPProtectedRoute>
                } />
                <Route path="/files" element={
                  <MVPProtectedRoute>
                    <IPFSFiles />
                  </MVPProtectedRoute>
                } />
                <Route path="/integrations" element={
                  <MVPProtectedRoute>
                    <Integrations />
                  </MVPProtectedRoute>
                } />
                <Route path="/index" element={
                  <MVPProtectedRoute>
                    <IPFSFiles />
                  </MVPProtectedRoute>
                } />
                <Route path="/account" element={
                  <MVPProtectedRoute>
                    <Account />
                  </MVPProtectedRoute>
                } />
                <Route path="/teams" element={<Teams />} />
                <Route path="/team-invitation" element={<TeamInvitation />} />
                <Route path="/membership" element={
                  <MVPProtectedRoute>
                    <Membership />
                  </MVPProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MVPAuthProvider>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
