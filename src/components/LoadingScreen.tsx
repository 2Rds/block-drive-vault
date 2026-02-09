/**
 * Full-screen loading screen with animated BlockDrive logo.
 * Used as Suspense fallback and auth loading state.
 */

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0b]">
      {/* Subtle radial glow behind logo */}
      <div
        className="absolute"
        style={{
          width: 280,
          height: 280,
          background: 'radial-gradient(circle, hsl(210 60% 50% / 0.08) 0%, transparent 70%)',
          animation: 'loading-glow 2.4s ease-in-out infinite',
        }}
      />

      {/* Logo with breathing animation */}
      <img
        src="/logo-black.png"
        alt="BlockDrive"
        width={72}
        height={72}
        className="relative select-none"
        draggable={false}
        style={{
          animation: 'loading-breathe 2.4s ease-in-out infinite',
        }}
      />

      {/* Animated dots bar */}
      <div className="flex items-center gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/20"
            style={{
              animation: 'loading-dot 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>

      {/* Optional message */}
      {message && (
        <p className="mt-5 text-xs font-mono tracking-wider uppercase text-white/25">
          {message}
        </p>
      )}

      <style>{`
        @keyframes loading-breathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes loading-glow {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes loading-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.85); }
          40% { opacity: 0.8; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
