import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense, startTransition } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { ClerkAuthProvider } from '@/contexts/ClerkAuthContext';
import Index from "./pages/Index";
import { SecurityHeaders } from "./components/SecurityHeaders";
import { SecurityService } from "./services/securityService";

// Clerk publishable key - must be a publishable key (pk_test_* or pk_live_*), NOT a secret key
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// If the key is missing/placeholder/invalid, ClerkProvider will throw and blank-screen the app.
// Guard early and render a friendly configuration screen instead.
const isClerkKeyConfigured =
  typeof CLERK_PUBLISHABLE_KEY === "string" &&
  CLERK_PUBLISHABLE_KEY.startsWith("pk_") &&
  !CLERK_PUBLISHABLE_KEY.includes("YOUR_CLERK_PUBLISHABLE_KEY_HERE");

if (!CLERK_PUBLISHABLE_KEY) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

if (CLERK_PUBLISHABLE_KEY && !CLERK_PUBLISHABLE_KEY.startsWith('pk_')) {
  console.error("Invalid Clerk key format. Must be a publishable key starting with 'pk_', not a secret key.");
}

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

  if (!isClerkKeyConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">Clerk not configured</h1>
          <p className="text-muted-foreground">
            Your app is using a placeholder or invalid Clerk publishable key, so Clerk crashes at boot.
            Add a real key from{" "}
            <a
              className="underline"
              href="https://dashboard.clerk.com/last-active?path=api-keys"
              target="_blank"
              rel="noreferrer"
            >
              Clerk → API keys
            </a>
            .
          </p>
          <div className="rounded-md border p-3 text-sm text-foreground">
            <div className="font-medium">Current value:</div>
            <div className="mt-1 break-all font-mono">
              {CLERK_PUBLISHABLE_KEY || "(missing)"}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: this value must be available to the frontend as a Vite env var (VITE_*). Updating backend
            secrets alone won’t fix the client bundle unless it’s wired into the build.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
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
    </ClerkProvider>
  );
};

export default App;
