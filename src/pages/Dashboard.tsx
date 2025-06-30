
import React from 'react';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Manage your BlockDrive account and subscription</p>
            </div>
            
            <SubscriptionManager />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
