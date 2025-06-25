
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { FileGrid } from '@/components/FileGrid';
import { UploadArea } from '@/components/UploadArea';
import { StatsCards } from '@/components/StatsCards';
import { WalletInfo } from '@/components/WalletInfo';
import { DataDashboard } from '@/components/DataDashboard';
import { Button } from '@/components/ui/button';
import { BarChart3, Files, Upload } from 'lucide-react';

const Index = () => {
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [isUploading, setIsUploading] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'files'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar selectedFolder={selectedFolder} onFolderSelect={setSelectedFolder} />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {activeView === 'dashboard' ? 'Analytics Dashboard' : 'Your Files'}
                </h1>
                <p className="text-gray-300 mt-1">
                  {activeView === 'dashboard' 
                    ? 'Comprehensive insights into your BlockDrive usage'
                    : 'Secure Web3 decentralized storage'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setActiveView('dashboard')}
                  variant={activeView === 'dashboard' ? 'default' : 'outline'}
                  className={`${
                    activeView === 'dashboard'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border-gray-600 text-gray-300 hover:bg-blue-600/20 hover:border-blue-600/50 hover:text-blue-400'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  onClick={() => setActiveView('files')}
                  variant={activeView === 'files' ? 'default' : 'outline'}
                  className={`${
                    activeView === 'files'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border-gray-600 text-gray-300 hover:bg-blue-600/20 hover:border-blue-600/50 hover:text-blue-400'
                  }`}
                >
                  <Files className="w-4 h-4 mr-2" />
                  Files
                </Button>
              </div>
            </div>

            <WalletInfo />

            {activeView === 'dashboard' ? (
              <DataDashboard />
            ) : (
              <>
                <StatsCards />
                <UploadArea isUploading={isUploading} setIsUploading={setIsUploading} />
                <FileGrid selectedFolder={selectedFolder} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
