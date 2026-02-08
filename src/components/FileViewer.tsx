import React, { useState } from 'react';
import { X, Download, ExternalLink, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPFSFile } from '@/types/ipfs';

const BYTES_PER_KB = 1024;
const SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB'] as const;

const IPFS_GATEWAYS = [
  'https://ipfs.filebase.io/ipfs',
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://dweb.link/ipfs'
] as const;

interface ImageWithFallbackProps {
  src: string;
  fallbackUrls: string[];
  alt: string;
  className: string;
}

function ImageWithFallback({ src, fallbackUrls, alt, className }: ImageWithFallbackProps): React.ReactElement {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(-1);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    const nextIndex = fallbackIndex + 1;
    if (nextIndex < fallbackUrls.length) {
      setCurrentSrc(fallbackUrls[nextIndex]);
      setFallbackIndex(nextIndex);
    } else {
      console.error('All image URLs failed to load');
      setHasError(true);
    }
  };

  const handleLoad = () => {
    setHasError(false);
  };

  if (hasError) {
    return (
      <div className="text-center py-8">
        <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Unable to display image preview</p>
        <p className="text-sm text-muted-foreground/70 mt-2">All IPFS gateways failed to load the image</p>
        <p className="text-sm text-muted-foreground/70">Click "View on IPFS" to try viewing in a new tab</p>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};

interface FileViewerProps {
  file: IPFSFile;
  onClose: () => void;
  onDownload: (file: IPFSFile) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KB));
  return parseFloat((bytes / Math.pow(BYTES_PER_KB, i)).toFixed(2)) + ' ' + SIZE_UNITS[i];
}

function getFileType(contentType: string | undefined): 'image' | 'video' | 'audio' | 'pdf' | 'other' {
  if (contentType?.startsWith('image/')) return 'image';
  if (contentType?.startsWith('video/')) return 'video';
  if (contentType?.startsWith('audio/')) return 'audio';
  if (contentType?.includes('pdf')) return 'pdf';
  return 'other';
}

export function FileViewer({ file, onClose, onDownload }: FileViewerProps): React.ReactElement {
  const fileType = getFileType(file.contentType);

  const handleViewOnIPFS = () => {
    window.open(`${IPFS_GATEWAYS[0]}/${file.cid}`, '_blank');
  };

  const getFileDisplayUrl = (): string => {
    const url = file.ipfsUrl || `${IPFS_GATEWAYS[0]}/${file.cid}`;
    return url;
  };

  const getFallbackUrls = (): string[] => {
    return IPFS_GATEWAYS.map(gateway => `${gateway}/${file.cid}`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-4xl max-h-[90vh] w-full overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <File className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">{file.filename}</h3>
              <p className="text-sm text-muted-foreground">
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
              className="bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
          {fileType === 'image' && (
            <div className="flex justify-center">
              <ImageWithFallback
                src={getFileDisplayUrl()}
                fallbackUrls={getFallbackUrls()}
                alt={file.filename}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          )}

          {fileType === 'video' && (
            <div className="flex justify-center">
              <video
                controls
                className="max-w-full max-h-full rounded-lg"
                onError={(e) => {
                  (e.target as HTMLVideoElement).style.display = 'none';
                  (e.target as HTMLVideoElement).nextElementSibling?.setAttribute('style', 'display: block');
                }}
              >
                <source src={getFileDisplayUrl()} type={file.contentType} />
                Your browser does not support the video tag.
              </video>
              <div style={{ display: 'none' }} className="text-center py-8">
                <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Unable to display video preview</p>
                <p className="text-sm text-muted-foreground/70 mt-2">Click "View on IPFS" to see the file</p>
              </div>
            </div>
          )}

          {fileType === 'audio' && (
            <div className="flex justify-center py-8">
              <audio
                controls
                className="w-full max-w-md"
                onError={(e) => {
                  (e.target as HTMLAudioElement).style.display = 'none';
                  (e.target as HTMLAudioElement).nextElementSibling?.setAttribute('style', 'display: block');
                }}
              >
                <source src={getFileDisplayUrl()} type={file.contentType} />
                Your browser does not support the audio tag.
              </audio>
              <div style={{ display: 'none' }} className="text-center py-8">
                <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Unable to play audio file</p>
                <p className="text-sm text-muted-foreground/70 mt-2">Click "View on IPFS" to access the file</p>
              </div>
            </div>
          )}

          {fileType === 'pdf' && (
            <div className="w-full h-96">
              <iframe
                src={getFileDisplayUrl()}
                className="w-full h-full rounded-lg border border-border"
                title={file.filename}
                onError={(e) => {
                  (e.target as HTMLIFrameElement).style.display = 'none';
                  (e.target as HTMLIFrameElement).nextElementSibling?.setAttribute('style', 'display: block');
                }}
              />
              <div style={{ display: 'none' }} className="text-center py-8">
                <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Unable to display PDF preview</p>
                <p className="text-sm text-muted-foreground/70 mt-2">Click "View on IPFS" to see the document</p>
              </div>
            </div>
          )}

          {fileType === 'other' && (
            <div className="text-center py-12">
              <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
              <p className="text-sm text-muted-foreground/70">
                Use the buttons above to view on IPFS or download the file
              </p>
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="text-left space-y-2">
                  <p className="text-sm text-muted-foreground"><strong>Filename:</strong> {file.filename}</p>
                  <p className="text-sm text-muted-foreground"><strong>Size:</strong> {formatFileSize(file.size)}</p>
                  <p className="text-sm text-muted-foreground"><strong>Type:</strong> {file.contentType}</p>
                  <p className="text-sm text-muted-foreground"><strong>IPFS CID:</strong> {file.cid}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
