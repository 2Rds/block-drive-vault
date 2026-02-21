// Buffer polyfill for Solana libraries
import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// QueryClientProvider is in DynamicProvider.tsx (must wrap WagmiProvider)
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense, startTransition } from 'react';
import { DynamicAuthProvider } from '@/contexts/DynamicAuthContext';
import Index from "./pages/Index";
import { SecurityHeaders } from "./components/SecurityHeaders";
import { SecurityService } from "./services/securityService";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/LoadingScreen";

const ProtectedRoute = lazy(() =>
  import("./components/auth/ProtectedRoute").then(m => ({ default: m.ProtectedRoute }))
);
const SignIn = lazy(() => import("./pages/DynamicSignIn"));
const SignUp = lazy(() => import("./pages/DynamicSignUp"));
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
const WebAuthnMobileVerify = lazy(() => import("./pages/WebAuthnMobileVerify"));

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
      <TooltipProvider>
        <SecurityHeaders />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <DynamicAuthProvider>
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
                <Route path="/verify" element={<WebAuthnMobileVerify />} />

                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/onboarding/create-team"
                  element={
                    <ProtectedRoute>
                      <CreateTeamOnboarding />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/files"
                  element={
                    <ProtectedRoute>
                      <IPFSFiles />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute>
                      <Integrations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <Account />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team-settings"
                  element={
                    <ProtectedRoute>
                      <TeamSettings />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </DynamicAuthProvider>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
