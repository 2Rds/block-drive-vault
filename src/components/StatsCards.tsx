
import React from 'react';
import { Database, Upload, Download, Archive } from 'lucide-react';

export const StatsCards = () => {
  const stats = [
    {
      title: 'Total Storage Used',
      value: '2.4 GB',
      subtitle: 'of 10 GB',
      icon: Database,
      color: 'from-blue-600 to-blue-700',
      percentage: 24,
    },
    {
      title: 'Files Uploaded Today',
      value: '12',
      subtitle: '+3 from yesterday',
      icon: Upload,
      color: 'from-purple-600 to-purple-700',
      percentage: 0,
    },
    {
      title: 'Downloads This Week',
      value: '47',
      subtitle: '+15% from last week',
      icon: Download,
      color: 'from-blue-500 to-purple-500',
      percentage: 0,
    },
    {
      title: 'Blockchain Transactions',
      value: '156',
      subtitle: 'Total confirmations',
      icon: Archive,
      color: 'from-purple-500 to-blue-500',
      percentage: 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
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
