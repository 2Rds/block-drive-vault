import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Globe,
  CheckCircle2,
  Clock,
  Plus,
  Shield,
  User,
  Star,
} from 'lucide-react';
import { AddEmailDomainModal } from './AddEmailDomainModal';
import type { OrganizationEmailDomain } from '@/hooks/useOrganizations';

interface TeamEmailDomainManagerProps {
  domains: OrganizationEmailDomain[];
  teamName: string;
  loading: boolean;
  onAddDomain: (domain: string) => Promise<void>;
}

const SKELETON_COUNT = 2;

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Pending';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TeamEmailDomainManager({
  domains,
  teamName,
  loading,
  onAddDomain,
}: TeamEmailDomainManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-36" />
        </div>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Email Domains</h3>
            <p className="text-sm text-muted-foreground">
              Users with these email domains can automatically join your team.
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Domain
          </Button>
        </div>

        {domains.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">No email domains configured.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your company domain to allow employees to auto-join.
            </p>
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Domain
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auto-Join</TableHead>
                  <TableHead>Default Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">@{domain.domain}</span>
                        {domain.isPrimary && (
                          <Badge variant="secondary" className="gap-1 ml-2">
                            <Star className="h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {domain.verifiedAt ? (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {domain.autoJoin ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 capitalize">
                        {domain.defaultRole === 'admin' ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {domain.defaultRole}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            How Email Domain Verification Works
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            When a user signs up with an email matching a verified domain, they'll
            automatically be added to your team with the default role. Domains marked
            as "Pending" require verification before auto-join is enabled.
          </p>
        </div>
      </div>

      <AddEmailDomainModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={onAddDomain}
        teamName={teamName}
      />
    </>
  );
}
