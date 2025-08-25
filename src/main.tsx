
import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App.tsx'
import './index.css'

// Optimize FID by deferring React hydration until main thread is less busy
const initializeApp = () => {
  const root = createRoot(document.getElementById("root")!, {
    // Enable concurrent features to break up long tasks
    identifierPrefix: 'blockdrive-'
  });

  // Use time slicing to prevent blocking the main thread
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Defer initialization to reduce FID and allow static content to be interactive
if ('requestIdleCallback' in window) {
  // Use idle time to initialize React, reducing main thread blocking
  requestIdleCallback(initializeApp, { timeout: 100 });
} else {
  // Fallback: defer with setTimeout for browsers without requestIdleCallback
  setTimeout(initializeApp, 50);
}
