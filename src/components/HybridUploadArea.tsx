
import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useHybridStorage } from '@/hooks/useHybridStorage';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HybridStorageService, StorageStrategy } from '@/services/hybridStorageService';

interface HybridUploadAreaProps {
  folderPath?: string;
  onUploadComplete?: () => void;
}

export const HybridUploadArea: React.FC<HybridUploadAreaProps> = ({
  folderPath,
  onUploadComplete
}) => {
  const { uploading, uploadProgress, uploadFiles } = useHybridStorage();
  const [dragActive, setDragActive] = useState(false);
  const [analysisPreview, setAnalysisPreview] = useState<{
    files: File[];
    strategies: StorageStrategy[];
  } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      showAnalysisPreview(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      showAnalysisPreview(files);
    }
  };

  const showAnalysisPreview = (files: File[]) => {
    const fileList = {
      length: files.length,
      item: (index: number) => files[index],
      [Symbol.iterator]: function* () {
        for (let i = 0; i < files.length; i++) {
          yield files[i];
        }
      }
    } as FileList;

    const strategies = files.map(file => HybridStorageService.analyzeFile(file));
    
    setAnalysisPreview({
      files,
      strategies
    });
  };

  const handleUpload = async () => {
    if (!analysisPreview) return;

    const fileList = {
      length: analysisPreview.files.length,
      item: (index: number) => analysisPreview.files[index],
      [Symbol.iterator]: function* () {
        for (let i = 0; i < analysisPreview.files.length; i++) {
          yield analysisPreview.files[i];
        }
      }
    } as FileList;

    const results = await uploadFiles(fileList, folderPath);
    
    if (results && results.some(r => r.success)) {
      setAnalysisPreview(null);
      onUploadComplete?.();
    }
  };

  const cancelUpload = () => {
    setAnalysisPreview(null);
  };

  const getStorageIcon = (type: 'ipfs' | 'solana-inscription') => {
    return type === 'solana-inscription' ? (
      <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">S</span>
      </div>
    ) : (
      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">I</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {!analysisPreview ? (
        <Card className="border-2 border-dashed border-gray-700 hover:border-gray-600 transition-colors">
          <CardContent className="p-8">
            <div
              className={`text-center ${dragActive ? 'bg-gray-800/50 rounded-lg p-4' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Upload Files with Hybrid Storage
              </h3>
              <p className="text-gray-400 mb-4">
                Drag and drop files here, or click to select files
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Our AI will automatically choose the best storage method for each file
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Select Files'}
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Storage Analysis</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
                <button
                  onClick={cancelUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {analysisPreview.files.map((file, index) => {
                const strategy = analysisPreview.strategies[index];
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-white">{file.name}</div>
                        <div className="text-sm text-gray-400">
                          {(file.size / 1024).toFixed(1)} KB • {file.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          {getStorageIcon(strategy.type)}
                          <span className="text-sm font-medium text-white">
                            {strategy.type === 'solana-inscription' ? 'Solana Inscription' : 'IPFS'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">{strategy.reason}</div>
                        <div className="text-xs text-green-400">
                          {strategy.estimated_cost} • {strategy.permanence}
                        </div>
                      </div>
                      {strategy.type === 'solana-inscription' ? (
                        <CheckCircle className="w-5 h-5 text-orange-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Storage Distribution:</span>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-white">
                      {analysisPreview.strategies.filter(s => s.type === 'solana-inscription').length} Solana
                    </span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-white">
                      {analysisPreview.strategies.filter(s => s.type === 'ipfs').length} IPFS
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Uploading to hybrid storage...</span>
                  <span className="text-sm text-gray-400">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
