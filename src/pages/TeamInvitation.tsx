import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XCircle, Users, Mail } from 'lucide-react';

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-4" />
        <div className="h-32 bg-muted rounded w-96" />
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onNavigateHome: () => void;
}

function ErrorState({ error, onNavigateHome }: ErrorStateProps): JSX.Element {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-red-500" />
            <CardTitle>Invalid Invitation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={onNavigateHome} className="w-full">Go Home</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginPrompt({ onNavigateAuth }: { onNavigateAuth: () => void }): JSX.Element {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-500" />
            <CardTitle>Team Invitation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You need to be logged in to accept this team invitation.
          </p>
          <Button onClick={onNavigateAuth} className="w-full">Login / Sign Up</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeamInvitation(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { acceptInvitation } = useTeams();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/team-invitation/${token}`);
        if (!response.ok) {
          throw new Error('Failed to fetch invitation');
        }
        const data = await response.json();
        setInvitation(data);
      } catch {
        setError('Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token || !user) return;

    setAccepting(true);
    try {
      const success = await acceptInvitation(token);
      if (success) {
        navigate('/teams');
      }
    } catch {
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onNavigateHome={() => navigate('/')} />;
  }

  if (!user) {
    return <LoginPrompt onNavigateAuth={() => navigate('/auth')} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            <CardTitle>Team Invitation</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              You've been invited to join
            </p>
            <p className="text-2xl font-bold text-primary">
              {invitation?.team?.name || 'Team'}
            </p>
            <Badge variant="outline" className="mt-2">
              {invitation?.role || 'Member'}
            </Badge>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Accept this invitation to collaborate with your team members and access shared files.
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="flex-1"
              >
                {accepting ? 'Accepting...' : 'Accept Invitation'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Decline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}