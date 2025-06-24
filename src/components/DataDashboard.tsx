
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

export const DataDashboard = () => {
  // Sample data for charts
  const storageUsageData = [
    { month: 'Jan', storage: 1.2, uploads: 45, downloads: 67 },
    { month: 'Feb', storage: 1.8, uploads: 52, downloads: 89 },
    { month: 'Mar', storage: 2.1, uploads: 61, downloads: 94 },
    { month: 'Apr', storage: 2.4, uploads: 58, downloads: 102 },
    { month: 'May', storage: 2.8, uploads: 71, downloads: 115 },
    { month: 'Jun', storage: 3.2, uploads: 83, downloads: 128 },
  ];

  const fileTypeData = [
    { name: 'Documents', value: 45, color: '#8B5CF6' },
    { name: 'Images', value: 30, color: '#06B6D4' },
    { name: 'Videos', value: 15, color: '#10B981' },
    { name: 'Audio', value: 7, color: '#F59E0B' },
    { name: 'Other', value: 3, color: '#EF4444' },
  ];

  const blockchainActivityData = [
    { day: 'Mon', transactions: 12, confirmations: 11, failed: 1 },
    { day: 'Tue', transactions: 15, confirmations: 14, failed: 1 },
    { day: 'Wed', transactions: 8, confirmations: 8, failed: 0 },
    { day: 'Thu', transactions: 22, confirmations: 20, failed: 2 },
    { day: 'Fri', transactions: 18, confirmations: 17, failed: 1 },
    { day: 'Sat', transactions: 25, confirmations: 23, failed: 2 },
    { day: 'Sun', transactions: 14, confirmations: 13, failed: 1 },
  ];

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
            <div className="text-2xl font-bold text-white">3.2 GB</div>
            <p className="text-xs text-gray-400">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Files</CardTitle>
            <Database className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">1,247</div>
            <p className="text-xs text-gray-400">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +156 this week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Blockchain Transactions</CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">892</div>
            <p className="text-xs text-gray-400">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              98.5% success rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Network Health</CardTitle>
            <Shield className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">99.7%</div>
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
              Monthly storage consumption and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <AreaChart data={storageUsageData}>
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
              Breakdown of stored file types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <PieChart>
                <Pie
                  data={fileTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {fileTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Upload/Download Activity */}
        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Upload & Download Activity</CardTitle>
            <CardDescription className="text-gray-400">
              File transfer activity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <LineChart data={storageUsageData}>
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
              Daily blockchain transaction status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <BarChart data={blockchainActivityData}>
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
            Latest file operations and blockchain transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'File Upload', file: 'project-docs.pdf', time: '2 minutes ago', status: 'completed' },
              { action: 'Blockchain Confirmation', file: 'image-gallery.zip', time: '5 minutes ago', status: 'confirmed' },
              { action: 'File Download', file: 'presentation.pptx', time: '12 minutes ago', status: 'completed' },
              { action: 'File Upload', file: 'video-demo.mp4', time: '18 minutes ago', status: 'processing' },
              { action: 'Blockchain Confirmation', file: 'contract-data.json', time: '25 minutes ago', status: 'confirmed' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                <div className="flex items-center space-x-3">
                  {activity.action.includes('Upload') ? (
                    <Upload className="w-5 h-5 text-blue-400" />
                  ) : activity.action.includes('Download') ? (
                    <Download className="w-5 h-5 text-green-400" />
                  ) : (
                    <Shield className="w-5 h-5 text-purple-400" />
                  )}
                  <div>
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-gray-400 text-sm">{activity.file}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">{activity.time}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'completed' || activity.status === 'confirmed'
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-yellow-600/20 text-yellow-400'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
