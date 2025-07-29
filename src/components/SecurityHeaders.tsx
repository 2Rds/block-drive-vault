import { useEffect } from 'react';

export const SecurityHeaders = () => {
  useEffect(() => {
    // Add stricter Content Security Policy meta tag if not present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.dynamic.xyz https://*.dynamicauth.com https://widget.intercom.io https://cdn.gpteng.co;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://widget.intercom.io;
        font-src 'self' https://fonts.gstatic.com https://widget.intercom.io;
        img-src 'self' data: https: blob:;
        connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.dynamic.xyz https://*.dynamicauth.com https://dynamic-static-assets.com https://api.intercom.io https://logs.dynamicauth.com;
        frame-src 'self' https://*.dynamic.xyz https://*.dynamicauth.com https://widget.intercom.io;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
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

    // Add Permissions-Policy if not present
    if (!document.querySelector('meta[http-equiv="Permissions-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Permissions-Policy';
      meta.content = 'camera=(), microphone=(), geolocation=(), payment=()';
      document.head.appendChild(meta);
    }

    // Add Strict-Transport-Security if not present (for HTTPS)
    if (!document.querySelector('meta[http-equiv="Strict-Transport-Security"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Strict-Transport-Security';
      meta.content = 'max-age=31536000; includeSubDomains; preload';
      document.head.appendChild(meta);
    }
  }, []);

  return null;
};