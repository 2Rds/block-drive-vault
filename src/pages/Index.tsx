
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHybridStorage } from '@/hooks/useHybridStorage';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { HybridUploadArea } from '@/components/HybridUploadArea';
import { IPFSFileGrid } from '@/components/IPFSFileGrid';
import { StatsCards } from '@/components/StatsCards';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { IPFSFile } from '@/types/ipfs';

const Index = () => {
  const { user } = useAuth();
  const { userFiles, loading, loadUserFiles } = useHybridStorage();
  const { selectedFolder, setSelectedFolder, createFolder } = useFolderNavigation();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      console.log('Loading hybrid storage files for authenticated user');
      loadUserFiles();
    }
  }, [user, loadUserFiles]);

  const handleUploadComplete = () => {
    console.log('Hybrid upload completed, refreshing file list');
    loadUserFiles();
  };

  const handleCreateFolder = (folderName: string) => {
    createFolder(folderName);
  };

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder);
  };

  // Filter files based on search term and selected folder
  const filteredFiles = userFiles.filter((file: IPFSFile) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || file.folderPath === `/${selectedFolder}` || file.folderPath === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  // Get unique folders from files
  const folders = Array.from(new Set(
    userFiles
      .map((file: IPFSFile) => file.folderPath?.replace(/^\//, '') || '')
      .filter(folder => folder && folder !== '/')
  ));

  // Calculate storage statistics
  const totalFiles = userFiles.length;
  const totalSize = userFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const solanaFiles = userFiles.filter(file => file.metadata?.storage_type === 'solana-inscription').length;
  const ipfsFiles = userFiles.filter(file => file.metadata?.storage_type === 'ipfs' || !file.metadata?.storage_type).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Please connect your wallet to access BlockDrive</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <div className="flex">
        <Sidebar 
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          userFolders={folders}
          onFolderClick={(folderPath: string) => setSelectedFolder(folderPath)}
          openFolders={[]}
        />
        
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Enhanced Stats Cards with Hybrid Storage Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCards />
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-400">Solana Files</p>
                    <p className="text-2xl font-bold text-white">{solanaFiles}</p>
                  </div>
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Permanent on-chain storage</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-400">IPFS Files</p>
                    <p className="text-2xl font-bold text-white">{ipfsFiles}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">I</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Distributed storage</p>
              </div>
            </div>

            {/* Hybrid Upload Area */}
            <HybridUploadArea
              folderPath={selectedFolder !== 'all' ? selectedFolder : undefined}
              onUploadComplete={handleUploadComplete}
            />

            {/* Files Grid */}
            <IPFSFileGrid 
              files={filteredFiles}
              loading={loading}
              selectedFolder={selectedFolder}
              onCreateFolder={handleCreateFolder}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
