
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

interface ChartsSectionProps {
  stats: {
    filesByType: { name: string; value: number; color: string }[];
    storageUsageData: { month: string; storage: number; uploads: number; downloads: number }[];
    blockchainActivityData: { day: string; transactions: number; confirmations: number; failed: number }[];
  };
}

export const ChartsSection = ({ stats }: ChartsSectionProps) => {
  const chartConfig = {
    storage: {
      label: "Storage (GB)",
      color: "#8B5CF6",
    },
    uploads: {
      label: "Uploads",
      color: "#06B6D4",
    },
    downloads: {
      label: "Downloads", 
      color: "#10B981",
    },
    transactions: {
      label: "Transactions",
      color: "#8B5CF6",
    },
    confirmations: {
      label: "Confirmed",
      color: "#10B981",
    },
    failed: {
      label: "Failed",
      color: "#EF4444",
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Storage Usage Over Time */}
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">Storage Usage Trends</CardTitle>
          <CardDescription className="text-gray-400">
            Your storage consumption over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.storageUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="storage" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* File Type Distribution */}
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">File Type Distribution</CardTitle>
          <CardDescription className="text-gray-400">
            Breakdown of your stored file types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {stats.filesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.filesByType}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {stats.filesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-400">
                No files uploaded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload/Download Activity */}
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">Upload & Download Activity</CardTitle>
          <CardDescription className="text-gray-400">
            Your file transfer activity over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.storageUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="uploads" 
                  stroke="#06B6D4" 
                  strokeWidth={3}
                  dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="downloads" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Blockchain Activity */}
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">Blockchain Transaction Activity</CardTitle>
          <CardDescription className="text-gray-400">
            Your blockchain transaction status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.blockchainActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="confirmations" fill="#10B981" />
                <Bar dataKey="failed" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
