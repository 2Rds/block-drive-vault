/**
 * Create Team Onboarding page — stub until WS6 (Supabase org management).
 */

import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useOrganizationList, useUser } from '@/hooks/useOrganizationCompat';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreateTeamOnboarding(): JSX.Element {
  const navigate = useNavigate();
  const { user, isLoaded: userLoaded } = useUser();
  const { organizationList, isLoaded } = useOrganizationList();

  // If user already has organizations, redirect to dashboard
  useEffect(() => {
    if (isLoaded && organizationList && organizationList.length > 0) {
      navigate('/dashboard');
    }
  }, [isLoaded, organizationList, navigate]);

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 mb-4">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Your Team</h1>
          <p className="text-[#a1a1aa] max-w-md mx-auto">
            Team creation is being upgraded. You can create a team from the dashboard soon.
          </p>
        </div>

        <div className="text-center">
          <Button onClick={() => navigate('/dashboard')} variant="default">
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
