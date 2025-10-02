/**
 * Application Constants
 * Shared constants used across the application
 */

/**
 * Resource limits for environment containers
 */
export const RESOURCE_LIMITS = {
  /**
   * CPU limits (in cores)
   */
  CPU: {
    MIN: 0.1,
    MAX: 16,
  },

  /**
   * Memory limits (in MB)
   */
  MEMORY: {
    MIN: 128,
    MAX: 32768, // 32 GB
  },

  /**
   * Storage limits (in MB)
   */
  STORAGE: {
    MIN: 1024, // 1 GB
    MAX: 102400, // 100 GB
  },
} as const;
