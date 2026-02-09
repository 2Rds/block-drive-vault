import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, FolderOpen, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderOption {
  name: string;
  path: string;
}

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  currentFolderPath?: string;
  folders: FolderOption[];
  onMove: (targetPath: string) => void;
  loading?: boolean;
}

export function MoveToFolderModal({
  isOpen,
  onClose,
  filename,
  currentFolderPath = '/',
  folders,
  onMove,
  loading = false,
}: MoveToFolderModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMove = () => {
    if (selected !== null) {
      onMove(selected);
    }
  };

  // Build full list: root + all folders, excluding the folder the file is already in
  const options: FolderOption[] = [
    { name: 'Root', path: '/' },
    ...folders,
  ].filter(f => f.path !== currentFolderPath);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-xl border border-zinc-800 p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Move File</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4 truncate">
          Moving <span className="text-foreground font-medium">{filename}</span>
        </p>

        {options.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">
            No other folders available. Create a folder first.
          </p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto mb-4">
            {options.map((folder) => (
              <button
                key={folder.path}
                onClick={() => setSelected(folder.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  selected === folder.path
                    ? "bg-blue-500/15 border border-blue-500/40 text-foreground"
                    : "hover:bg-zinc-800/60 text-zinc-300 border border-transparent"
                )}
              >
                {folder.path === '/' ? (
                  <Home className="w-4 h-4 text-zinc-400 shrink-0" />
                ) : (
                  <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <span className="text-sm truncate">{folder.name}</span>
                <span className="text-xs text-zinc-600 ml-auto shrink-0 font-mono">{folder.path}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={selected === null || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Moving...' : 'Move'}
          </Button>
        </div>
      </div>
    </div>
  );
}
