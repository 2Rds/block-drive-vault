
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from 'react';
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import IPFSFiles from "./pages/IPFSFiles";
import Docs from "./pages/Docs";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import Teams from "./pages/Teams";
import TeamInvitation from "./pages/TeamInvitation";
import { SimplifiedAuthProvider } from "./components/auth/SimplifiedAuthProvider";
import { DynamicProviderWrapper } from "./components/auth/DynamicProviderWrapper";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SecurityHeaders } from "./components/SecurityHeaders";
import { SecurityService } from "./services/securityService";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize security monitoring on app start
    SecurityService.initializeSecurityMonitoring();
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
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/pricing" element={<Pricing />} />
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
            </SimplifiedAuthProvider>
          </DynamicProviderWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
