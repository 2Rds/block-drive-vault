import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, Upload, FolderPlus } from 'lucide-react';
import { FileRow, FileRowData } from './FileRow';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FileFilter = 'all' | 'team' | 'private' | 'on-chain' | 'shared' | 'deleted';
export type SortField = 'name' | 'date' | 'size';
export type SortOrder = 'asc' | 'desc';

interface FileBrowserProps {
  files: FileRowData[];
  filter?: FileFilter;
  searchQuery?: string;
  loading?: boolean;
  onFileOpen?: (file: FileRowData) => void;
  onFileDownload?: (file: FileRowData) => void;
  onFileShare?: (file: FileRowData) => void;
  onFileDelete?: (file: FileRowData) => void;
  onUpload?: () => void;
  onNewFolder?: () => void;
}

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentSort: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  className?: string;
}

function SortableHeader({
  label,
  field,
  currentSort,
  sortOrder,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-sm font-medium text-foreground-muted',
        'hover:text-foreground transition-colors',
        isActive && 'text-foreground',
        className
      )}
    >
      {label}
      <ArrowUpDown
        className={cn(
          'w-3 h-3',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        )}
      />
    </button>
  );
}

function EmptyState({ filter, searchQuery }: { filter?: FileFilter; searchQuery?: string }) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-foreground-muted" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
        <p className="text-foreground-muted max-w-sm">
          No files match "{searchQuery}". Try a different search term.
        </p>
      </div>
    );
  }

  const messages: Record<FileFilter, { title: string; description: string }> = {
    all: {
      title: 'No files yet',
      description: 'Upload your first file to get started.',
    },
    team: {
      title: 'No team files',
      description: 'Files shared with your team will appear here.',
    },
    private: {
      title: 'No private files',
      description: 'Your private files within this organization will appear here.',
    },
    'on-chain': {
      title: 'No on-chain files',
      description: 'Files registered on the blockchain will appear here.',
    },
    shared: {
      title: 'No shared files',
      description: 'Files shared with you will appear here.',
    },
    deleted: {
      title: 'Trash is empty',
      description: 'Deleted files will appear here for 30 days.',
    },
  };

  const { title, description } = messages[filter || 'all'];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
        <Upload className="w-8 h-8 text-foreground-muted" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-foreground-muted max-w-sm">{description}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center px-4 py-3 animate-pulse">
          <div className="w-8" />
          <div className="w-10">
            <div className="w-8 h-8 rounded-lg bg-muted" />
          </div>
          <div className="flex-1 px-3">
            <div className="h-4 bg-muted rounded w-48" />
          </div>
          <div className="w-32 hidden md:block">
            <div className="h-4 bg-muted rounded w-20" />
          </div>
          <div className="w-20 hidden lg:block">
            <div className="h-4 bg-muted rounded w-12" />
          </div>
          <div className="w-24 hidden xl:block">
            <div className="h-4 bg-muted rounded w-16" />
          </div>
          <div className="w-24" />
        </div>
      ))}
    </div>
  );
}

export function FileBrowser({
  files,
  filter = 'all',
  searchQuery,
  loading = false,
  onFileOpen,
  onFileDownload,
  onFileShare,
  onFileDelete,
  onUpload,
  onNewFolder,
}: FileBrowserProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Apply filter
    switch (filter) {
      case 'team':
        result = result.filter((f) => f.isTeamFile);
        break;
      case 'private':
        result = result.filter((f) => !f.isTeamFile);
        break;
      case 'on-chain':
        result = result.filter((f) => f.onChain?.registered);
        break;
      case 'shared':
        // TODO: Implement shared filter
        break;
      case 'deleted':
        // TODO: Implement deleted filter
        result = [];
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) =>
        f.filename.toLowerCase().includes(query)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'date':
          comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, filter, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleSelect = (fileId: string, selected: boolean) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(fileId);
      } else {
        next.delete(fileId);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const allSelected = filteredFiles.length > 0 && selectedFiles.size === filteredFiles.length;
  const someSelected = selectedFiles.size > 0 && !allSelected;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-secondary">
        <div className="flex items-center gap-2">
          {selectedFiles.size > 0 ? (
            <span className="text-sm text-foreground-muted">
              {selectedFiles.size} selected
            </span>
          ) : (
            <span className="text-sm text-foreground-muted">
              {filteredFiles.length} files
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onNewFolder && (
            <Button variant="ghost" size="sm" onClick={onNewFolder}>
              <FolderPlus className="w-4 h-4 mr-2" />
              New folder
            </Button>
          )}
          {onUpload && (
            <Button size="sm" onClick={onUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center px-4 py-2 border-b border-border bg-background text-sm">
        <div className="w-8">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-border"
          />
        </div>
        <div className="w-10" />
        <SortableHeader
          label="Name"
          field="name"
          currentSort={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          className="flex-1 px-3"
        />
        <SortableHeader
          label="Modified"
          field="date"
          currentSort={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          className="w-32 hidden md:flex"
        />
        <SortableHeader
          label="Size"
          field="size"
          currentSort={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          className="w-20 hidden lg:flex"
        />
        <div className="w-24 text-sm text-foreground-muted hidden xl:block">
          Owner
        </div>
        <div className="w-24" />
      </div>

      {/* File List */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredFiles.length === 0 ? (
        <EmptyState filter={filter} searchQuery={searchQuery} />
      ) : (
        <div className="divide-y divide-border">
          {filteredFiles.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              selected={selectedFiles.has(file.id)}
              onSelect={(selected) => handleSelect(file.id, selected)}
              onOpen={() => onFileOpen?.(file)}
              onDownload={() => onFileDownload?.(file)}
              onShare={() => onFileShare?.(file)}
              onDelete={() => onFileDelete?.(file)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
