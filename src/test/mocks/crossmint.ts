import { vi } from 'vitest';

// Default crossmint wallet state
const defaultWalletState = {
  walletAddress: null as string | null,
  chainAddresses: {},
  connection: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  signTransaction: vi.fn(),
  signAndSendTransaction: vi.fn(),
  getBalance: vi.fn().mockResolvedValue(0),
  getUsdcBalance: vi.fn().mockResolvedValue(0),
  switchChain: vi.fn(),
  getCurrentChain: vi.fn().mockReturnValue('solana:devnet'),
};

let currentWalletState = { ...defaultWalletState };

export function setMockCrossmintWallet(overrides: Partial<typeof defaultWalletState>) {
  currentWalletState = { ...defaultWalletState, ...overrides };
}

export function resetMockCrossmintWallet() {
  currentWalletState = { ...defaultWalletState };
}

vi.mock('@/hooks/useCrossmintWallet', () => ({
  useCrossmintWallet: () => currentWalletState,
  default: () => currentWalletState,
}));
