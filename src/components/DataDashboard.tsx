
import React from 'react';
import { useUserData } from '@/hooks/useUserData';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { NetworkStatus } from '@/components/dashboard/NetworkStatus';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export const DataDashboard = () => {
  const { userStats, loading } = useUserData();

  if (loading) {
    return (
      <div className="space-y-8">
        <MetricsCards stats={userStats} loading={loading} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MetricsCards stats={userStats} loading={loading} />
      <ChartsSection stats={userStats} />
      <NetworkStatus />
      <RecentActivity activities={userStats.recentActivity} />
    </div>
  );
};
