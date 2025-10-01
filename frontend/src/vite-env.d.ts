/// <reference types="vite/client" />

/**
 * Vite environment variables for VibeBox frontend
 */
interface ImportMetaEnv {
  /** Base URL for API requests (e.g., http://localhost:3000) */
  readonly VITE_API_BASE_URL?: string;
  /** Base URL for WebSocket connections (e.g., ws://localhost:3000) */
  readonly VITE_WS_BASE_URL?: string;
}

/**
 * Augmented ImportMeta interface with typed environment variables
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
