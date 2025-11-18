/**
 * HTTP Client with retry logic and authentication
 */

import type { VibeBoxConfig, RequestOptions } from '../types';
import { createApiError, isRetryableError, TimeoutError } from '../errors';
import { withRetry } from './retry';

/**
 * HTTP Client for making API requests
 *
 * Features:
 * - Automatic authentication (API key or JWT)
 * - Retry logic with exponential backoff
 * - Request/response interceptors
 * - Timeout handling
 * - Error transformation
 */
export class HttpClient {
  constructor(private readonly config: Required<VibeBoxConfig>) {}

  /**
   * Make an HTTP request
   *
   * @param method - HTTP method
   * @param path - API endpoint path
   * @param options - Request options
   * @returns Response data
   */
  async request<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const timeout = options?.timeout || this.config.timeout;

    return withRetry(
      async () => {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, {
            method,
            headers: this.buildHeaders(options?.headers),
            body: options?.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Handle non-2xx responses
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = (errorData && typeof errorData === 'object' && 'message' in errorData)
              ? String(errorData.message)
              : `HTTP ${response.status}: ${response.statusText}`;

            throw createApiError(
              response.status,
              errorMessage,
              errorData as any
            );
          }

          // Handle different response types
          if (options?.responseType === 'arraybuffer') {
            return (await response.arrayBuffer()) as unknown as T;
          } else if (options?.responseType === 'text') {
            return (await response.text()) as unknown as T;
          } else {
            // Default to JSON
            return await response.json() as T;
          }
        } catch (error: any) {
          clearTimeout(timeoutId);

          // Handle abort/timeout errors
          if (error.name === 'AbortError') {
            throw new TimeoutError(`Request timed out after ${timeout}ms`, timeout);
          }

          // Re-throw API errors
          throw error;
        }
      },
      {
        retries: this.config.retries,
        retryDelay: this.config.retryDelay,
        retryCondition: isRetryableError,
      }
    );
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${fullPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Build request headers
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'User-Agent': 'vibebox-sdk/0.1.0',
      ...this.config.headers,
      ...customHeaders,
    };
  }

  /**
   * Convenience method for GET requests
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  /**
   * Convenience method for POST requests
   */
  async post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }
}
