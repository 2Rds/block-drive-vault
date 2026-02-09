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
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/LoadingScreen";

const ClerkProtectedRoute = lazy(() =>
  import("./components/auth/ClerkProtectedRoute").then(m => ({ default: m.ClerkProtectedRoute }))
);
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
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
const TeamSettings = lazy(() => import("./pages/TeamSettings"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CreateTeamOnboarding = lazy(() => import("./pages/CreateTeamOnboarding"));

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

function App() {
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
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SecurityHeaders />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <ClerkAuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/sign-in/*" element={<SignIn />} />
                <Route path="/sign-up/*" element={<SignUp />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/subscription-cancel" element={<SubscriptionCancel />} />

                <Route
                  path="/onboarding"
                  element={
                    <ClerkProtectedRoute>
                      <Onboarding />
                    </ClerkProtectedRoute>
                  }
                />
                <Route
                  path="/onboarding/create-team"
                  element={
                    <ClerkProtectedRoute>
                      <CreateTeamOnboarding />
                    </ClerkProtectedRoute>
                  }
                />

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
                  path="/account"
                  element={
                    <ClerkProtectedRoute>
                      <Account />
                    </ClerkProtectedRoute>
                  }
                />
                <Route
                  path="/team-settings"
                  element={
                    <ClerkProtectedRoute>
                      <TeamSettings />
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
    </ErrorBoundary>
  );
}

export default App;
