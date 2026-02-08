import React from 'react';
import {
  Eye,
  Download,
  Share2,
  Pencil,
  FolderInput,
  Copy,
  Trash2,
  Link2,
  Users,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { FileRowData } from './FileRow';

interface FileContextMenuProps {
  children: React.ReactNode;
  file: FileRowData;
  onOpen?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onCopyLink?: () => void;
  onMoveToTeam?: () => void;
  onDelete?: () => void;
}

export function FileContextMenu({
  children,
  file,
  onOpen,
  onDownload,
  onShare,
  onRename,
  onMove,
  onCopyLink,
  onMoveToTeam,
  onDelete,
}: FileContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-card border-border">
        <ContextMenuItem
          onClick={onOpen}
          className="cursor-pointer hover:bg-background-secondary"
        >
          <Eye className="w-4 h-4 mr-2" />
          Open
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDownload}
          className="cursor-pointer hover:bg-background-secondary"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onShare}
          className="cursor-pointer hover:bg-background-secondary"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onCopyLink}
          className="cursor-pointer hover:bg-background-secondary"
        >
          <Link2 className="w-4 h-4 mr-2" />
          Copy link
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onRename}
          className="cursor-pointer hover:bg-background-secondary"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onMove}
          className="cursor-pointer hover:bg-background-secondary"
        >
          <FolderInput className="w-4 h-4 mr-2" />
          Move
        </ContextMenuItem>

        {!file.isTeamFile && onMoveToTeam && (
          <ContextMenuItem
            onClick={onMoveToTeam}
            className="cursor-pointer hover:bg-background-secondary text-primary"
          >
            <Users className="w-4 h-4 mr-2" />
            Move to team files
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onDelete}
          className="cursor-pointer hover:bg-background-secondary text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
