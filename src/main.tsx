import { createRoot } from 'react-dom/client';
import React from 'react';
import { DynamicProvider } from './providers/DynamicProvider';
import App from './App.tsx';
import './index.css';

/**
 * Render the /verify page standalone — no auth provider needed.
 * This allows QR-scanned mobile users to complete biometric verification
 * without having an auth session on their phone.
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
  // These devices don't have an auth session, so render it standalone.
  if (window.location.pathname === '/verify') {
    return renderStandaloneVerify();
  }

  const root = createRoot(document.getElementById('root')!, {
    identifierPrefix: 'blockdrive-',
  });

  root.render(
    <React.StrictMode>
      <DynamicProvider>
        <App />
      </DynamicProvider>
    </React.StrictMode>
  );
};

initializeApp().catch((e) => {
  const msg = e instanceof Error ? e.message : 'Unknown error';
  const root = createRoot(document.getElementById('root')!, {
    identifierPrefix: 'blockdrive-',
  });
  root.render(
    <React.StrictMode>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">Configuration Error</h1>
          <p className="text-muted-foreground">{msg}</p>
        </div>
      </div>
    </React.StrictMode>
  );
});
