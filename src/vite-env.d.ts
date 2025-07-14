/// <reference types="vite/client" />

declare global {
  interface Window {
    Intercom?: (command: string, ...args: any[]) => void;
  }
}
