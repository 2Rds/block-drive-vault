
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { FileGrid } from '@/components/FileGrid';
import { UploadArea } from '@/components/UploadArea';
import { StatsCards } from '@/components/StatsCards';
import { WalletInfo } from '@/components/WalletInfo';

const Index = () => {
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <div className="flex">
        <Sidebar selectedFolder={selectedFolder} onFolderSelect={setSelectedFolder} />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Your Files</h1>
                <p className="text-slate-400 mt-1">Secure Web3 decentralized storage</p>
              </div>
            </div>
            <WalletInfo />
            <StatsCards />
            <UploadArea isUploading={isUploading} setIsUploading={setIsUploading} />
            <FileGrid selectedFolder={selectedFolder} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
