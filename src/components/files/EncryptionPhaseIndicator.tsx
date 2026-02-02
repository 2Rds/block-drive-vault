/**
 * EncryptionPhaseIndicator
 *
 * Displays the current phase of file upload/download operations
 * with animated icons and progress visualization.
 */

import React from 'react';
import {
  Lock,
  Upload,
  Download,
  Link2,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadPhase = 'encrypting' | 'uploading' | 'registering' | 'complete' | 'error';
type DownloadPhase = 'downloading' | 'decrypting' | 'verifying' | 'complete' | 'error';
type Phase = UploadPhase | DownloadPhase;

interface EncryptionPhaseIndicatorProps {
  phase: Phase;
  progress: number;
  message?: string;
  variant?: 'upload' | 'download';
  compact?: boolean;
  className?: string;
}

const PHASE_CONFIG: Record<Phase, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  description: string;
}> = {
  // Upload phases
  encrypting: {
    icon: Lock,
    label: 'ENCRYPTING',
    color: 'hsl(280, 80%, 60%)',
    description: 'Securing your data with AES-256-GCM',
  },
  uploading: {
    icon: Upload,
    label: 'UPLOADING',
    color: 'hsl(217, 91%, 60%)',
    description: 'Distributing to storage providers',
  },
  registering: {
    icon: Link2,
    label: 'REGISTERING',
    color: 'hsl(185, 85%, 50%)',
    description: 'Recording on Solana blockchain',
  },
  // Download phases
  downloading: {
    icon: Download,
    label: 'DOWNLOADING',
    color: 'hsl(217, 91%, 60%)',
    description: 'Retrieving encrypted content',
  },
  decrypting: {
    icon: Sparkles,
    label: 'DECRYPTING',
    color: 'hsl(280, 80%, 60%)',
    description: 'Reconstructing with critical bytes',
  },
  verifying: {
    icon: ShieldCheck,
    label: 'VERIFYING',
    color: 'hsl(38, 92%, 50%)',
    description: 'Checking on-chain commitment',
  },
  // Shared phases
  complete: {
    icon: CheckCircle,
    label: 'COMPLETE',
    color: 'hsl(142, 76%, 46%)',
    description: 'Operation successful',
  },
  error: {
    icon: XCircle,
    label: 'ERROR',
    color: 'hsl(0, 84%, 60%)',
    description: 'Operation failed',
  },
};

// Upload phase order for progress line
const UPLOAD_PHASES: UploadPhase[] = ['encrypting', 'uploading', 'registering', 'complete'];
const DOWNLOAD_PHASES: DownloadPhase[] = ['downloading', 'decrypting', 'verifying', 'complete'];

export function EncryptionPhaseIndicator({
  phase,
  progress,
  message,
  variant = 'upload',
  compact = false,
  className,
}: EncryptionPhaseIndicatorProps) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;
  const phases = variant === 'upload' ? UPLOAD_PHASES : DOWNLOAD_PHASES;
  const currentIndex = phases.indexOf(phase as any);
  const isActive = phase !== 'complete' && phase !== 'error';

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {/* Icon with glow */}
        <div
          className={cn(
            'relative w-10 h-10 rounded-lg flex items-center justify-center',
            isActive && 'vault-glow'
          )}
          style={{
            backgroundColor: `${config.color}20`,
            boxShadow: isActive ? `0 0 20px ${config.color}40` : undefined,
          }}
        >
          <Icon
            className={cn(
              'w-5 h-5',
              isActive && 'animate-pulse'
            )}
            style={{ color: config.color }}
          />
          {isActive && (
            <div className="absolute inset-0 vault-scan-line rounded-lg" />
          )}
        </div>

        {/* Progress info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className="vault-font-display text-xs font-semibold tracking-wider"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
            <span className="vault-font-mono text-xs text-muted-foreground">
              {progress.toFixed(0)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: config.color,
                boxShadow: isActive ? `0 0 10px ${config.color}` : undefined,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Phase steps */}
      <div className="flex items-center justify-between">
        {phases.map((p, index) => {
          const pConfig = PHASE_CONFIG[p];
          const PIcon = pConfig.icon;
          const isCurrentPhase = p === phase;
          const isPastPhase = currentIndex > index || phase === 'complete';
          const isErrored = phase === 'error' && index === currentIndex;

          return (
            <React.Fragment key={p}>
              {/* Step indicator */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500',
                    isCurrentPhase && 'scale-110'
                  )}
                  style={{
                    backgroundColor: isPastPhase || isCurrentPhase
                      ? `${pConfig.color}20`
                      : 'hsl(var(--muted))',
                    boxShadow: isCurrentPhase
                      ? `0 0 30px ${pConfig.color}50`
                      : undefined,
                  }}
                >
                  {isCurrentPhase && !isPastPhase ? (
                    <Loader2
                      className="w-6 h-6 animate-spin"
                      style={{ color: pConfig.color }}
                    />
                  ) : (
                    <PIcon
                      className={cn(
                        'w-6 h-6 transition-all duration-300',
                        isPastPhase && 'scale-90'
                      )}
                      style={{
                        color: isPastPhase || isCurrentPhase
                          ? pConfig.color
                          : 'hsl(var(--muted-foreground))',
                      }}
                    />
                  )}

                  {/* Active scan effect */}
                  {isCurrentPhase && (
                    <div className="absolute inset-0 vault-scan-line rounded-xl" />
                  )}

                  {/* Completed checkmark */}
                  {isPastPhase && p !== 'complete' && (
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'hsl(142, 76%, 46%)' }}
                    >
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    'vault-font-display text-[10px] font-semibold tracking-wider transition-colors duration-300',
                    isCurrentPhase || isPastPhase
                      ? ''
                      : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: isCurrentPhase || isPastPhase
                      ? pConfig.color
                      : undefined,
                  }}
                >
                  {pConfig.label}
                </span>
              </div>

              {/* Connector line */}
              {index < phases.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full transition-all duration-700 ease-out"
                    style={{
                      width: currentIndex > index || phase === 'complete' ? '100%' : '0%',
                      backgroundColor: PHASE_CONFIG[phases[index + 1]].color,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current operation details */}
      <div
        className={cn(
          'relative p-4 rounded-xl border transition-all duration-500',
          isActive && 'vault-glow'
        )}
        style={{
          borderColor: `${config.color}30`,
          backgroundColor: `${config.color}08`,
        }}
      >
        {isActive && <div className="vault-scan-line rounded-xl" />}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon
              className={cn('w-5 h-5', isActive && 'animate-pulse')}
              style={{ color: config.color }}
            />
            <span className="vault-font-display text-sm font-semibold" style={{ color: config.color }}>
              {message || config.description}
            </span>
          </div>
          <span className="vault-font-mono text-lg font-bold" style={{ color: config.color }}>
            {progress.toFixed(0)}%
          </span>
        </div>

        {/* Main progress bar */}
        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              isActive && 'animate-[vault-progress-glow_1.5s_ease-in-out_infinite]'
            )}
            style={{
              width: `${progress}%`,
              backgroundColor: config.color,
              boxShadow: `0 0 15px ${config.color}60`,
            }}
          />
        </div>

        {/* Data stream effect during encryption */}
        {(phase === 'encrypting' || phase === 'decrypting') && (
          <div className="mt-3 vault-data-stream h-8 rounded-lg overflow-hidden opacity-30" />
        )}
      </div>
    </div>
  );
}

export default EncryptionPhaseIndicator;
