
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Folder } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string) => void;
  loading?: boolean;
}

export const CreateFolderModal = ({ isOpen, onClose, onCreateFolder, loading = false }: CreateFolderModalProps) => {
  const [folderName, setFolderName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim() && !loading) {
      onCreateFolder(folderName.trim());
      setFolderName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Folder className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-foreground">Create New Folder</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="folderName" className="block text-sm font-medium text-muted-foreground mb-2">
              Folder Name
            </label>
            <input
              id="folderName"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
