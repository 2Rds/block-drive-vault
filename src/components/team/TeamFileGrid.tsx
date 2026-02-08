import { useState, useEffect } from 'react';
import { File, Download, Archive, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileVisibilityToggle } from './FileVisibilityToggle';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { toast } from 'sonner';

// Constants
const BYTES_PER_KB = 1024;
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_WEEK = 7;
const SKELETON_COUNT = 6;

// File type color mapping
const FILE_TYPE_COLORS: Record<string, string> = {
  sol: 'text-blue-600',
  image: 'text-green-600',
  video: 'text-purple-600',
  audio: 'text-yellow-600',
  pdf: 'text-red-600',
  default: 'text-blue-600',
};

type VisibilityFilter = 'all' | 'private' | 'team';

interface TeamFile {
  id: string;
  filename: string;
  file_size: number | null;
  content_type: string | null;
  visibility: 'private' | 'team';
  created_at: string;
  clerk_user_id: string;
  ipfs_url: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface TeamFileGridProps {
  selectedTeamId: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KB));
  return `${(bytes / Math.pow(BYTES_PER_KB, i)).toFixed(1)} ${SIZE_UNITS[i]}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < DAYS_IN_WEEK) return `${diffInDays} days ago`;
  return date.toLocaleDateString();
}

function getFileColor(contentType: string | null, filename: string): string {
  if (filename.endsWith('.sol')) return FILE_TYPE_COLORS.sol;
  if (contentType?.startsWith('image/')) return FILE_TYPE_COLORS.image;
  if (contentType?.startsWith('video/')) return FILE_TYPE_COLORS.video;
  if (contentType?.startsWith('audio/')) return FILE_TYPE_COLORS.audio;
  if (contentType?.includes('pdf')) return FILE_TYPE_COLORS.pdf;
  return FILE_TYPE_COLORS.default;
}

export function TeamFileGrid({ selectedTeamId }: TeamFileGridProps): JSX.Element {
  const { userId, supabase } = useClerkAuth();
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');

  const teamId = selectedTeamId;

  useEffect(() => {
    if (teamId && userId) {
      fetchTeamFiles();
    } else {
      setFiles([]);
      setLoading(false);
    }
  }, [teamId, userId, visibilityFilter]);

  const fetchTeamFiles = async () => {
    if (!teamId) return;

    setLoading(true);
    try {
      // Note: files table doesn't have team_id column in current schema
      // This is a placeholder that will need schema update for team file features
      let query = supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply visibility filter
      if (visibilityFilter === 'private') {
        query = query.eq('clerk_user_id', userId);
      } else if (visibilityFilter === 'team') {
        query = query.eq('visibility', 'team');
      }

      const { data, error } = await query;

      if (error) throw error;

      const filesWithProfiles = (data || []).map((file: any) => ({
        ...file,
        visibility: (file.visibility || 'private') as 'private' | 'team',
        profiles: null
      }));

      setFiles(filesWithProfiles);
    } catch (error) {
      console.error('Error fetching team files:', error);
      toast.error('Failed to load team files');
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityChange = (fileId: string, newVisibility: 'private' | 'team') => {
    setFiles(prev => prev.map(file =>
      file.id === fileId
        ? { ...file, visibility: newVisibility }
        : file
    ));
  };

  const filteredFiles = files.filter(file => {
    if (visibilityFilter === 'all') return true;
    if (visibilityFilter === 'private') return file.clerk_user_id === userId;
    if (visibilityFilter === 'team') return file.visibility === 'team';
    return true;
  });

  if (!teamId) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border/50">
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No team selected</h3>
          <p className="text-muted-foreground/70">Select a team to view team files</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="bg-muted/20 rounded-lg p-4 border border-border/30 animate-pulse">
              <div className="h-8 w-8 bg-muted rounded mb-3"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Team Files</h2>
        <div className="flex items-center gap-4">
          <Select value={visibilityFilter} onValueChange={(value: 'all' | 'private' | 'team') => setVisibilityFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="private">My Files</SelectItem>
              <SelectItem value="team">Team Files</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filteredFiles.length} files</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFiles.map((file) => {
          const iconColor = getFileColor(file.content_type, file.filename);
          const isOwner = file.clerk_user_id === userId;

          return (
            <div
              key={file.id}
              className="bg-muted/20 rounded-lg p-4 border border-border/30 hover:bg-muted/30 hover:border-border transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <File className={`w-8 h-8 ${iconColor}`} />
                {file.ipfs_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={() => window.open(file.ipfs_url!, '_blank')}
                  >
                    <Download className="w-4 h-4 text-blue-600 hover:text-blue-400" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-foreground text-sm truncate" title={file.filename}>
                  {file.filename}
                </h3>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(file.created_at)}</span>
                </div>

                {!isOwner && file.profiles && (
                  <p className="text-xs text-muted-foreground/70">
                    by {file.profiles.first_name || file.profiles.email}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">On-chain</span>
                  </div>

                  {isOwner && (
                    <FileVisibilityToggle
                      fileId={file.id}
                      currentVisibility={file.visibility}
                      onVisibilityChange={(newVisibility) => handleVisibilityChange(file.id, newVisibility)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No files found</h3>
          <p className="text-muted-foreground/70">
            {visibilityFilter === 'private'
              ? 'No private files found'
              : visibilityFilter === 'team'
              ? 'No team files found'
              : 'No files uploaded to this team yet'
            }
          </p>
        </div>
      )}
    </div>
  );
};
