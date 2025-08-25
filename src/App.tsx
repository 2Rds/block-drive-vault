
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense, startTransition } from 'react';
import Index from "./pages/Index";
import { SimplifiedAuthProvider } from "./components/auth/SimplifiedAuthProvider";
import { DynamicProviderWrapper } from "./components/auth/DynamicProviderWrapper";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SecurityHeaders } from "./components/SecurityHeaders";
import { SecurityService } from "./services/securityService";

// Lazy load non-critical pages to reduce initial bundle size
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

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Defer security monitoring initialization to avoid blocking main thread
    // Use requestIdleCallback for better FID performance
    const initSecurity = () => {
      startTransition(() => {
        SecurityService.initializeSecurityMonitoring();
      });
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initSecurity, { timeout: 1000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(initSecurity, 100);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SecurityHeaders />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DynamicProviderWrapper>
            <SimplifiedAuthProvider>
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading...</div>
              </div>}>
                <Routes>
                  <Route path="/" element={<Index />} />
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
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
