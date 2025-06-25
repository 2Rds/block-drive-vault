
import React from 'react';
import { useUserData } from '@/hooks/useUserData';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { NetworkStatus } from '@/components/dashboard/NetworkStatus';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export const DataDashboard = () => {
  const { stats, loading } = useUserData();

  if (loading) {
    return (
      <div className="space-y-8">
        <MetricsCards stats={stats} loading={loading} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MetricsCards stats={stats} loading={loading} />
      <ChartsSection stats={stats} />
      <NetworkStatus />
      <RecentActivity activities={stats.recentActivity} />
    </div>
  );
};
