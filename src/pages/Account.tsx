import { AppShell } from "@/components/layout";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { AdvancedSettings } from "@/components/settings/AdvancedSettings";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

function Account(): JSX.Element {
  // Handle Box OAuth callback
  useBoxOAuth();

  return (
    <AppShell
      title="Account"
      description="Manage your BlockDrive account and subscription"
    >
      <div className="max-w-4xl space-y-6">
        <SubscriptionManager />
        <AdvancedSettings />
      </div>
    </AppShell>
  );
}

export default Account;
