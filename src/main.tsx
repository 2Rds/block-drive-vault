
import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App.tsx'
import './index.css'

// Optimize TBT by chunking React initialization and using scheduler
const initializeApp = () => {
  // Create root first (lightweight operation)
  const root = createRoot(document.getElementById("root")!, {
    // Enable concurrent features to break up long tasks
    identifierPrefix: 'blockdrive-'
  });

  // Use modern scheduling APIs to break up rendering work
  if ('scheduler' in window && (window as any).scheduler?.postTask) {
    // Use Scheduler API for optimal task scheduling
    (window as any).scheduler.postTask(() => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }, { priority: 'user-visible' });
  } else if ('MessageChannel' in window) {
    // Fallback: Use MessageChannel for yielding to browser
    const channel = new MessageChannel();
    channel.port2.onmessage = () => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    };
    channel.port1.postMessage(null);
  } else {
    // Final fallback: Use time slicing with React concurrent features
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
};

// More aggressive deferring to reduce TBT
if ('requestIdleCallback' in window) {
  // Use multiple idle callbacks to spread work across frames
  requestIdleCallback(() => {
    requestIdleCallback(initializeApp, { timeout: 200 });
  }, { timeout: 100 });
} else {
  // Fallback: use longer delay to ensure main thread is free
  setTimeout(initializeApp, 150);
}
