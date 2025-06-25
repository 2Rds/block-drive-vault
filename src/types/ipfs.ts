
export interface IPFSFile {
  id: string;
  filename: string;
  cid: string;
  size: number;
  contentType: string;
  ipfsUrl: string;
  uploadedAt: string;
  userId: string;
  folderPath?: string;
}

export interface IPFSUploadProgress {
  uploading: boolean;
  progress: number;
}
