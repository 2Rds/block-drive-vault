import { createRoot } from 'react-dom/client';
import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { CrossmintProvider } from './providers/CrossmintProvider';
import { clerkAppearanceDeep as clerkAppearance } from './lib/clerkTheme';
import App from './App.tsx';
import './index.css';

// Prefer build-time env var, but fall back to runtime retrieval from an Edge Function.
// This prevents a hard blank-screen when the bundled env var is still the placeholder.
const BUILD_TIME_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const isValidClerkPublishableKey = (key?: string) =>
  typeof key === 'string' &&
  key.startsWith('pk_') &&
  !key.includes('YOUR_CLERK_PUBLISHABLE_KEY_HERE');

async function getClerkPublishableKey(): Promise<string> {
  if (isValidClerkPublishableKey(BUILD_TIME_KEY)) return BUILD_TIME_KEY!;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase env vars required to fetch Clerk key');
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-clerk-publishable-key`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  const json = await res.json().catch(() => ({}));
  const key = (json as any)?.publishableKey as string | undefined;

  if (!res.ok) {
    throw new Error((json as any)?.error || 'Failed to fetch Clerk publishable key');
  }

  if (!isValidClerkPublishableKey(key)) {
    throw new Error('Fetched Clerk publishable key is invalid');
  }

  return key;
}

const renderConfigError = (message: string) => {
  const root = createRoot(document.getElementById('root')!, {
    identifierPrefix: 'blockdrive-',
  });

  root.render(
    <React.StrictMode>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">Clerk not configured</h1>
          <p className="text-muted-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">
            Set <span className="font-mono">VITE_CLERK_PUBLISHABLE_KEY</span> to your real key from Clerk.
          </p>
        </div>
      </div>
    </React.StrictMode>
  );
};

/**
 * Render the /verify page standalone — no ClerkProvider needed.
 * This allows QR-scanned mobile users to complete biometric verification
 * without having a Clerk session on their phone.
 */
async function renderStandaloneVerify() {
  const { BrowserRouter, Routes, Route } = await import('react-router-dom');
  const { default: WebAuthnMobileVerify } = await import('./pages/WebAuthnMobileVerify');
  const { StandaloneAuthProvider } = await import('./contexts/StandaloneAuthProvider');

  const root = createRoot(document.getElementById('root')!, {
    identifierPrefix: 'blockdrive-',
  });

  root.render(
    <React.StrictMode>
      <StandaloneAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/verify" element={<WebAuthnMobileVerify />} />
          </Routes>
        </BrowserRouter>
      </StandaloneAuthProvider>
    </React.StrictMode>
  );
}

const initializeApp = async () => {
  // The /verify page is used by mobile devices scanning QR codes.
  // These devices don't have a Clerk session, so render it standalone.
  if (window.location.pathname === '/verify') {
    return renderStandaloneVerify();
  }

  const publishableKey = await getClerkPublishableKey();

  const root = createRoot(document.getElementById('root')!, {
    identifierPrefix: 'blockdrive-',
  });

  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" appearance={clerkAppearance}>
        <CrossmintProvider>
          <App />
        </CrossmintProvider>
      </ClerkProvider>
    </React.StrictMode>
  );
};

initializeApp().catch((e) => {
  const msg = e instanceof Error ? e.message : 'Unknown error';
  renderConfigError(msg);
});
