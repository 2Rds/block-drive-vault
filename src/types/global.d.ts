/** Typed global window properties for auth session access */

interface BlockDriveSession {
  getToken: () => Promise<string | null>;
}

declare global {
  interface Window {
    __dynamic_session?: BlockDriveSession;
  }
}

export {};
