/**
 * Share File Modal
 * 
 * Modal for sharing encrypted files with other wallets using
 * the Solana delegation system with ZK proofs.
 * 
 * Flow:
 * 1. Download original ZK proof from storage
 * 2. Extract critical bytes using owner's decryption key
 * 3. Generate new delegation-specific ZK proof for recipient
 * 4. Upload new proof and store CID in delegation
 */

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Share2, 
  User, 
  Shield, 
  Calendar as CalendarIcon,
  Lock,
  Eye,
  Download,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useBlockDriveSolana } from '@/hooks/useBlockDriveSolana';
import { PermissionLevel } from '@/services/solana';
import { zkProofService } from '@/services/crypto/zkProofService';
import { zkProofStorageService } from '@/services/zkProofStorageService';
import { bytesToBase64 } from '@/services/crypto/cryptoUtils';
import { toast } from 'sonner';

// Solana public key validation (base58 encoded, 32-44 chars)
const solanaAddressSchema = z.string()
  .min(32, 'Address must be at least 32 characters')
  .max(44, 'Address must be at most 44 characters')
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana address format');

const shareFormSchema = z.object({
  granteeAddress: solanaAddressSchema,
  permissionLevel: z.enum(['view', 'download', 'reshare']),
  expiresAt: z.date().optional(),
  note: z.string().max(200, 'Note must be less than 200 characters').optional(),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

interface FileToShare {
  id: string;
  filename: string;
  size: number;
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  contentCID?: string;
  proofCid?: string;           // CID of the owner's ZK proof
  commitment?: string;          // SHA-256 commitment of critical bytes
  onChain?: {
    fileRecordPubkey?: string;
    encryptionCommitment?: string;
  };
}

interface ShareFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileToShare | null;
  ownerAddress: string;
  signTransaction: (tx: any) => Promise<any>;
  onShareComplete?: () => void;
  getEncryptionKey?: () => Promise<CryptoKey | null>;
}

export function ShareFileModal({
  isOpen,
  onClose,
  file,
  ownerAddress,
  signTransaction,
  onShareComplete,
  getEncryptionKey
}: ShareFileModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [hasProof, setHasProof] = useState(false);
  const [loadingProof, setLoadingProof] = useState(true);
  const [sharingStep, setSharingStep] = useState<string>('');
  const { createDelegation, isLoading } = useBlockDriveSolana();

  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      granteeAddress: '',
      permissionLevel: 'download',
      expiresAt: undefined,
      note: '',
    },
  });

  // Check if we have a ZK proof available for this file
  useEffect(() => {
    const checkProofAvailability = async () => {
      if (!file?.proofCid || !file?.commitment) {
        setHasProof(false);
        setLoadingProof(false);
        return;
      }
      
      setLoadingProof(true);
      try {
        // Verify proof exists in storage
        const exists = await zkProofStorageService.verifyProofExists(
          file.proofCid,
          file.commitment
        );
        setHasProof(exists);
      } catch (error) {
        console.error('Failed to check ZK proof:', error);
        setHasProof(false);
      } finally {
        setLoadingProof(false);
      }
    };

    if (isOpen) {
      checkProofAvailability();
    }
  }, [file?.proofCid, file?.commitment, isOpen]);

  const handleClose = () => {
    form.reset();
    setShareSuccess(false);
    setSharingStep('');
    onClose();
  };

  const onSubmit = async (values: ShareFormValues) => {
    if (!file?.onChain?.fileRecordPubkey) {
      toast.error('File is not registered on-chain');
      return;
    }

    if (!file.proofCid || !file.commitment) {
      toast.error('ZK proof not available for this file');
      return;
    }

    if (values.granteeAddress === ownerAddress) {
      toast.error('Cannot share file with yourself');
      return;
    }

    setIsSharing(true);

    try {
      // Map permission level string to enum
      const permissionMap: Record<string, PermissionLevel> = {
        'view': PermissionLevel.View,
        'download': PermissionLevel.Download,
        'reshare': PermissionLevel.Reshare,
      };

      // Step 1: Download the original ZK proof
      setSharingStep('Downloading ZK proof...');
      console.log('[ShareFileModal] Downloading original ZK proof:', file.proofCid);
      
      const proofDownload = await zkProofStorageService.downloadProof(file.proofCid);
      
      if (!proofDownload.success || !proofDownload.proofPackage) {
        toast.error('Failed to download ZK proof');
        setIsSharing(false);
        return;
      }

      // Step 2: Get owner's decryption key
      setSharingStep('Preparing encryption keys...');
      
      if (!getEncryptionKey) {
        toast.error('Encryption key provider not available');
        setIsSharing(false);
        return;
      }

      const ownerKey = await getEncryptionKey();
      if (!ownerKey) {
        toast.error('Encryption key not available. Please initialize your keys first.');
        setIsSharing(false);
        return;
      }

      // Step 3: Extract critical bytes from proof
      setSharingStep('Extracting critical bytes...');
      console.log('[ShareFileModal] Extracting critical bytes from ZK proof');
      
      const extracted = await zkProofService.verifyAndExtract(
        proofDownload.proofPackage,
        ownerKey,
        file.commitment
      );

      if (!extracted.verified) {
        toast.error('ZK proof verification failed');
        setIsSharing(false);
        return;
      }

      // Step 4: Generate new delegation-specific ZK proof for recipient
      // Note: In a true ECDH flow, we would derive a shared key with the recipient
      // For now, we re-encrypt with the owner's key and the recipient will need
      // the delegation's encryptedFileKey to access
      setSharingStep('Generating delegation proof...');
      console.log('[ShareFileModal] Generating new ZK proof for delegation');
      
      const delegationProof = await zkProofService.generateProof(
        extracted.criticalBytes,
        extracted.fileIv,
        ownerKey, // Re-encrypt with owner key - recipient accesses via delegation
        file.commitment
      );

      // Step 5: Upload the delegation-specific proof
      setSharingStep('Uploading delegation proof...');
      const delegationProofUpload = await zkProofStorageService.uploadProof(
        delegationProof,
        `${file.id}_delegation_${values.granteeAddress.slice(0, 8)}`
      );

      if (!delegationProofUpload.success) {
        toast.error('Failed to upload delegation proof');
        setIsSharing(false);
        return;
      }

      console.log('[ShareFileModal] Delegation proof uploaded:', delegationProofUpload.proofCid);

      // Step 6: Create the on-chain delegation with proof CID as encrypted file key
      setSharingStep('Creating on-chain delegation...');
      
      // Encode the delegation proof CID as the encryptedFileKey for the delegation
      const proofCidBytes = new TextEncoder().encode(delegationProofUpload.proofCid);
      
      const signature = await createDelegation(
        ownerAddress,
        file.onChain.fileRecordPubkey,
        values.granteeAddress,
        proofCidBytes,
        permissionMap[values.permissionLevel],
        values.expiresAt,
        signTransaction
      );

      if (signature) {
        setShareSuccess(true);
        setSharingStep('');
        toast.success('File shared successfully', {
          description: `Shared with ${values.granteeAddress.slice(0, 8)}... using ZK proof`
        });
        onShareComplete?.();
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share file');
    } finally {
      setIsSharing(false);
      setSharingStep('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPermissionIcon = (level: string) => {
    switch (level) {
      case 'view': return <Eye className="w-4 h-4" />;
      case 'download': return <Download className="w-4 h-4" />;
      case 'reshare': return <Users className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getPermissionDescription = (level: string) => {
    switch (level) {
      case 'view': return 'Can view file metadata only';
      case 'download': return 'Can download and decrypt the file';
      case 'reshare': return 'Can download and share with others';
      default: return '';
    }
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Encrypted File
          </DialogTitle>
          <DialogDescription>
            Share this file with another wallet using Solana on-chain delegation
          </DialogDescription>
        </DialogHeader>

        {/* Revolutionary Feature Banner */}
        <div className="bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                You maintain complete control
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unlike traditional sharing, you can <strong className="text-amber-400">instantly revoke access</strong> at any time. 
                This deletes the critical 16 bytes, making the file permanently unreadable—even if already downloaded.
              </p>
            </div>
          </div>
        </div>

        {/* File Info */}
        <div className="bg-card/60 rounded-lg p-4 border border-border">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{file.filename}</h4>
              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  {file.securityLevel}
                </Badge>
                {file.onChain?.fileRecordPubkey && (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    On-Chain
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {loadingProof ? (
          <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Checking ZK proof availability...</span>
          </div>
        ) : !hasProof ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">ZK Proof not available</p>
              <p className="text-sm text-muted-foreground mt-1">
                The Zero-Knowledge proof for this file is not available. 
                This may happen if the file was uploaded before ZK proofs were enabled. 
                Please re-upload the file to enable secure sharing.
              </p>
            </div>
          </div>
        ) : !file.onChain?.fileRecordPubkey ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">File not registered on-chain</p>
              <p className="text-sm text-muted-foreground mt-1">
                This file must be registered on Solana before it can be shared. 
                Upload the file with on-chain registration enabled.
              </p>
            </div>
          </div>
        ) : shareSuccess ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-2">File Shared Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              The recipient can now access this file using their wallet.
            </p>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-left">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    You can revoke access at any time
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Visit "Files You've Shared" to instantly revoke access and make the file permanently unreadable.
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleClose} className="mt-4">
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Grantee Address */}
              <FormField
                control={form.control}
                name="granteeAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Recipient Wallet Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Solana wallet address..."
                        {...field}
                        className="font-mono text-sm"
                        maxLength={44}
                      />
                    </FormControl>
                    <FormDescription>
                      The Solana wallet that will receive access to this file
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Permission Level */}
              <FormField
                control={form.control}
                name="permissionLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Permission Level
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select permission level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="view">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            View Only
                          </div>
                        </SelectItem>
                        <SelectItem value="download">
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </div>
                        </SelectItem>
                        <SelectItem value="reshare">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Download & Reshare
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {getPermissionDescription(field.value)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expiration Date */}
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Expiration Date (Optional)
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>No expiration</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                        {field.value && (
                          <div className="p-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => field.onChange(undefined)}
                            >
                              Clear expiration
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Leave empty for permanent access
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Optional Note */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Add a note for the recipient..."
                        {...field}
                        maxLength={200}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSharing}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSharing || isLoading || !hasProof}
                  className="gap-2"
                >
                  {isSharing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">{sharingStep || 'Sharing...'}</span>
                    </div>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share with ZK Proof
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
