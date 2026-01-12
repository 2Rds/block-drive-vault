import { createRoot } from 'react-dom/client';
import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

// Clerk publishable key (VITE_ prefix required for Vite client exposure)
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

// Optimize TBT by chunking React initialization and using scheduler
const initializeApp = () => {
  const root = createRoot(document.getElementById('root')!, {
    identifierPrefix: 'blockdrive-',
  });

  const renderApp = () => {
    root.render(
      <React.StrictMode>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      </React.StrictMode>
    );
  };

  if ('scheduler' in window && (window as any).scheduler?.postTask) {
    (window as any).scheduler.postTask(renderApp, { priority: 'user-visible' });
  } else if ('MessageChannel' in window) {
    const channel = new MessageChannel();
    channel.port2.onmessage = renderApp;
    channel.port1.postMessage(null);
  } else {
    renderApp();
  }
};

if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    requestIdleCallback(initializeApp, { timeout: 200 });
  }, { timeout: 100 });
} else {
  setTimeout(initializeApp, 150);
}
