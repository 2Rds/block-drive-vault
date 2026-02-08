/**
 * Security Level Selector
 * 
 * Component for selecting the encryption security level when uploading files.
 */

import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Key } from 'lucide-react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { cn } from '@/lib/utils';

interface SecurityLevelSelectorProps {
  value: SecurityLevel;
  onChange: (level: SecurityLevel) => void;
  disabled?: boolean;
}

const LEVELS = [
  {
    level: SecurityLevel.STANDARD,
    icon: Shield,
    title: 'Standard',
    description: 'Basic encryption for general files',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  {
    level: SecurityLevel.SENSITIVE,
    icon: Lock,
    title: 'Sensitive',
    description: 'Enhanced protection for confidential data',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30'
  },
  {
    level: SecurityLevel.MAXIMUM,
    icon: Key,
    title: 'Maximum',
    description: 'Highest security for critical data',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  }
];

export function SecurityLevelSelector({ 
  value, 
  onChange, 
  disabled = false 
}: SecurityLevelSelectorProps) {
  return (
    <RadioGroup
      value={value.toString()}
      onValueChange={(val) => onChange(parseInt(val) as SecurityLevel)}
      disabled={disabled}
      className="grid grid-cols-3 gap-3"
    >
      {LEVELS.map(({ level, icon: Icon, title, description, color, bgColor, borderColor }) => {
        const isSelected = value === level;
        
        return (
          <Label
            key={level}
            htmlFor={`level-${level}`}
            className={cn(
              "flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all",
              isSelected ? `${borderColor} ${bgColor}` : "border-border hover:border-muted-foreground/30",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <RadioGroupItem
              value={level.toString()}
              id={`level-${level}`}
              className="sr-only"
            />
            <Icon className={cn("w-6 h-6 mb-2", isSelected ? color : "text-muted-foreground")} />
            <span className={cn(
              "font-medium text-sm",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {title}
            </span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              {description}
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
