
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
  CartesianGrid
} from 'recharts';

interface ChartsSectionProps {
  stats: {
    filesByType: { name: string; value: number; color: string }[];
    storageUsageData: { month: string; storage: number; uploads: number; downloads: number }[];
    blockchainActivityData: { day: string; transactions: number; confirmations: number; failed: number }[];
  };
}

const GRID_STROKE = 'hsl(220, 26%, 20%)';
const AXIS_STROKE = 'hsl(215, 16%, 45%)';

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
      <Card className="bg-card border border-border/50 rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Storage Usage Trends</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your storage consumption over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80 w-full">
            <AreaChart data={stats.storageUsageData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="month" stroke={AXIS_STROKE} />
              <YAxis stroke={AXIS_STROKE} />
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
      <Card className="bg-card border border-border/50 rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">File Type Distribution</CardTitle>
          <CardDescription className="text-muted-foreground">
            Breakdown of your stored file types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {stats.filesByType.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-80 w-full">
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
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                No files uploaded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload/Download Activity */}
      <Card className="bg-card border border-border/50 rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Upload & Download Activity</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your file transfer activity over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80 w-full">
            <LineChart data={stats.storageUsageData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="month" stroke={AXIS_STROKE} />
              <YAxis stroke={AXIS_STROKE} />
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
      <Card className="bg-card border border-border/50 rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Blockchain Transaction Activity</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your blockchain transaction status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80 w-full">
            <BarChart data={stats.blockchainActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="day" stroke={AXIS_STROKE} />
              <YAxis stroke={AXIS_STROKE} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="confirmations" fill="#10B981" />
              <Bar dataKey="failed" fill="#EF4444" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
