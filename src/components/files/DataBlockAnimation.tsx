/**
 * DataBlockAnimation
 *
 * Hexagonal data blocks that animate during encryption/decryption.
 * Represents the "programmed incompleteness" architecture visually.
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DataBlockAnimationProps {
  phase: 'idle' | 'fragmenting' | 'reassembling' | 'complete';
  blockCount?: number;
  className?: string;
}

interface HexBlock {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  delay: number;
  isCritical: boolean;
}

export function DataBlockAnimation({
  phase,
  blockCount = 16,
  className,
}: DataBlockAnimationProps) {
  const [blocks, setBlocks] = useState<HexBlock[]>([]);

  // Generate block positions
  useEffect(() => {
    const newBlocks: HexBlock[] = [];
    const gridSize = Math.ceil(Math.sqrt(blockCount));
    const spacing = 100 / (gridSize + 1);

    for (let i = 0; i < blockCount; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const offset = row % 2 === 0 ? 0 : spacing / 2;

      newBlocks.push({
        id: i,
        x: spacing * (col + 1) + offset,
        y: spacing * (row + 1),
        scale: 1,
        rotation: 0,
        opacity: 1,
        delay: Math.random() * 0.5,
        isCritical: i === 0, // First block is the "critical bytes"
      });
    }

    setBlocks(newBlocks);
  }, [blockCount]);

  const getBlockStyle = (block: HexBlock): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      left: `${block.x}%`,
      top: `${block.y}%`,
      transform: 'translate(-50%, -50%)',
      transitionDelay: `${block.delay}s`,
    };

    switch (phase) {
      case 'fragmenting':
        return {
          ...baseStyle,
          transform: `translate(-50%, -50%) scale(${0.5 + Math.random() * 0.5}) rotate(${Math.random() * 180}deg)`,
          opacity: block.isCritical ? 1 : 0.3,
        };
      case 'reassembling':
        return {
          ...baseStyle,
          transform: `translate(-50%, -50%) scale(${0.8 + Math.random() * 0.2}) rotate(${Math.random() * 45}deg)`,
          opacity: 0.7,
        };
      case 'complete':
        return {
          ...baseStyle,
          transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
          opacity: 1,
        };
      default:
        return baseStyle;
    }
  };

  const getBlockColor = (block: HexBlock): string => {
    if (block.isCritical) {
      return phase === 'fragmenting'
        ? 'hsl(0, 84%, 60%)' // Red for extracted critical bytes
        : 'hsl(280, 80%, 60%)'; // Purple for encryption
    }

    switch (phase) {
      case 'fragmenting':
        return 'hsl(217, 91%, 50%)'; // Blue fading
      case 'reassembling':
        return 'hsl(185, 85%, 50%)'; // Cyan
      case 'complete':
        return 'hsl(142, 76%, 46%)'; // Green
      default:
        return 'hsl(217, 91%, 60%)'; // Primary blue
    }
  };

  return (
    <div className={cn('relative w-full aspect-square max-w-[200px]', className)}>
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(30deg, hsl(var(--vault-glow) / 0.1) 12%, transparent 12.5%, transparent 87%, hsl(var(--vault-glow) / 0.1) 87.5%, hsl(var(--vault-glow) / 0.1)),
            linear-gradient(150deg, hsl(var(--vault-glow) / 0.1) 12%, transparent 12.5%, transparent 87%, hsl(var(--vault-glow) / 0.1) 87.5%, hsl(var(--vault-glow) / 0.1)),
            linear-gradient(30deg, hsl(var(--vault-glow) / 0.1) 12%, transparent 12.5%, transparent 87%, hsl(var(--vault-glow) / 0.1) 87.5%, hsl(var(--vault-glow) / 0.1)),
            linear-gradient(150deg, hsl(var(--vault-glow) / 0.1) 12%, transparent 12.5%, transparent 87%, hsl(var(--vault-glow) / 0.1) 87.5%, hsl(var(--vault-glow) / 0.1)),
            linear-gradient(60deg, hsl(var(--vault-cyan) / 0.05) 25%, transparent 25.5%, transparent 75%, hsl(var(--vault-cyan) / 0.05) 75%, hsl(var(--vault-cyan) / 0.05)),
            linear-gradient(60deg, hsl(var(--vault-cyan) / 0.05) 25%, transparent 25.5%, transparent 75%, hsl(var(--vault-cyan) / 0.05) 75%, hsl(var(--vault-cyan) / 0.05))
          `,
          backgroundSize: '40px 70px',
          backgroundPosition: '0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px',
        }}
      />

      {/* Data blocks */}
      {blocks.map((block) => (
        <div
          key={block.id}
          className={cn(
            'absolute w-6 h-6 transition-all duration-700 ease-out',
            phase === 'fragmenting' && block.isCritical && 'animate-pulse z-10'
          )}
          style={getBlockStyle(block)}
        >
          {/* Hexagon shape */}
          <div
            className="w-full h-full vault-hex"
            style={{
              backgroundColor: getBlockColor(block),
              boxShadow: block.isCritical
                ? `0 0 15px ${getBlockColor(block)}`
                : `0 0 8px ${getBlockColor(block)}50`,
            }}
          />

          {/* Inner highlight */}
          <div
            className="absolute inset-1 vault-hex opacity-60"
            style={{
              backgroundColor: 'white',
              mixBlendMode: 'overlay',
            }}
          />

          {/* Critical byte indicator */}
          {block.isCritical && phase === 'fragmenting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="vault-font-mono text-[8px] text-white font-bold">16B</span>
            </div>
          )}
        </div>
      ))}

      {/* Phase label */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <span
          className={cn(
            'vault-font-display text-[10px] tracking-wider transition-colors duration-300',
            phase === 'complete' ? 'text-green-400' : 'text-muted-foreground'
          )}
        >
          {phase === 'idle' && 'READY'}
          {phase === 'fragmenting' && 'EXTRACTING CRITICAL BYTES'}
          {phase === 'reassembling' && 'RECONSTRUCTING'}
          {phase === 'complete' && 'INTEGRITY VERIFIED'}
        </span>
      </div>

      {/* Connection lines during fragmentation */}
      {phase === 'fragmenting' && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {blocks.slice(1, 5).map((block, i) => (
            <line
              key={`line-${i}`}
              x1={`${blocks[0].x}%`}
              y1={`${blocks[0].y}%`}
              x2={`${block.x}%`}
              y2={`${block.y}%`}
              stroke="url(#line-gradient)"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="animate-[vault-border-dash_1s_linear_infinite]"
            />
          ))}
        </svg>
      )}
    </div>
  );
}

/**
 * Simplified inline animation for compact displays
 */
interface DataBlockInlineProps {
  phase: 'encrypting' | 'uploading' | 'decrypting' | 'downloading' | 'complete';
  className?: string;
}

export function DataBlockInline({ phase, className }: DataBlockInlineProps) {
  const isActive = phase !== 'complete';
  const isEncryption = phase === 'encrypting' || phase === 'decrypting';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'w-2 h-2 vault-hex transition-all duration-300',
            isActive && 'animate-[vault-block-float_1s_ease-in-out_infinite]'
          )}
          style={{
            backgroundColor: i === 0 && isEncryption
              ? 'hsl(0, 84%, 60%)'
              : phase === 'complete'
              ? 'hsl(142, 76%, 46%)'
              : 'hsl(217, 91%, 60%)',
            animationDelay: `${i * 0.1}s`,
            opacity: isActive ? 0.6 + (i * 0.1) : 1,
          }}
        />
      ))}
    </div>
  );
}

export default DataBlockAnimation;
