/**
 * Storage Config Selector
 * 
 * Component for selecting storage configuration (redundancy level, providers).
 */

import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Shield, ShieldCheck, Zap } from 'lucide-react';
import { 
  StorageConfig, 
  DEFAULT_STORAGE_CONFIG, 
  HIGH_RELIABILITY_CONFIG 
} from '@/types/storageProvider';
import { cn } from '@/lib/utils';

interface StorageConfigSelectorProps {
  value: StorageConfig;
  onChange: (config: StorageConfig) => void;
  disabled?: boolean;
}

const PRESETS = [
  {
    id: 'fast',
    name: 'Fast',
    description: 'Single provider, fastest upload',
    icon: Zap,
    config: {
      primaryProvider: 'filebase' as const,
      backupProviders: [],
      redundancyLevel: 1 as const,
      preferPermanent: false,
      encryptionRequired: true
    },
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'IPFS + R2 backup',
    icon: Shield,
    config: DEFAULT_STORAGE_CONFIG,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  {
    id: 'maximum',
    name: 'Maximum',
    description: 'All providers + permanent storage',
    icon: ShieldCheck,
    config: HIGH_RELIABILITY_CONFIG,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  }
];

export function StorageConfigSelector({ 
  value, 
  onChange, 
  disabled = false 
}: StorageConfigSelectorProps) {
  // Determine which preset matches current config
  const getSelectedPreset = (): string => {
    if (value.redundancyLevel === 1) return 'fast';
    if (value.redundancyLevel === 3 && value.preferPermanent) return 'maximum';
    return 'balanced';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          Storage Configuration
        </CardTitle>
        <CardDescription>
          Choose how your files are stored across providers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={getSelectedPreset()}
          onValueChange={(presetId) => {
            const preset = PRESETS.find(p => p.id === presetId);
            if (preset) {
              onChange(preset.config);
            }
          }}
          disabled={disabled}
          className="grid grid-cols-3 gap-3"
        >
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = getSelectedPreset() === preset.id;

            return (
              <Label
                key={preset.id}
                htmlFor={`storage-${preset.id}`}
                className={cn(
                  "flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all text-center",
                  isSelected 
                    ? `border-primary ${preset.bgColor}` 
                    : "border-border hover:border-muted-foreground/30",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <RadioGroupItem
                  value={preset.id}
                  id={`storage-${preset.id}`}
                  className="sr-only"
                />
                <Icon className={cn(
                  "w-6 h-6 mb-2",
                  isSelected ? preset.color : "text-muted-foreground"
                )} />
                <span className={cn(
                  "font-medium text-sm",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}>
                  {preset.name}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {preset.description}
                </span>
                <span className={cn(
                  "text-xs mt-2 px-2 py-0.5 rounded-full",
                  preset.bgColor,
                  preset.color
                )}>
                  {preset.config.redundancyLevel}x redundancy
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
