import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@/components/auth/ConnectButton';
import { useState, useEffect } from 'react';

export const LandingNavigation = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-lg shadow-black/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <img
              src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png"
              alt="BlockDrive"
              className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <span className="font-display text-lg font-semibold tracking-wider text-foreground">
              BLOCKDRIVE
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Security', href: '#security' },
              { label: 'Pricing', href: '/pricing', isRoute: true },
              { label: 'Docs', href: '/docs', isRoute: true },
            ].map((link) => (
              <button
                key={link.label}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/[0.04]"
                onClick={() => {
                  if (link.isRoute) {
                    navigate(link.href);
                  } else {
                    document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <ConnectButton />
            </div>

            {/* Mobile menu button */}
            <button
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                {mobileOpen ? (
                  <path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
                ) : (
                  <>
                    <path d="M3 6H17" strokeLinecap="round" />
                    <path d="M3 10H17" strokeLinecap="round" />
                    <path d="M3 14H17" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border/30 px-6 py-4 space-y-1">
          {[
            { label: 'Features', href: '#features' },
            { label: 'Security', href: '#security' },
            { label: 'Pricing', href: '/pricing', isRoute: true },
            { label: 'Docs', href: '/docs', isRoute: true },
          ].map((link) => (
            <button
              key={link.label}
              className="block w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/[0.04] transition-colors"
              onClick={() => {
                setMobileOpen(false);
                if (link.isRoute) navigate(link.href);
                else document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-border/30">
            <ConnectButton />
          </div>
        </div>
      )}
    </nav>
  );
};
