import { useState } from 'react';
import { Eye, EyeOff, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileVisibilityToggleProps {
  fileId: string;
  currentVisibility: 'private' | 'team';
  onVisibilityChange?: (newVisibility: 'private' | 'team') => void;
  disabled?: boolean;
}

export const FileVisibilityToggle = ({ 
  fileId, 
  currentVisibility, 
  onVisibilityChange,
  disabled = false 
}: FileVisibilityToggleProps) => {
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState(currentVisibility);

  const toggleVisibility = async () => {
    if (disabled) return;
    
    setLoading(true);
    const newVisibility = visibility === 'private' ? 'team' : 'private';
    
    try {
      const { error } = await supabase
        .from('files')
        .update({ visibility: newVisibility })
        .eq('id', fileId);

      if (error) throw error;

      setVisibility(newVisibility);
      onVisibilityChange?.(newVisibility);
      
      const message = newVisibility === 'team' 
        ? 'File is now visible to all team members'
        : 'File is now private to you';
      toast.success(message);
    } catch (error) {
      console.error('Error updating file visibility:', error);
      toast.error('Failed to update file visibility');
    } finally {
      setLoading(false);
    }
  };

  const getVisibilityIcon = () => {
    if (visibility === 'team') {
      return <Users className="h-3 w-3" />;
    }
    return <Lock className="h-3 w-3" />;
  };

  const getVisibilityColor = () => {
    if (visibility === 'team') {
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    }
    return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  };

  const getVisibilityText = () => {
    return visibility === 'team' ? 'Team' : 'Private';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className={`text-xs ${getVisibilityColor()}`}
      >
        {getVisibilityIcon()}
        <span className="ml-1">{getVisibilityText()}</span>
      </Badge>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleVisibility}
        disabled={loading || disabled}
        className="h-6 w-6 p-0 hover:bg-white/10"
        title={`Make ${visibility === 'private' ? 'visible to team' : 'private'}`}
      >
        {visibility === 'private' ? (
          <EyeOff className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};