/**
 * SecurityLevelRing
 *
 * Animated concentric rings displaying encryption security level.
 * Part of the Vault Terminal design system.
 */

import React from 'react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { cn } from '@/lib/utils';

interface SecurityLevelRingProps {
  level: SecurityLevel;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  showLabel?: boolean;
  className?: string;
}

const LEVEL_CONFIG = {
  [SecurityLevel.STANDARD]: {
    rings: 1,
    color: 'hsl(217, 91%, 60%)', // Primary blue
    label: 'STANDARD',
    description: 'Basic Encryption',
  },
  [SecurityLevel.SENSITIVE]: {
    rings: 2,
    color: 'hsl(38, 92%, 50%)', // Warning amber
    label: 'SENSITIVE',
    description: 'Enhanced Protection',
  },
  [SecurityLevel.MAXIMUM]: {
    rings: 3,
    color: 'hsl(0, 84%, 60%)', // Danger red
    label: 'MAXIMUM',
    description: 'Military Grade',
  },
};

const SIZE_CONFIG = {
  sm: { width: 48, strokeWidth: 2, gap: 6 },
  md: { width: 72, strokeWidth: 2.5, gap: 8 },
  lg: { width: 96, strokeWidth: 3, gap: 10 },
};

export function SecurityLevelRing({
  level,
  size = 'md',
  active = false,
  showLabel = false,
  className,
}: SecurityLevelRingProps) {
  const config = LEVEL_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const center = sizeConfig.width / 2;

  // Generate ring radii from outside in
  const rings = Array.from({ length: config.rings }, (_, i) => {
    const radius = center - sizeConfig.gap * (i + 1) - sizeConfig.strokeWidth;
    return { radius, index: i };
  });

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative">
        <svg
          width={sizeConfig.width}
          height={sizeConfig.width}
          viewBox={`0 0 ${sizeConfig.width} ${sizeConfig.width}`}
          className={cn(
            'transform-gpu',
            active && 'animate-[vault-ring-rotate_8s_linear_infinite]'
          )}
        >
          {/* Background glow */}
          <defs>
            <filter id={`glow-${level}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`gradient-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.color} stopOpacity="1" />
              <stop offset="50%" stopColor={config.color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={config.color} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Rings */}
          {rings.map(({ radius, index }) => (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#gradient-${level})`}
              strokeWidth={sizeConfig.strokeWidth}
              strokeDasharray={active ? '8 4' : 'none'}
              strokeLinecap="round"
              filter={active ? `url(#glow-${level})` : undefined}
              className={cn(
                'transition-all duration-500',
                active && 'animate-[vault-ring-pulse_1.5s_ease-in-out_infinite]'
              )}
              style={{
                animationDelay: `${index * 0.2}s`,
                opacity: active ? 1 : 0.6,
              }}
            />
          ))}

          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.strokeWidth * 1.5}
            fill={config.color}
            className={cn(
              'transition-all duration-300',
              active && 'animate-pulse'
            )}
          />
        </svg>

        {/* Active glow overlay */}
        {active && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${config.color}20 0%, transparent 70%)`,
            }}
          />
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p
            className="vault-font-display text-xs font-semibold tracking-wider"
            style={{ color: config.color }}
          >
            {config.label}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {config.description}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * SecurityLevelSelector with Ring visualization
 */
interface SecurityLevelSelectorRingProps {
  value: SecurityLevel;
  onChange: (level: SecurityLevel) => void;
  disabled?: boolean;
  className?: string;
}

export function SecurityLevelSelectorRing({
  value,
  onChange,
  disabled = false,
  className,
}: SecurityLevelSelectorRingProps) {
  const levels = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM];

  return (
    <div className={cn('flex items-center justify-center gap-6', className)}>
      {levels.map((level) => {
        const config = LEVEL_CONFIG[level];
        const isSelected = value === level;

        return (
          <button
            key={level}
            type="button"
            onClick={() => !disabled && onChange(level)}
            disabled={disabled}
            className={cn(
              'relative p-3 rounded-xl border-2 transition-all duration-300',
              'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
              isSelected
                ? 'border-opacity-100 bg-opacity-10'
                : 'border-muted/30 bg-transparent hover:border-muted/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              borderColor: isSelected ? config.color : undefined,
              backgroundColor: isSelected ? `${config.color}10` : undefined,
              boxShadow: isSelected ? `0 0 20px ${config.color}30` : undefined,
            }}
          >
            <SecurityLevelRing
              level={level}
              size="sm"
              active={isSelected}
              showLabel
            />

            {/* Selection indicator */}
            {isSelected && (
              <div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: config.color }}
              >
                <svg
                  className="w-2.5 h-2.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SecurityLevelRing;
