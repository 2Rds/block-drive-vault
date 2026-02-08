import { cn } from '@/lib/utils';

interface GridPatternProps {
  className?: string;
  fadeEdges?: boolean;
  animated?: boolean;
}

export function GridPattern({ className, fadeEdges = true, animated = false }: GridPatternProps) {
  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {/* Grid lines */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]',
          'bg-[size:60px_60px]',
          animated && 'animate-grid-shift'
        )}
      />

      {/* Fade edges */}
      {fadeEdges && (
        <>
          {/* Top fade */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent" />
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
          {/* Left fade */}
          <div className="absolute top-0 left-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent" />
          {/* Right fade */}
          <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent" />
        </>
      )}
    </div>
  );
}

// Perspective grid that creates depth
export function PerspectiveGrid({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      <div
        className="absolute inset-0 origin-top"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: 'perspective(1000px) rotateX(60deg) translateY(-50%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)',
        }}
      />
    </div>
  );
}
