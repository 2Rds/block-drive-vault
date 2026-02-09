import { vi } from 'vitest';

// Default mock user matching ClerkAuthContext shape
export const mockClerkUser = {
  id: 'user_test123',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  imageUrl: 'https://example.com/avatar.png',
  createdAt: new Date('2025-01-01'),
};

// Default context value
const defaultClerkAuth = {
  userId: mockClerkUser.id,
  isLoaded: true,
  isSignedIn: true,
  user: mockClerkUser,
  activeOrganization: null,
  organizations: [],
  isOrgLoaded: true,
  setActiveOrganization: vi.fn(),
  supabase: {} as any,
  signOut: vi.fn(),
};

let currentClerkAuth = { ...defaultClerkAuth };

export function setMockClerkAuth(overrides: Partial<typeof defaultClerkAuth>) {
  currentClerkAuth = { ...defaultClerkAuth, ...overrides };
}

export function resetMockClerkAuth() {
  currentClerkAuth = { ...defaultClerkAuth };
}

// Mock the ClerkAuthContext module
vi.mock('@/contexts/ClerkAuthContext', () => ({
  useClerkAuth: () => currentClerkAuth,
  ClerkAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
