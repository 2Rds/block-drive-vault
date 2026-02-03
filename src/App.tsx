// Buffer polyfill for Solana libraries
import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense, startTransition } from 'react';
import { ClerkAuthProvider } from '@/contexts/ClerkAuthContext';
import Index from "./pages/Index";
import { SecurityHeaders } from "./components/SecurityHeaders";
import { SecurityService } from "./services/securityService";

// Protected route component
const ClerkProtectedRoute = lazy(() => 
  import("./components/auth/ClerkProtectedRoute").then(m => ({ default: m.ClerkProtectedRoute }))
);

// Auth pages
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));

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
const Onboarding = lazy(() => import("./pages/Onboarding"));

// Optimize QueryClient for better TBT performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      networkMode: 'online'
    },
    mutations: {
      retry: 1
    }
  }
});

const App = () => {
  useEffect(() => {
    const initSecurityInChunks = () => {
      const initBasicSecurity = () => {
        startTransition(() => {
          SecurityService.validateSecurityHeaders();
        });
      };
      
      const initSessionMonitoring = () => {
        startTransition(() => {
          SecurityService.initializeSessionMonitoring();
        });
      };
      
      const initActivityMonitoring = () => {
        startTransition(() => {
          SecurityService.initializeActivityMonitoring();
        });
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(initBasicSecurity, { timeout: 500 });
        requestIdleCallback(initSessionMonitoring, { timeout: 2000 });
        requestIdleCallback(initActivityMonitoring, { timeout: 5000 });
      } else {
        setTimeout(initBasicSecurity, 100);
        setTimeout(initSessionMonitoring, 1000);
        setTimeout(initActivityMonitoring, 3000);  
      }
    };
    
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
          <Suspense
            fallback={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading application...</div>
              </div>
            }
          >
            <ClerkAuthProvider>
              <Routes>
                {/* Public pages */}
                <Route path="/" element={<Index />} />
                <Route path="/sign-in/*" element={<SignIn />} />
                <Route path="/sign-up/*" element={<SignUp />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/subscription-cancel" element={<SubscriptionCancel />} />

                {/* Onboarding - protected but separate flow */}
                <Route
                  path="/onboarding"
                  element={
                    <ClerkProtectedRoute>
                      <Onboarding />
                    </ClerkProtectedRoute>
                  }
                />

                {/* Protected pages */}
                <Route
                  path="/dashboard"
                  element={
                    <ClerkProtectedRoute>
                      <Dashboard />
                    </ClerkProtectedRoute>
                  }
                />
                <Route
                  path="/files"
                  element={
                    <ClerkProtectedRoute>
                      <IPFSFiles />
                    </ClerkProtectedRoute>
                  }
                />
                <Route
                  path="/integrations"
                  element={
                    <ClerkProtectedRoute>
                      <Integrations />
                    </ClerkProtectedRoute>
                  }
                />
                <Route
                  path="/index"
                  element={
                    <ClerkProtectedRoute>
                      <IPFSFiles />
                    </ClerkProtectedRoute>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <ClerkProtectedRoute>
                      <Account />
                    </ClerkProtectedRoute>
                  }
                />
                <Route path="/teams" element={<Teams />} />
                <Route path="/team-invitation" element={<TeamInvitation />} />
                <Route
                  path="/membership"
                  element={
                    <ClerkProtectedRoute>
                      <Membership />
                    </ClerkProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ClerkAuthProvider>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
