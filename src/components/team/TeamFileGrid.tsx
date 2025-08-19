import { useState, useEffect } from 'react';
import { File, Folder, Download, Archive, Database, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileVisibilityToggle } from './FileVisibilityToggle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeams } from '@/hooks/useTeams';
import { toast } from 'sonner';

interface TeamFile {
  id: string;
  filename: string;
  file_size: number | null;
  content_type: string | null;
  visibility: 'private' | 'team';
  created_at: string;
  user_id: string;
  team_id: string | null;
  ipfs_url: string | null;
  profiles?: {
    id: string;
    username: string | null;
    email: string | null;
  } | null;
}

interface TeamFileGridProps {
  selectedTeamId?: string;
}

export const TeamFileGrid = ({ selectedTeamId }: TeamFileGridProps) => {
  const { user } = useAuth();
  const { currentTeam } = useTeams();
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'private' | 'team'>('all');

  const teamId = selectedTeamId || currentTeam?.id;

  useEffect(() => {
    if (teamId && user) {
      fetchTeamFiles();
    } else {
      setFiles([]);
      setLoading(false);
    }
  }, [teamId, user, visibilityFilter]);

  const fetchTeamFiles = async () => {
    if (!teamId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('files')
        .select(`
          id,
          filename,
          file_size,
          content_type,
          visibility,
          created_at,
          user_id,
          team_id,
          ipfs_url
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      // Apply visibility filter
      if (visibilityFilter === 'private') {
        query = query.eq('user_id', user?.id);
      } else if (visibilityFilter === 'team') {
        query = query.eq('visibility', 'team');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user profiles for file owners
      const userIds = [...new Set(data?.map(file => file.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

      // Combine files with profile data
      const filesWithProfiles = (data || []).map(file => ({
        ...file,
        visibility: file.visibility as 'private' | 'team',
        profiles: profiles?.find(p => p.id === file.user_id) || null
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getFileIcon = (contentType: string | null, filename: string) => {
    if (filename.endsWith('.sol')) return Database;
    if (contentType?.startsWith('image/')) return File;
    if (contentType?.startsWith('video/')) return File;
    if (contentType?.startsWith('audio/')) return File;
    return File;
  };

  const getFileColor = (contentType: string | null, filename: string) => {
    if (filename.endsWith('.sol')) return 'text-blue-600';
    if (contentType?.startsWith('image/')) return 'text-green-600';
    if (contentType?.startsWith('video/')) return 'text-purple-600';
    if (contentType?.startsWith('audio/')) return 'text-yellow-600';
    if (contentType?.includes('pdf')) return 'text-red-600';
    return 'text-blue-600';
  };

  const filteredFiles = files.filter(file => {
    if (visibilityFilter === 'all') return true;
    if (visibilityFilter === 'private') return file.user_id === user?.id;
    if (visibilityFilter === 'team') return file.visibility === 'team';
    return true;
  });

  if (!teamId) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No team selected</h3>
          <p className="text-gray-500">Select a team to view team files</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-gray-600 rounded w-32 animate-pulse"></div>
          <div className="h-8 bg-gray-600 rounded w-24 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10 animate-pulse">
              <div className="h-8 w-8 bg-gray-600 rounded mb-3"></div>
              <div className="h-4 bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-600 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-600 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Team Files</h2>
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
          <span className="text-sm text-gray-400">{filteredFiles.length} files</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFiles.map((file) => {
          const IconComponent = getFileIcon(file.content_type, file.filename);
          const iconColor = getFileColor(file.content_type, file.filename);
          const isOwner = file.user_id === user?.id;
          
          return (
            <div
              key={file.id}
              className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <IconComponent className={`w-8 h-8 ${iconColor}`} />
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
                <h3 className="font-medium text-white text-sm truncate" title={file.filename}>
                  {file.filename}
                </h3>
                <p className="text-xs text-gray-400">{formatFileSize(file.file_size)}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(file.created_at)}</span>
                </div>
                
                {!isOwner && file.profiles && (
                  <p className="text-xs text-gray-500">
                    by {file.profiles.username || file.profiles.email}
                  </p>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-400">On-chain</span>
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
          <h3 className="text-lg font-medium text-gray-400 mb-2">No files found</h3>
          <p className="text-gray-500">
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