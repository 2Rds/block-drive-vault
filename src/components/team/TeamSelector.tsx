import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import { Team } from '@/hooks/useTeams';

interface TeamSelectorProps {
  teams: Team[];
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
}

export const TeamSelector = ({ teams, currentTeam, setCurrentTeam }: TeamSelectorProps) => {
  if (teams.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentTeam?.id || 'personal'}
        onValueChange={(value) => {
          if (value === 'personal') {
            setCurrentTeam(null);
          } else {
            const team = teams.find(t => t.id === value);
            setCurrentTeam(team || null);
          }
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">Personal Account</SelectItem>
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
