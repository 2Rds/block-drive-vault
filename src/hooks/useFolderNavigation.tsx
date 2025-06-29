
import { useState } from 'react';
import { IPFSFile } from '@/types/ipfs';

interface FolderNavigationState {
  currentPath: string;
  openFolders: string[];
  selectedFile: IPFSFile | null;
  showFileViewer: boolean;
}

export const useFolderNavigation = () => {
  const [state, setState] = useState<FolderNavigationState>({
    currentPath: '/',
    openFolders: [],
    selectedFile: null,
    showFileViewer: false
  });

  const navigateToFolder = (folderPath: string) => {
    setState(prev => ({
      ...prev,
      currentPath: folderPath,
      selectedFile: null,
      showFileViewer: false
    }));
  };

  const toggleFolder = (folderPath: string) => {
    setState(prev => ({
      ...prev,
      openFolders: prev.openFolders.includes(folderPath)
        ? prev.openFolders.filter(path => path !== folderPath)
        : [...prev.openFolders, folderPath]
    }));
  };

  const selectFile = (file: IPFSFile) => {
    setState(prev => ({
      ...prev,
      selectedFile: file,
      showFileViewer: true
    }));
  };

  const closeFileViewer = () => {
    setState(prev => ({
      ...prev,
      selectedFile: null,
      showFileViewer: false
    }));
  };

  const goBack = () => {
    const pathSegments = state.currentPath.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      pathSegments.pop();
      const newPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/';
      navigateToFolder(newPath);
    }
  };

  return {
    currentPath: state.currentPath,
    openFolders: state.openFolders,
    selectedFile: state.selectedFile,
    showFileViewer: state.showFileViewer,
    navigateToFolder,
    toggleFolder,
    selectFile,
    closeFileViewer,
    goBack
  };
};
