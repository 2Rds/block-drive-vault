
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <div className="flex">
        <Sidebar selectedFolder={selectedFolder} onFolderSelect={setSelectedFolder} />
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto space-y-6">
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
