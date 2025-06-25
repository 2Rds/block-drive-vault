
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
import { 
  Database, 
  Upload, 
  Download, 
  HardDrive, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Users,
  Shield,
  Zap
} from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

export const DataDashboard = () => {
  const { stats, loading } = useUserData();

  const networkStatsData = [
    { network: 'Solana', uptime: 99.8, speed: 'Fast', cost: 'Low' },
    { network: 'Ethereum', uptime: 99.5, speed: 'Medium', cost: 'High' },
    { network: 'Polygon', uptime: 99.7, speed: 'Fast', cost: 'Low' },
  ];

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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-800/40 border-gray-700/50 animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-600 rounded w-20"></div>
                <div className="h-6 w-6 bg-gray-600 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-600 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalStorage} GB</div>
            <p className="text-xs text-gray-400">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              {stats.totalFiles > 0 ? 'Active storage' : 'No files yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Files</CardTitle>
            <Database className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalFiles}</div>
            <p className="text-xs text-gray-400">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              {stats.totalFiles > 0 ? 'Files stored' : 'Start uploading'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Blockchain Transactions</CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalTransactions}</div>
            <p className="text-xs text-gray-400">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              {stats.totalTransactions > 0 ? '100% success rate' : 'No transactions yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Network Health</CardTitle>
            <Shield className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.networkHealth}%</div>
            <p className="text-xs text-gray-400">
              <Zap className="inline h-3 w-3 mr-1" />
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
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
            <ChartContainer config={chartConfig} className="h-80">
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
            </ChartContainer>
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
            <ChartContainer config={chartConfig} className="h-80">
              {stats.filesByType.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-400">
                  No files uploaded yet
                </div>
              )}
            </ChartContainer>
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
            <ChartContainer config={chartConfig} className="h-80">
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
            </ChartContainer>
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
            <ChartContainer config={chartConfig} className="h-80">
              <BarChart data={stats.blockchainActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="confirmations" fill="#10B981" />
                <Bar dataKey="failed" fill="#EF4444" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Network Status Table */}
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">Network Status</CardTitle>
          <CardDescription className="text-gray-400">
            Real-time blockchain network performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">Network</th>
                  <th className="text-left py-3 px-4 text-gray-300">Uptime</th>
                  <th className="text-left py-3 px-4 text-gray-300">Speed</th>
                  <th className="text-left py-3 px-4 text-gray-300">Cost</th>
                  <th className="text-left py-3 px-4 text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {networkStatsData.map((network, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-4 px-4 text-white font-medium">{network.network}</td>
                    <td className="py-4 px-4 text-green-400">{network.uptime}%</td>
                    <td className="py-4 px-4 text-gray-300">{network.speed}</td>
                    <td className="py-4 px-4 text-gray-300">{network.cost}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600/20 text-green-400">
                        Operational
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-gray-400">
            Your latest file operations and blockchain transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                  <div className="flex items-center space-x-3">
                    <Upload className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">{activity.action}</p>
                      <p className="text-gray-400 text-sm">{activity.file}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">{activity.time}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400">
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                No recent activity. Start uploading files to see your activity here.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
