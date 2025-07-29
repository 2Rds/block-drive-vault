import { useEffect } from 'react';

export const SecurityHeaders = () => {
  useEffect(() => {
    // Add Content Security Policy meta tag if not present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.dynamic.xyz;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https: blob:;
        connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.dynamic.xyz;
        frame-src 'self' https://*.dynamic.xyz;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim();
      document.head.appendChild(meta);
    }

    // Add X-Frame-Options if not present
    if (!document.querySelector('meta[http-equiv="X-Frame-Options"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'X-Frame-Options';
      meta.content = 'DENY';
      document.head.appendChild(meta);
    }

    // Add X-Content-Type-Options if not present
    if (!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'X-Content-Type-Options';
      meta.content = 'nosniff';
      document.head.appendChild(meta);
    }

    // Add Referrer-Policy if not present
    if (!document.querySelector('meta[name="referrer"]')) {
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(meta);
    }
  }, []);

  return null;
};