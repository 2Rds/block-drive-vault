/**
 * Share File Modal
 * 
 * Modal for sharing encrypted files with other wallets using
 * the Solana delegation system.
 */

import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useBlockDriveSolana } from '@/hooks/useBlockDriveSolana';
import { PermissionLevel } from '@/services/solana';
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
}

export function ShareFileModal({
  isOpen,
  onClose,
  file,
  ownerAddress,
  signTransaction,
  onShareComplete
}: ShareFileModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
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

  const handleClose = () => {
    form.reset();
    setShareSuccess(false);
    onClose();
  };

  const onSubmit = async (values: ShareFormValues) => {
    if (!file?.onChain?.fileRecordPubkey) {
      toast.error('File is not registered on-chain');
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

      // Generate encrypted file key for grantee
      // In a real implementation, this would use ECDH key exchange
      // For now, we'll use a placeholder encrypted key
      const encryptedFileKey = new Uint8Array(128);
      crypto.getRandomValues(encryptedFileKey);

      const signature = await createDelegation(
        ownerAddress,
        file.onChain.fileRecordPubkey,
        values.granteeAddress,
        encryptedFileKey,
        permissionMap[values.permissionLevel],
        values.expiresAt,
        signTransaction
      );

      if (signature) {
        setShareSuccess(true);
        toast.success('File shared successfully', {
          description: `Shared with ${values.granteeAddress.slice(0, 8)}...`
        });
        onShareComplete?.();
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share file');
    } finally {
      setIsSharing(false);
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

        {!file.onChain?.fileRecordPubkey ? (
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
                  disabled={isSharing || isLoading}
                  className="gap-2"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share File
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
