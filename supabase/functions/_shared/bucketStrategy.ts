/**
 * Filebase Bucket Organization Strategy
 *
 * Implements a hierarchical prefix-based organization within a single Filebase bucket.
 * This approach follows AWS best practices for multi-tenant S3 storage:
 * - Scalable: No limits on bucket creation API calls
 * - Cost-effective: Single bucket, structured prefixes
 * - Secure: Path-based access control via application logic
 *
 * BUCKET HIERARCHY:
 *
 * blockdrive-ipfs/
 * ├── personal/                          # Individual users (no team)
 * │   └── {userId}/
 * │       └── {timestamp}-{filename}
 * │
 * └── orgs/                              # Organizations/Teams
 *     └── {teamId}/
 *         ├── shared/                    # Team-wide shared files
 *         │   └── {timestamp}-{filename}
 *         └── members/                   # Per-member files within org
 *             └── {userId}/
 *                 └── {timestamp}-{filename}
 *
 * EXAMPLES:
 * - Personal user upload: personal/user_abc123/1704067200000-document.pdf
 * - Org shared file:      orgs/team_xyz789/shared/1704067200000-company-logo.png
 * - Org member file:      orgs/team_xyz789/members/user_abc123/1704067200000-report.pdf
 */

export interface BucketPathContext {
  userId: string;
  teamId?: string | null;
  isShared?: boolean;
  folderPath?: string;
}

export interface BucketPathResult {
  objectKey: string;
  storageContext: 'personal' | 'organization';
  teamId?: string;
}

/**
 * Generate the S3 object key based on user/team context
 */
export function generateObjectKey(
  filename: string,
  context: BucketPathContext
): BucketPathResult {
  const timestamp = Date.now();
  const sanitizedFilename = sanitizeFilename(filename);
  const folderSegment = normalizeFolderPath(context.folderPath);

  if (context.teamId) {
    // Organization/Team context
    const teamPrefix = context.isShared
      ? `orgs/${context.teamId}/shared`
      : `orgs/${context.teamId}/members/${context.userId}`;

    const objectKey = folderSegment
      ? `${teamPrefix}/${folderSegment}/${timestamp}-${sanitizedFilename}`
      : `${teamPrefix}/${timestamp}-${sanitizedFilename}`;

    return {
      objectKey,
      storageContext: 'organization',
      teamId: context.teamId
    };
  } else {
    // Personal/Individual context
    const objectKey = folderSegment
      ? `personal/${context.userId}/${folderSegment}/${timestamp}-${sanitizedFilename}`
      : `personal/${context.userId}/${timestamp}-${sanitizedFilename}`;

    return {
      objectKey,
      storageContext: 'personal'
    };
  }
}

/**
 * Sanitize filename for S3 compatibility
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 200); // S3 key length limit consideration
}

/**
 * Normalize folder path for consistent key structure
 */
export function normalizeFolderPath(folderPath?: string): string {
  if (!folderPath || folderPath === '/' || folderPath === '') {
    return '';
  }

  return folderPath
    .replace(/^\/+/, '')      // Remove leading slashes
    .replace(/\/+$/, '')      // Remove trailing slashes
    .replace(/\/+/g, '/')     // Normalize multiple slashes
    .replace(/[^a-zA-Z0-9._\/-]/g, '_'); // Sanitize special chars
}

/**
 * Parse an object key to extract context information
 */
export function parseObjectKey(objectKey: string): BucketPathContext | null {
  // Personal user pattern: personal/{userId}/{...}
  const personalMatch = objectKey.match(/^personal\/([^/]+)\//);
  if (personalMatch) {
    return { userId: personalMatch[1] };
  }

  // Org shared pattern: orgs/{teamId}/shared/{...}
  const orgSharedMatch = objectKey.match(/^orgs\/([^/]+)\/shared\//);
  if (orgSharedMatch) {
    return { userId: '', teamId: orgSharedMatch[1], isShared: true };
  }

  // Org member pattern: orgs/{teamId}/members/{userId}/{...}
  const orgMemberMatch = objectKey.match(/^orgs\/([^/]+)\/members\/([^/]+)\//);
  if (orgMemberMatch) {
    return { userId: orgMemberMatch[2], teamId: orgMemberMatch[1], isShared: false };
  }

  return null;
}

/**
 * Get the base path for listing files by context
 */
export function getListingPrefix(context: BucketPathContext): string {
  if (context.teamId) {
    if (context.isShared) {
      return `orgs/${context.teamId}/shared/`;
    }
    return `orgs/${context.teamId}/members/${context.userId}/`;
  }
  return `personal/${context.userId}/`;
}

/**
 * Check if a user has access to a given object key
 * (Basic validation - real access control should use database)
 */
export function validateAccess(
  objectKey: string,
  userId: string,
  userTeamIds: string[]
): boolean {
  const parsed = parseObjectKey(objectKey);
  if (!parsed) return false;

  // Personal files: only owner can access
  if (!parsed.teamId) {
    return parsed.userId === userId;
  }

  // Org files: user must be team member
  return userTeamIds.includes(parsed.teamId);
}
