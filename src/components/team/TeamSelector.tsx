import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeams } from '@/hooks/useTeams';
import { Users } from 'lucide-react';

export const TeamSelector = () => {
  const { teams, currentTeam, setCurrentTeam } = useTeams();

  if (teams.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentTeam?.id || ''}
        onValueChange={(value) => {
          const team = teams.find(t => t.id === value);
          setCurrentTeam(team || null);
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Personal Account</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};