# BlockDrive Platform Documentation

## Overview

BlockDrive is a comprehensive Web3 data management platform that combines decentralized storage, blockchain authentication, and enterprise-grade features. It provides secure, scalable solutions for storing, managing, and accessing data across multiple blockchain networks.

## Table of Contents

1. [Platform Architecture](#platform-architecture)
2. [Core Features](#core-features)
3. [Authentication System](#authentication-system)
4. [Storage & File Management](#storage--file-management)
5. [Team Collaboration](#team-collaboration)
6. [Integrations](#integrations)
7. [Subscription & Pricing](#subscription--pricing)
8. [API & Development](#api--development)
9. [Security Features](#security-features)
10. [Deployment & Infrastructure](#deployment--infrastructure)

---

## Platform Architecture

### Technology Stack

**Frontend:**
- React 18.3.1 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling with custom design system
- Shadcn/ui component library
- React Router for navigation
- TanStack React Query for data fetching

**Backend:**
- Supabase for database and authentication
- Edge Functions for serverless compute
- IPFS (Pinata) for decentralized storage
- Stripe for payment processing

**Blockchain:**
- Dynamic Labs SDK for multi-chain wallet connectivity
- Support for Ethereum and Solana networks
- Wallet authentication without private key exposure

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard widgets
│   ├── integrations/    # Third-party integrations
│   ├── landing/         # Landing page components
│   ├── sidebar/         # Sidebar navigation
│   ├── subscription/    # Pricing and billing
│   ├── team/           # Team management
│   └── ui/             # Base UI components (shadcn)
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # Business logic and API calls
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── integrations/       # External service integrations
```

---

## Core Features

### 1. Decentralized Storage (IPFS)
- **File Upload**: Secure upload to IPFS via Pinata
- **File Management**: Organize files in folders with metadata
- **File Viewing**: Preview and download files from IPFS
- **Permanent Storage**: Files pinned for guaranteed availability
- **Global CDN**: Fast access through Pinata's gateway network

### 2. Multi-Chain Wallet Support
- **Supported Networks**: Ethereum, Solana, and 50+ other blockchains
- **Wallet Providers**: Phantom, Solflare, MetaMask, WalletConnect, and more
- **Secure Authentication**: Wallet-based login without exposing private keys
- **Cross-Chain Compatibility**: Seamless switching between different blockchain networks

### 3. Enterprise Security
- **End-to-End Encryption**: All files encrypted before storage
- **Blockchain Authentication**: Cryptographic proof of identity
- **Audit Trails**: Comprehensive logging of all actions
- **Access Controls**: Role-based permissions and team management

### 4. Real-Time Analytics
- **Storage Metrics**: Track usage, file counts, and storage consumption
- **Network Status**: Monitor IPFS and blockchain connectivity
- **Activity Logs**: Recent uploads, downloads, and team actions
- **Performance Insights**: Response times and availability metrics

---

## Authentication System

### Dynamic Labs Integration

BlockDrive uses Dynamic Labs SDK for comprehensive wallet authentication:

```typescript
// Key components:
- DynamicProviderWrapper: Main authentication provider
- SimplifiedAuthProvider: Supabase integration layer
- DynamicConnectButton: Wallet connection interface
```

### Authentication Flow

1. **User Initiation**: Click "Connect Wallet" button
2. **Wallet Selection**: Choose from 50+ supported wallets
3. **Connection**: Dynamic SDK handles wallet communication
4. **Verification**: Cryptographic signature verification
5. **Session Creation**: Generate secure session tokens
6. **Redirection**: Automatic redirect to dashboard

### Supported Authentication Methods

- **Wallet Authentication**: Primary method using blockchain wallets
- **Email Authentication**: For users without wallet access
- **Social Login**: OAuth providers (Google, GitHub, etc.)
- **Enterprise SSO**: SAML and OAuth for organizations

---

## Storage & File Management

### IPFS Integration

**Architecture:**
- Pinata as primary IPFS provider
- Custom gateway for optimized access
- Redundant storage across global nodes
- Automatic pinning for permanent storage

**File Operations:**
```typescript
// Upload to IPFS
const uploadFile = async (file: File) => {
  const result = await IPFSService.uploadFile(file);
  return result; // Returns CID and metadata
};

// Retrieve from IPFS
const downloadFile = async (cid: string) => {
  const blob = await IPFSService.retrieveFile(cid);
  return blob;
};
```

### File Management Features

1. **Folder Organization**: Hierarchical folder structure
2. **File Metadata**: Size, type, upload date, blockchain info
3. **Search & Filter**: Find files by name, type, or date
4. **Batch Operations**: Upload and manage multiple files
5. **File Sharing**: Generate secure sharing links

### Storage Quotas by Plan

- **Starter**: 50 GB storage + 50 GB bandwidth
- **Pro**: 150 GB storage + 150 GB bandwidth  
- **Growth**: 300 GB storage + 300 GB bandwidth
- **Scale**: 500 GB per seat + 500 GB bandwidth per seat

---

## Team Collaboration

### Team Management

**Features:**
- Create and manage multiple teams
- Role-based access control (Owner, Member)
- Invite members via email
- Team-specific file storage
- Shared workspaces

**Subscription Requirements:**
- **Growth Plan**: 1 team, up to 3 members total
- **Scale Plan**: Unlimited teams and members

### Team File Operations

```typescript
// Team file upload
const teamUpload = async (file: File, teamId: string) => {
  // Upload with team association
  const result = await uploadToTeamStorage(file, teamId);
  return result;
};

// Team member invitation
const inviteMember = async (email: string, teamId: string, role: string) => {
  const invitation = await sendTeamInvitation(email, teamId, role);
  return invitation;
};
```

### Access Control

- **Team Owners**: Full management rights
- **Team Members**: File access and upload rights
- **Invitation System**: Secure email-based invitations
- **Expiring Links**: Time-limited invitation URLs

---

## Integrations

### Supported Platforms

1. **Slack Integration**
   - File sharing to Slack channels
   - Notification system
   - Command-based interactions

2. **Google Drive**
   - Import files from Google Drive
   - Sync existing folder structures
   - OAuth-based authentication

3. **Microsoft OneDrive**
   - OneDrive file import
   - Enterprise account support
   - Automatic synchronization

4. **Box Integration**
   - Enterprise file migration
   - Folder structure preservation
   - Bulk file operations

### Integration Features

- **OAuth Authentication**: Secure connection to third-party services
- **File Synchronization**: Automatic or manual sync options
- **Metadata Preservation**: Maintain file properties and permissions
- **Bulk Operations**: Import large numbers of files efficiently

---

## Subscription & Pricing

### Pricing Tiers

**Starter - $9/month**
- 50 GB storage & bandwidth
- 1 user
- Basic blockchain features
- 7-day free trial

**Pro - $29/month**
- 150 GB storage & bandwidth
- Enhanced features
- Priority support
- Advanced sharing

**Growth - $59/month** (Most Popular)
- 300 GB storage & bandwidth
- Up to 3 team members
- Team collaboration tools
- Advanced analytics

**Scale - $99/month/seat**
- 500 GB per seat
- Unlimited team members
- Custom solutions
- 24/7 support

### Billing Features

- **Multiple Billing Periods**: Monthly, quarterly, annual
- **Automatic Savings**: Up to 20% off annual plans
- **Usage Monitoring**: Real-time quota tracking
- **Overage Protection**: Alerts before limits reached

### Payment Processing

```typescript
// Stripe integration for subscriptions
const createCheckout = async (priceId: string) => {
  const { data } = await supabase.functions.invoke('create-checkout', {
    body: { priceId, successUrl, cancelUrl }
  });
  return data.url; // Redirect to Stripe Checkout
};
```

---

## API & Development

### Edge Functions

**Core Functions:**
- `upload-to-ipfs`: Handle file uploads to IPFS
- `check-subscription`: Verify user subscription status
- `secure-wallet-auth`: Authenticate wallet connections
- `create-checkout`: Process Stripe payments
- `send-team-invitation`: Handle team invitations

### Database Schema

**Key Tables:**
- `files`: File metadata and IPFS references
- `user_signups`: User registration information
- `teams`: Team management
- `team_members`: Team membership records
- `subscriptions`: Billing and subscription data

### API Authentication

```typescript
// Wallet-based authentication
const authHeader = {
  'Authorization': `Bearer ${userWalletId}`
};

// JWT-based authentication  
const authHeader = {
  'Authorization': `Bearer ${sessionToken}`
};
```

### SDK Integration

```typescript
// IPFS Service usage
import { IPFSService } from '@/services/ipfsService';

// Upload file
const result = await IPFSService.uploadFile(file);

// Download file
const blob = await IPFSService.retrieveFile(cid);

// Validate CID
const isValid = IPFSService.isValidCID(cid);
```

---

## Security Features

### Blockchain Security

1. **Wallet Authentication**: Cryptographic proof of ownership
2. **Message Signing**: Verify user identity without private keys
3. **Multi-Chain Support**: Security across different networks
4. **Hardware Wallet Support**: Enhanced security for enterprise users

### Data Protection

1. **End-to-End Encryption**: Files encrypted before upload
2. **Secure Transmission**: HTTPS and encrypted channels
3. **Access Logging**: Comprehensive audit trails
4. **Rate Limiting**: Protection against abuse

### Infrastructure Security

1. **SOC 2 Compliance**: Enterprise-grade security standards
2. **Regular Audits**: Security assessments and penetration testing
3. **Backup Systems**: Multiple redundancy layers
4. **Incident Response**: 24/7 monitoring and response team

### Security Monitoring

```typescript
// Security event logging
const logSecurityEvent = async (eventType: string, details: any) => {
  await supabase.functions.invoke('log-security-event', {
    body: { eventType, details, severity: 'medium' }
  });
};
```

---

## Deployment & Infrastructure

### Production Environment

- **Hosting**: Lovable.dev platform
- **CDN**: Global edge locations for fast access
- **Database**: Supabase PostgreSQL with auto-scaling
- **Storage**: IPFS via Pinata for decentralized storage
- **Monitoring**: Real-time performance and security monitoring

### Development Setup

```bash
# Clone repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Configuration

```env
# Required environment variables
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
STRIPE_SECRET_KEY=your_stripe_key
```

### Performance Optimization

1. **Code Splitting**: Lazy loading for optimal bundle sizes
2. **Image Optimization**: Automatic compression and resizing
3. **Caching Strategy**: Aggressive caching with cache invalidation
4. **Database Optimization**: Indexed queries and connection pooling

---

## Monitoring & Analytics

### Platform Metrics

- **Uptime Monitoring**: 99.9% availability SLA
- **Performance Tracking**: Sub-100ms response times
- **Error Reporting**: Real-time error detection and alerting
- **Usage Analytics**: User behavior and feature adoption

### User Analytics

- **Storage Usage**: Real-time quota tracking
- **File Activity**: Upload/download patterns
- **Team Collaboration**: Member activity and engagement
- **Feature Usage**: Most used features and workflows

---

## Support & Documentation

### Customer Support

- **Starter/Pro**: Email support with 48-hour response
- **Growth**: Priority email support with 24-hour response  
- **Scale**: 24/7 phone and email support with 4-hour response

### Developer Resources

- **API Documentation**: Complete API reference
- **SDK Documentation**: Integration guides and examples
- **Video Tutorials**: Step-by-step implementation guides
- **Community Forum**: Developer community and discussions

### Getting Started

1. **Sign Up**: Create account with wallet or email
2. **Choose Plan**: Select appropriate subscription tier
3. **Upload Files**: Start storing files on IPFS
4. **Invite Team**: Add team members for collaboration
5. **Integrate**: Connect with existing tools and workflows

---

## Roadmap & Future Features

### Upcoming Features

- **Advanced Analytics**: ML-powered insights and predictions
- **Custom Branding**: White-label solutions for enterprises
- **API Expansion**: More comprehensive developer APIs
- **Additional Integrations**: More third-party platform support
- **Mobile Apps**: Native iOS and Android applications

### Blockchain Expansion

- **Layer 2 Support**: Polygon, Arbitrum, Optimism
- **Additional Chains**: Avalanche, Binance Smart Chain, Cosmos
- **DeFi Integration**: Yield farming and staking rewards
- **NFT Support**: NFT storage and metadata management

---

*This documentation is maintained and updated regularly. For the latest information, visit the BlockDrive platform or contact our support team.*