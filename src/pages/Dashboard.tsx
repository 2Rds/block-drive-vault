import { AppShell } from "@/components/layout";
import { DataDashboard } from "@/components/DataDashboard";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

function Dashboard(): JSX.Element {
  // Handle Box OAuth callback
  useBoxOAuth();

  return (
    <AppShell
      title="Home"
      description="View your data usage, file activity, and blockchain analytics"
    >
      <DataDashboard />
    </AppShell>
  );
}

export default Dashboard;
