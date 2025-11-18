/**
 * API Keys resource
 *
 * Provides methods for managing API keys:
 * - Create new API keys
 * - List API keys
 * - Get API key details
 * - Update API keys
 * - Revoke (delete) API keys
 */

import type { HttpClient } from '../utils/http-client';
import type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  ApiKeyScope,
} from '../types';

/**
 * API Keys resource class
 */
export class ApiKeysResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new API key
   *
   * @param name - Key name for identification
   * @param scopes - Array of permission scopes
   * @param expiresAt - Optional expiration date
   * @returns API key object and the actual key (only returned once!)
   *
   * @example
   * ```typescript
   * const { apiKey, key } = await vb.apiKeys.create(
   *   'Production SDK Key',
   *   ['read', 'write', 'execute']
   * );
   *
   * // Save the key securely! It's only shown once
   * console.log('API Key:', key);
   * console.log('Key ID:', apiKey.id);
   *
   * // With expiration
   * const { apiKey, key } = await vb.apiKeys.create(
   *   'Temporary Key',
   *   ['read'],
   *   '2025-12-31T23:59:59Z'
   * );
   * ```
   */
  async create(
    name: string,
    scopes: ApiKeyScope[],
    expiresAt?: string
  ): Promise<CreateApiKeyResponse> {
    const request: CreateApiKeyRequest = {
      name,
      scopes,
      ...(expiresAt && { expiresAt }),
    };

    return this.http.post<CreateApiKeyResponse>('/api/v1/keys', request);
  }

  /**
   * List all API keys for the authenticated user
   *
   * @returns Array of API keys (without the actual key values)
   *
   * @example
   * ```typescript
   * const keys = await vb.apiKeys.list();
   * keys.forEach(key => {
   *   console.log(`${key.name}: ${key.keyPrefix}***`);
   *   console.log(`Scopes: ${key.scopes.join(', ')}`);
   *   console.log(`Last used: ${key.lastUsedAt}`);
   * });
   * ```
   */
  async list(): Promise<ApiKey[]> {
    return this.http.get<ApiKey[]>('/api/v1/keys');
  }

  /**
   * Get API key details by ID
   *
   * @param keyId - API key ID
   * @returns API key details (without the actual key value)
   *
   * @example
   * ```typescript
   * const key = await vb.apiKeys.get('key-id-123');
   * console.log(`Name: ${key.name}`);
   * console.log(`Scopes: ${key.scopes.join(', ')}`);
   * ```
   */
  async get(keyId: string): Promise<ApiKey> {
    return this.http.get<ApiKey>(`/api/v1/keys/${keyId}`);
  }

  /**
   * Update an API key
   *
   * @param keyId - API key ID
   * @param updates - Fields to update
   * @returns Updated API key
   *
   * @example
   * ```typescript
   * const updated = await vb.apiKeys.update('key-id-123', {
   *   name: 'Updated Key Name',
   *   scopes: ['read', 'write']
   * });
   * ```
   */
  async update(keyId: string, updates: UpdateApiKeyRequest): Promise<ApiKey> {
    return this.http.put<ApiKey>(`/api/v1/keys/${keyId}`, updates);
  }

  /**
   * Revoke (delete) an API key
   *
   * Warning: This is irreversible! The key will immediately stop working.
   *
   * @param keyId - API key ID
   *
   * @example
   * ```typescript
   * await vb.apiKeys.revoke('key-id-123');
   * ```
   */
  async revoke(keyId: string): Promise<void> {
    await this.http.delete(`/api/v1/keys/${keyId}`);
  }
}
