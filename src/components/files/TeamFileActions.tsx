import { useState } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Eye,
  Download,
  Share2,
  Trash2,
  Send,
  FolderInput,
  Users,
  Lock,
  FolderOpen,
} from 'lucide-react';
import { MoveToTeamFilesModal } from './MoveToTeamFilesModal';
import { SendToTeammateModal } from './SendToTeammateModal';

interface FileData {
  id: string;
  filename: string;
  cid?: string;
  visibility?: 'team' | 'private';
}

interface TeamFileActionsProps {
  file: FileData;
  onView?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onActionComplete?: () => void;
  showTeamActions?: boolean;
  isPrivateFile?: boolean;
}

export function TeamFileActions({
  file,
  onView,
  onDownload,
  onShare,
  onMove,
  onDelete,
  onActionComplete,
  showTeamActions = false,
  isPrivateFile = false,
}: TeamFileActionsProps) {
  const { organization } = useOrganization();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const isInOrganization = !!organization;
  const canShowTeamActions = isInOrganization && (showTeamActions || isPrivateFile);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onView && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </DropdownMenuItem>
          )}
          {onDownload && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
          )}
          {onShare && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </DropdownMenuItem>
          )}

          {/* Team-specific actions */}
          {canShowTeamActions && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSendModal(true);
                }}
                className="text-blue-400"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Teammate
              </DropdownMenuItem>
              {isPrivateFile && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoveModal(true);
                  }}
                  className="text-purple-400"
                >
                  <FolderInput className="w-4 h-4 mr-2" />
                  Move to Team Files
                </DropdownMenuItem>
              )}
            </>
          )}

          {onMove && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Move to Folder
            </DropdownMenuItem>
          )}

          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <MoveToTeamFilesModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        file={file}
        onMoveComplete={onActionComplete}
      />
      <SendToTeammateModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        file={file}
        onSendComplete={onActionComplete}
      />
    </>
  );
}
