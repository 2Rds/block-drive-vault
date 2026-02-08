import { useState } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { FileDatabaseService } from '@/services/fileDatabaseService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderInput, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface MoveToTeamFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    filename: string;
  } | null;
  onMoveComplete?: () => void;
}

export function MoveToTeamFilesModal({
  isOpen,
  onClose,
  file,
  onMoveComplete,
}: MoveToTeamFilesModalProps) {
  const { organization } = useOrganization();
  const { supabase } = useClerkAuth();
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async () => {
    if (!file || !organization || !supabase) return;

    setIsMoving(true);
    try {
      await FileDatabaseService.updateFileVisibility(supabase, file.id, 'team');
      toast.success(`"${file.filename}" moved to Team Files`);
      onMoveComplete?.();
      onClose();
    } catch (error) {
      console.error('Failed to move file:', error);
      toast.error('Failed to move file to Team Files');
    } finally {
      setIsMoving(false);
    }
  };

  if (!file || !organization) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FolderInput className="w-5 h-5 text-purple-400" />
            Move to Team Files
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Make this file visible to all members of{' '}
            <span className="text-purple-400 font-medium">{organization.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">File:</span> {file.filename}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Currently: Private</span>
              </div>
              <span>→</span>
              <div className="flex items-center gap-1 text-purple-400">
                <Users className="w-3 h-3" />
                <span>After: Team Visible</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Once moved, all team members will be able to see and download this file.
            You can move it back to "My Files" at any time.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={isMoving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isMoving ? 'Moving...' : 'Move to Team Files'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
