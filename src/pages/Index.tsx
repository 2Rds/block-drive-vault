
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { FileGrid } from '@/components/FileGrid';
import { IPFSUploadArea } from '@/components/IPFSUploadArea';
import { StatsCards } from '@/components/StatsCards';
import { WalletInfo } from '@/components/WalletInfo';
import { DataDashboard } from '@/components/DataDashboard';
import { Button } from '@/components/ui/button';
import { BarChart3, Files, Upload, Slack } from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';

const Index = () => {
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [activeView, setActiveView] = useState<'dashboard' | 'files'>('files'); // Default to files to show IPFS upload
  const [userFolders, setUserFolders] = useState<string[]>([]);
  const [showSlackIntegration, setShowSlackIntegration] = useState(false);

  const handleCreateFolder = (folderName: string) => {
    setUserFolders(prev => [...prev, folderName]);
    console.log('User folders updated:', [...userFolders, folderName]);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar 
          selectedFolder={selectedFolder} 
          onFolderSelect={setSelectedFolder}
          userFolders={userFolders}
        />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {activeView === 'dashboard' ? 'Analytics Dashboard' : 'IPFS File Storage'}
                </h1>
                <p className="text-gray-300 mt-1">
                  {activeView === 'dashboard' 
                    ? 'Comprehensive insights into your BlockDrive usage'
                    : 'Decentralized file storage on the InterPlanetary File System'
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
                      : 'bg-blue-600/20 border-blue-600/50 text-blue-400 hover:bg-blue-600/30 hover:border-blue-600/70 hover:text-blue-300'
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
                      : 'bg-blue-600/20 border-blue-600/50 text-blue-400 hover:bg-blue-600/30 hover:border-blue-600/70 hover:text-blue-300'
                  }`}
                >
                  <Files className="w-4 h-4 mr-2" />
                  IPFS Files
                </Button>
                <Button
                  onClick={() => setShowSlackIntegration(true)}
                  variant="outline"
                  className="bg-blue-600/20 border-blue-600/50 text-blue-400 hover:bg-blue-600/30 hover:border-blue-600/70 hover:text-blue-300"
                >
                  <Slack className="w-4 h-4 mr-2" />
                  Slack
                </Button>
              </div>
            </div>

            <WalletInfo />

            {activeView === 'dashboard' ? (
              <DataDashboard />
            ) : (
              <>
                <StatsCards />
                <IPFSUploadArea 
                  onCreateFolder={handleCreateFolder}
                  selectedFolder={selectedFolder}
                />
                <FileGrid selectedFolder={selectedFolder} userFolders={userFolders} />
              </>
            )}
          </div>
        </main>
      </div>

      <SlackIntegration
        isOpen={showSlackIntegration}
        onClose={() => setShowSlackIntegration(false)}
      />
    </div>
  );
};

export default Index;
