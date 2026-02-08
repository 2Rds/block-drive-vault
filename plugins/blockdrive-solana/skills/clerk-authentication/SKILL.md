---
name: Clerk Authentication
description: This skill should be used when the user asks about "Clerk authentication", "JWT tokens", "Clerk session", "useAuth hook", "useSession hook", "getToken", "Clerk OAuth", "Clerk Organizations", "OIDC integration", "Clerk JWT for Alchemy", or needs to implement authentication flows using Clerk. Covers JWT token handling, session management, and integration with external services.
version: 0.1.0
---

# Clerk Authentication

## Overview

Clerk provides complete user authentication infrastructure including sign-up, sign-in, session management, and JWT tokens for integrating with external services like Alchemy. BlockDrive uses Clerk as the identity provider for the entire application.

## When to Use

Activate this skill when:
- Implementing user authentication flows
- Getting JWT tokens for external service auth
- Managing user sessions
- Setting up Clerk Organizations for teams
- Integrating Clerk with Alchemy embedded wallets

## Core Concepts

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLERK AUTH FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│  1. User visits app → Clerk UI component shown                  │
│  2. User signs in (email, OAuth, etc.)                          │
│  3. Clerk creates session → JWT available                       │
│  4. App accesses user data via hooks                            │
│  5. JWT used for external service auth (Alchemy, Supabase)     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Hooks

```typescript
import {
  useAuth,      // Authentication state and methods
  useUser,      // User profile data
  useSession,   // Current session
  useClerk      // Clerk instance for advanced operations
} from '@clerk/clerk-react';
```

## Implementation Patterns

### Provider Setup

```tsx
import { ClerkProvider } from '@clerk/clerk-react';

function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <YourApp />
    </ClerkProvider>
  );
}
```

### Check Authentication State

```typescript
import { useAuth } from '@clerk/clerk-react';

function ProtectedComponent() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <ProtectedContent />;
}
```

### Get JWT Token

Critical for Alchemy integration:

```typescript
import { useAuth } from '@clerk/clerk-react';

function useAlchemyAuth() {
  const { getToken } = useAuth();

  const getAlchemyToken = async () => {
    // Get the session token
    const token = await getToken();

    if (!token) {
      throw new Error('No session token available');
    }

    return token;
  };

  return { getAlchemyToken };
}
```

### Access User Data

```typescript
import { useUser } from '@clerk/clerk-react';

function UserProfile() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) return null;

  return (
    <div>
      <p>Email: {user.primaryEmailAddress?.emailAddress}</p>
      <p>Name: {user.fullName}</p>
      <p>ID: {user.id}</p>
    </div>
  );
}
```

### Session Management

```typescript
import { useSession } from '@clerk/clerk-react';

function SessionInfo() {
  const { session, isLoaded } = useSession();

  if (!isLoaded || !session) return null;

  return (
    <div>
      <p>Session ID: {session.id}</p>
      <p>Last Active: {session.lastActiveAt}</p>
      <p>Expires: {session.expireAt}</p>
    </div>
  );
}
```

## JWT Token for Alchemy

### Token Flow

```typescript
// 1. Get Clerk session token
const { getToken } = useAuth();
const clerkToken = await getToken();

// 2. Use token with Alchemy Web Signer
const signerClient = new AlchemySignerWebClient({
  connection: { jwt: clerkToken },
  iframeConfig: { iframeContainerId: 'alchemy-signer-iframe-container' },
});

// 3. Authenticate with Alchemy
await signerClient.submitJwt({
  jwt: clerkToken,
  authProvider: 'clerk',
});
```

### Token Refresh

Clerk tokens expire. Handle refresh:

```typescript
const { getToken } = useAuth();

// Always get fresh token before sensitive operations
const performSecureOperation = async () => {
  const freshToken = await getToken(); // Gets fresh token if needed

  // Use token...
};
```

## Clerk Organizations

For team/B2B features:

### Setup Organizations

```typescript
import { useOrganization, useOrganizationList } from '@clerk/clerk-react';

function TeamSelector() {
  const { organization, isLoaded } = useOrganization();
  const { organizationList, setActive } = useOrganizationList();

  const switchOrg = async (orgId: string) => {
    await setActive({ organization: orgId });
  };

  return (
    <select onChange={(e) => switchOrg(e.target.value)}>
      {organizationList?.map(org => (
        <option key={org.organization.id} value={org.organization.id}>
          {org.organization.name}
        </option>
      ))}
    </select>
  );
}
```

### Organization Membership

```typescript
import { useOrganization } from '@clerk/clerk-react';

function TeamMembers() {
  const { organization, membershipList } = useOrganization({
    membershipList: {},
  });

  return (
    <ul>
      {membershipList?.map(member => (
        <li key={member.id}>
          {member.publicUserData.firstName} - {member.role}
        </li>
      ))}
    </ul>
  );
}
```

## OAuth Integration

### Configure OAuth Providers

In Clerk Dashboard:
1. Navigate to User & Authentication → Social Connections
2. Enable desired providers (Google, GitHub, etc.)
3. Configure OAuth credentials

### Custom OAuth for Alchemy

For Alchemy OIDC integration, Clerk acts as the OIDC provider:

```typescript
// Clerk automatically provides OIDC-compliant JWTs
// The issuer URL is your Clerk frontend API URL
const CLERK_ISSUER_URL = 'https://your-app.clerk.accounts.dev/';

// Alchemy validates tokens against this issuer
```

## BlockDrive Integration Pattern

### Complete Auth Context

```typescript
import { useAuth, useSession, useUser } from '@clerk/clerk-react';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  getAuthToken: () => Promise<string>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function BlockDriveAuthProvider({ children }) {
  const { isSignedIn, userId, getToken, signOut } = useAuth();
  const { session } = useSession();

  const getAuthToken = async () => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!isSignedIn,
      userId: userId || null,
      getAuthToken,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Security Best Practices

### Token Handling

1. Never store tokens in localStorage (Clerk handles this)
2. Always use `getToken()` for fresh tokens
3. Handle token expiration gracefully
4. Use HTTPS in production

### Session Security

```typescript
// Sign out on sensitive errors
const handleSecurityError = async () => {
  const { signOut } = useAuth();
  await signOut();
  // Redirect to sign-in
};

// Verify session is active before sensitive ops
const verifySession = async () => {
  const { session } = useSession();
  if (!session || session.status !== 'active') {
    throw new Error('Invalid session');
  }
};
```

## Additional Resources

### Reference Files

For detailed patterns and configurations:
- **`references/clerk-api.md`** - Complete Clerk API reference
- **`references/organizations.md`** - Organizations setup guide
- **`references/oauth-setup.md`** - OAuth provider configuration

### Examples

Working implementations in `examples/`:
- **`auth-provider.tsx`** - Complete auth provider
- **`protected-route.tsx`** - Route protection pattern

## Troubleshooting

### Token Not Available

1. Verify user is signed in (`isSignedIn === true`)
2. Wait for Clerk to load (`isLoaded === true`)
3. Check Clerk publishable key is correct

### Session Expired

1. Token refresh happens automatically
2. Force refresh with `getToken({ skipCache: true })`
3. Handle sign-out gracefully

### OAuth Redirect Issues

1. Verify redirect URLs in Clerk dashboard
2. Check OAuth provider credentials
3. Ensure HTTPS in production
