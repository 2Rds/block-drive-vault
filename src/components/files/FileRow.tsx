import React, { useState } from 'react';
import {
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Download,
  Share2,
  MoreVertical,
  Lock,
  Link2,
  Users,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface FileRowData {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  cid: string;
  uploadedAt: Date;
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  encrypted: boolean;
  folderPath?: string;
  onChain?: {
    registered: boolean;
    verified: boolean;
  };
  isTeamFile?: boolean;
  ownerName?: string;
}

interface FileRowProps {
  file: FileRowData;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onOpen?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format date
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Get file icon based on mime type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
    return FileText;
  }
  return File;
}

export function FileRow({
  file,
  selected = false,
  onSelect,
  onOpen,
  onDownload,
  onShare,
  onDelete,
  onContextMenu,
}: FileRowProps) {
  const [hovered, setHovered] = useState(false);
  const FileIcon = getFileIcon(file.mimeType);

  return (
    <div
      className={cn(
        'flex items-center px-4 py-3 border-b border-border',
        'hover:bg-background-secondary cursor-pointer transition-colors',
        selected && 'bg-primary/5'
      )}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'w-8 transition-opacity',
          hovered || selected ? 'opacity-100' : 'opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect?.(checked as boolean)}
        />
      </div>

      {/* File Icon */}
      <div className="w-10 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-background-tertiary flex items-center justify-center">
          <FileIcon className="w-4 h-4 text-foreground-muted" />
        </div>
      </div>

      {/* File Name */}
      <div className="flex-1 min-w-0 px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {file.filename}
          </span>

          {/* Status indicators */}
          <div className="flex items-center gap-1">
            {file.encrypted && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Lock className="w-3 h-3 text-foreground-muted" />
                  </TooltipTrigger>
                  <TooltipContent>Encrypted</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {file.onChain?.registered && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Link2 className="w-3 h-3 text-accent" />
                  </TooltipTrigger>
                  <TooltipContent>On-chain</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {file.isTeamFile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Users className="w-3 h-3 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>Team file</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* Modified Date */}
      <div className="w-32 text-sm text-foreground-muted hidden md:block">
        {formatDate(file.uploadedAt)}
      </div>

      {/* Size */}
      <div className="w-20 text-sm text-foreground-muted hidden lg:block">
        {formatSize(file.size)}
      </div>

      {/* Owner */}
      <div className="w-24 text-sm text-foreground-muted hidden xl:block truncate">
        {file.ownerName || 'You'}
      </div>

      {/* Hover Actions */}
      <div
        className={cn(
          'w-24 flex justify-end gap-1 transition-opacity',
          hovered ? 'opacity-100' : 'opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground-muted hover:text-foreground"
                onClick={onDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground-muted hover:text-foreground"
                onClick={onShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground-muted hover:text-foreground"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>Download</DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>Share</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
