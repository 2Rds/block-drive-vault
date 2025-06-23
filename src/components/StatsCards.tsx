
import React from 'react';
import { Database, Upload, Download, Archive } from 'lucide-react';

export const StatsCards = () => {
  const stats = [
    {
      title: 'Total Storage Used',
      value: '2.4 GB',
      subtitle: 'of 10 GB',
      icon: Database,
      color: 'from-blue-500 to-blue-600',
      percentage: 24,
    },
    {
      title: 'Files Uploaded Today',
      value: '12',
      subtitle: '+3 from yesterday',
      icon: Upload,
      color: 'from-purple-500 to-purple-600',
      percentage: 0,
    },
    {
      title: 'Downloads This Week',
      value: '47',
      subtitle: '+15% from last week',
      icon: Download,
      color: 'from-blue-400 to-purple-400',
      percentage: 0,
    },
    {
      title: 'Blockchain Transactions',
      value: '156',
      subtitle: 'Total confirmations',
      icon: Archive,
      color: 'from-purple-400 to-blue-400',
      percentage: 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-800/30 hover:bg-blue-900/20 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-blue-200">{stat.title}</h3>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <p className="text-xs text-blue-300">{stat.subtitle}</p>
            {stat.percentage > 0 && (
              <div className="mt-3">
                <div className="w-full bg-blue-900/30 rounded-full h-2">
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
