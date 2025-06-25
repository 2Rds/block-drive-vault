
import React from 'react';
import { X, Download, ExternalLink, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPFSFile } from '@/types/ipfs';

interface FileViewerProps {
  file: IPFSFile;
  onClose: () => void;
  onDownload: (file: IPFSFile) => void;
}

export const FileViewer = ({ file, onClose, onDownload }: FileViewerProps) => {
  const isImage = file.contentType?.startsWith('image/');
  const isVideo = file.contentType?.startsWith('video/');
  const isAudio = file.contentType?.startsWith('audio/');
  const isPDF = file.contentType?.includes('pdf');

  const handleViewOnIPFS = () => {
    window.open(file.ipfsUrl, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] w-full overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <File className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">{file.filename}</h3>
              <p className="text-sm text-gray-400">
                {formatFileSize(file.size)} • {file.contentType}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleViewOnIPFS}
              variant="outline"
              size="sm"
              className="bg-blue-600/20 border-blue-600/50 text-blue-400 hover:bg-blue-600/30"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on IPFS
            </Button>
            <Button
              onClick={() => onDownload(file)}
              variant="outline"
              size="sm"
              className="bg-green-600/20 border-green-600/50 text-green-400 hover:bg-green-600/30"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="bg-gray-600/20 border-gray-600/50 text-gray-400 hover:bg-gray-600/30"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
          {isImage && (
            <div className="flex justify-center">
              <img
                src={file.ipfsUrl}
                alt={file.filename}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display: block');
                }}
              />
              <div style={{ display: 'none' }} className="text-center py-8">
                <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Unable to display image preview</p>
                <p className="text-sm text-gray-500 mt-2">Click "View on IPFS" to see the file</p>
              </div>
            </div>
          )}

          {isVideo && (
            <div className="flex justify-center">
              <video
                controls
                className="max-w-full max-h-full rounded-lg"
                onError={(e) => {
                  (e.target as HTMLVideoElement).style.display = 'none';
                  (e.target as HTMLVideoElement).nextElementSibling?.setAttribute('style', 'display: block');
                }}
              >
                <source src={file.ipfsUrl} type={file.contentType} />
                Your browser does not support the video tag.
              </video>
              <div style={{ display: 'none' }} className="text-center py-8">
                <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Unable to display video preview</p>
                <p className="text-sm text-gray-500 mt-2">Click "View on IPFS" to see the file</p>
              </div>
            </div>
          )}

          {isAudio && (
            <div className="flex justify-center py-8">
              <audio
                controls
                className="w-full max-w-md"
                onError={(e) => {
                  (e.target as HTMLAudioElement).style.display = 'none';
                  (e.target as HTMLAudioElement).nextElementSibling?.setAttribute('style', 'display: block');
                }}
              >
                <source src={file.ipfsUrl} type={file.contentType} />
                Your browser does not support the audio tag.
              </audio>
              <div style={{ display: 'none' }} className="text-center py-8">
                <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Unable to play audio file</p>
                <p className="text-sm text-gray-500 mt-2">Click "View on IPFS" to access the file</p>
              </div>
            </div>
          )}

          {isPDF && (
            <div className="w-full h-96">
              <iframe
                src={file.ipfsUrl}
                className="w-full h-full rounded-lg border border-gray-600"
                title={file.filename}
                onError={(e) => {
                  (e.target as HTMLIFrameElement).style.display = 'none';
                  (e.target as HTMLIFrameElement).nextElementSibling?.setAttribute('style', 'display: block');
                }}
              />
              <div style={{ display: 'none' }} className="text-center py-8">
                <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Unable to display PDF preview</p>
                <p className="text-sm text-gray-500 mt-2">Click "View on IPFS" to see the document</p>
              </div>
            </div>
          )}

          {!isImage && !isVideo && !isAudio && !isPDF && (
            <div className="text-center py-12">
              <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Preview not available for this file type</p>
              <p className="text-sm text-gray-500">
                Use the buttons above to view on IPFS or download the file
              </p>
              <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="text-left space-y-2">
                  <p className="text-sm text-gray-300"><strong>Filename:</strong> {file.filename}</p>
                  <p className="text-sm text-gray-300"><strong>Size:</strong> {formatFileSize(file.size)}</p>
                  <p className="text-sm text-gray-300"><strong>Type:</strong> {file.contentType}</p>
                  <p className="text-sm text-gray-300"><strong>IPFS CID:</strong> {file.cid}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
