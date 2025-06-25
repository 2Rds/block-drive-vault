
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const NetworkStatus = () => {
  const networkStatsData = [
    { network: 'Solana', uptime: 99.8, speed: 'Fast', cost: 'Low' },
    { network: 'Ethereum', uptime: 99.5, speed: 'Medium', cost: 'High' },
    { network: 'Polygon', uptime: 99.7, speed: 'Fast', cost: 'Low' },
  ];

  return (
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
  );
};
