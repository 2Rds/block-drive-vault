
import React from 'react';
import { Database, Upload, Download, Archive } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

export const StatsCards = () => {
  const { userStats, loading } = useUserData();

  const statsData = [
    {
      title: 'Total Storage Used',
      value: loading ? '0 GB' : `${userStats.totalStorage} GB`,
      subtitle: 'Secure blockchain storage',
      icon: Database,
      color: 'from-blue-600 to-blue-700',
      percentage: loading ? 0 : Math.min(Math.round((userStats.totalStorage / 10) * 100), 100), // Assuming 10GB limit
    },
    {
      title: 'Files Uploaded',
      value: loading ? '0' : userStats.totalFiles.toString(),
      subtitle: loading ? 'Loading...' : `${userStats.totalFiles} total files`,
      icon: Upload,
      color: 'from-blue-600 to-blue-700',
      percentage: 0,
    },
    {
      title: 'Recent Activity',
      value: loading ? '0' : userStats.recentActivity.length.toString(),
      subtitle: loading ? 'Loading...' : 'Recent actions',
      icon: Download,
      color: 'from-blue-600 to-blue-700',
      percentage: 0,
    },
    {
      title: 'Blockchain Transactions',
      value: loading ? '0' : userStats.totalTransactions.toString(),
      subtitle: loading ? 'Loading...' : 'Total confirmations',
      icon: Archive,
      color: 'from-blue-600 to-blue-700',
      percentage: 0,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-gray-600/40 w-12 h-12"></div>
            </div>
            <div className="space-y-1">
              <div className="h-4 bg-gray-600 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-600 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-600 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <div
          key={index}
          className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:bg-gray-700/30 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-300">{stat.title}</h3>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <p className="text-xs text-gray-400">{stat.subtitle}</p>
            {stat.percentage > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-700/50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${stat.color}`}
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
