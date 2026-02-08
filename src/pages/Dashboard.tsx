import { AppShell } from "@/components/layout";
import { DataDashboard } from "@/components/DataDashboard";
import { MembershipCard } from "@/components/dashboard/MembershipCard";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

function Dashboard(): JSX.Element {
  // Handle Box OAuth callback
  useBoxOAuth();

  return (
    <AppShell
      title="Home"
      description="View your data usage, file activity, and blockchain analytics"
    >
      <div className="space-y-6">
        <MembershipCard />
        <DataDashboard />
      </div>
    </AppShell>
  );
}

export default Dashboard;
