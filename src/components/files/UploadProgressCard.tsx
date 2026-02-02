/**
 * UploadProgressCard
 *
 * Compact, floating progress indicator for active uploads.
 * Can be minimized to corner of screen during operations.
 */

import React, { useState } from 'react';
import {
  Upload,
  Download,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataBlockInline } from './DataBlockAnimation';

type OperationPhase =
  | 'encrypting'
  | 'uploading'
  | 'registering'
  | 'downloading'
  | 'decrypting'
  | 'verifying'
  | 'complete'
  | 'error';

interface UploadProgressCardProps {
  type: 'upload' | 'download';
  phase: OperationPhase;
  progress: number;
  fileName: string;
  message?: string;
  onCancel?: () => void;
  onExpand?: () => void;
  className?: string;
}

const PHASE_ICONS: Record<OperationPhase, React.ComponentType<{ className?: string }>> = {
  encrypting: Lock,
  uploading: Upload,
  registering: Link2,
  downloading: Download,
  decrypting: Lock,
  verifying: Link2,
  complete: CheckCircle,
  error: AlertCircle,
};

const PHASE_COLORS: Record<OperationPhase, string> = {
  encrypting: 'hsl(280, 80%, 60%)',
  uploading: 'hsl(217, 91%, 60%)',
  registering: 'hsl(185, 85%, 50%)',
  downloading: 'hsl(217, 91%, 60%)',
  decrypting: 'hsl(280, 80%, 60%)',
  verifying: 'hsl(38, 92%, 50%)',
  complete: 'hsl(142, 76%, 46%)',
  error: 'hsl(0, 84%, 60%)',
};

export function UploadProgressCard({
  type,
  phase,
  progress,
  fileName,
  message,
  onCancel,
  onExpand,
  className,
}: UploadProgressCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const Icon = PHASE_ICONS[phase];
  const color = PHASE_COLORS[phase];
  const isActive = phase !== 'complete' && phase !== 'error';

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'w-14 h-14 rounded-xl border transition-all duration-300',
          'flex items-center justify-center',
          'backdrop-blur-xl shadow-2xl',
          isActive && 'vault-glow',
          className
        )}
        style={{
          backgroundColor: `${color}20`,
          borderColor: `${color}40`,
          boxShadow: isActive ? `0 0 30px ${color}30` : undefined,
        }}
      >
        {isActive ? (
          <Loader2 className="w-6 h-6 animate-spin" style={{ color }} />
        ) : (
          <Icon className="w-6 h-6" style={{ color }} />
        )}

        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke={`${color}30`}
            strokeWidth="3"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'w-80 rounded-xl border overflow-hidden',
        'backdrop-blur-xl shadow-2xl',
        'transition-all duration-300',
        isActive && 'vault-glow',
        className
      )}
      style={{
        backgroundColor: 'hsl(var(--card) / 0.95)',
        borderColor: `${color}30`,
      }}
    >
      {/* Scan line */}
      {isActive && <div className="vault-scan-line" />}

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: `${color}20` }}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              isActive && 'animate-pulse'
            )}
            style={{ backgroundColor: `${color}20` }}
          >
            {isActive ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
            ) : (
              <Icon className="w-4 h-4" style={{ color }} />
            )}
          </div>
          <div>
            <p className="vault-font-display text-xs tracking-wider" style={{ color }}>
              {type === 'upload' ? 'UPLOADING' : 'DOWNLOADING'}
            </p>
            <p className="vault-font-mono text-[10px] text-muted-foreground">
              {progress.toFixed(0)}% complete
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {onCancel && isActive && (
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-destructive/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* File info */}
        <div className="flex items-center gap-3">
          <DataBlockInline phase={phase as any} />
          <div className="flex-1 min-w-0">
            <p className="vault-font-mono text-sm truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                isActive && 'animate-[vault-progress-glow_1.5s_ease-in-out_infinite]'
              )}
              style={{
                width: `${progress}%`,
                backgroundColor: color,
                boxShadow: isActive ? `0 0 10px ${color}` : undefined,
              }}
            />
          </div>

          {/* Phase indicators */}
          <div className="flex justify-between text-[10px]">
            {type === 'upload' ? (
              <>
                <span
                  className={cn(
                    'transition-colors',
                    ['encrypting', 'uploading', 'registering', 'complete'].includes(phase)
                      ? ''
                      : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: ['encrypting', 'uploading', 'registering', 'complete'].includes(phase)
                      ? PHASE_COLORS.encrypting
                      : undefined,
                  }}
                >
                  Encrypt
                </span>
                <span
                  className={cn(
                    'transition-colors',
                    ['uploading', 'registering', 'complete'].includes(phase)
                      ? ''
                      : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: ['uploading', 'registering', 'complete'].includes(phase)
                      ? PHASE_COLORS.uploading
                      : undefined,
                  }}
                >
                  Upload
                </span>
                <span
                  className={cn(
                    'transition-colors',
                    ['registering', 'complete'].includes(phase)
                      ? ''
                      : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: ['registering', 'complete'].includes(phase)
                      ? PHASE_COLORS.registering
                      : undefined,
                  }}
                >
                  Register
                </span>
                <span
                  className={cn(
                    'transition-colors',
                    phase === 'complete' ? '' : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: phase === 'complete' ? PHASE_COLORS.complete : undefined,
                  }}
                >
                  Done
                </span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    'transition-colors',
                    ['downloading', 'decrypting', 'verifying', 'complete'].includes(phase)
                      ? ''
                      : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: ['downloading', 'decrypting', 'verifying', 'complete'].includes(phase)
                      ? PHASE_COLORS.downloading
                      : undefined,
                  }}
                >
                  Download
                </span>
                <span
                  className={cn(
                    'transition-colors',
                    ['decrypting', 'verifying', 'complete'].includes(phase)
                      ? ''
                      : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: ['decrypting', 'verifying', 'complete'].includes(phase)
                      ? PHASE_COLORS.decrypting
                      : undefined,
                  }}
                >
                  Decrypt
                </span>
                <span
                  className={cn(
                    'transition-colors',
                    ['verifying', 'complete'].includes(phase) ? '' : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: ['verifying', 'complete'].includes(phase)
                      ? PHASE_COLORS.verifying
                      : undefined,
                  }}
                >
                  Verify
                </span>
                <span
                  className={cn(
                    'transition-colors',
                    phase === 'complete' ? '' : 'text-muted-foreground/50'
                  )}
                  style={{
                    color: phase === 'complete' ? PHASE_COLORS.complete : undefined,
                  }}
                >
                  Done
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadProgressCard;
