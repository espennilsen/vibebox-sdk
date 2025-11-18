/**
 * API Key Service
 * Handles API key generation, validation, and management for programmatic access
 */

import { PrismaClient, ApiKey } from '@prisma/client';
import crypto from 'crypto';
import { ApiKeyScope } from '@vibebox/types';

const prisma = new PrismaClient();

/**
 * Generates a cryptographically secure API key
 * Format: vbx_live_<32 random hex characters>
 *
 * @returns Object containing the full key and its prefix
 */
export function generateApiKey(): { key: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32);
  const keyBody = randomBytes.toString('hex');
  const key = `vbx_live_${keyBody}`;
  const prefix = key.substring(0, 12); // vbx_live_XXX for identification

  return { key, prefix };
}

/**
 * Hashes an API key using SHA-256
 *
 * @param key - The API key to hash
 * @returns The hashed key
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Creates a new API key for a user
 *
 * @param userId - The user ID to create the key for
 * @param name - A descriptive name for the key
 * @param scopes - Array of permissions (read, write, execute)
 * @param expiresAt - Optional expiration date
 * @returns Object containing the created API key and the unhashed key (only returned once)
 */
export async function createApiKey(
  userId: string,
  name: string,
  scopes: ApiKeyScope[],
  expiresAt?: Date
): Promise<{ apiKey: ApiKey; key: string }> {
  const { key, prefix } = generateApiKey();
  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      keyPrefix: prefix,
      scopes,
      expiresAt,
    },
  });

  return { apiKey, key };
}

/**
 * Validates an API key and returns the associated key record
 *
 * @param key - The API key to validate
 * @returns The API key record if valid, null otherwise
 */
export async function validateApiKey(key: string): Promise<ApiKey | null> {
  // Check key format
  if (!key.startsWith('vbx_live_')) {
    return null;
  }

  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    return null;
  }

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}

/**
 * Lists all API keys for a user (without exposing the actual keys)
 *
 * @param userId - The user ID to list keys for
 * @returns Array of API keys
 */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Gets a single API key by ID
 *
 * @param id - The API key ID
 * @param userId - The user ID (for authorization)
 * @returns The API key if found and owned by user, null otherwise
 */
export async function getApiKey(id: string, userId: string): Promise<ApiKey | null> {
  return prisma.apiKey.findFirst({
    where: {
      id,
      userId,
    },
  });
}

/**
 * Updates an API key
 *
 * @param id - The API key ID
 * @param userId - The user ID (for authorization)
 * @param data - The fields to update
 * @returns The updated API key if successful, null otherwise
 */
export async function updateApiKey(
  id: string,
  userId: string,
  data: {
    name?: string;
    scopes?: ApiKeyScope[];
  }
): Promise<ApiKey | null> {
  // Verify ownership
  const existing = await getApiKey(id, userId);
  if (!existing) {
    return null;
  }

  return prisma.apiKey.update({
    where: { id },
    data,
  });
}

/**
 * Deletes (revokes) an API key
 *
 * @param id - The API key ID
 * @param userId - The user ID (for authorization)
 * @returns True if deleted, false otherwise
 */
export async function deleteApiKey(id: string, userId: string): Promise<boolean> {
  // Verify ownership
  const existing = await getApiKey(id, userId);
  if (!existing) {
    return false;
  }

  await prisma.apiKey.delete({
    where: { id },
  });

  return true;
}

/**
 * Checks if an API key has a specific scope
 *
 * @param apiKey - The API key to check
 * @param requiredScope - The scope to check for
 * @returns True if the key has the required scope
 */
export function hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
  return apiKey.scopes.includes(requiredScope);
}

/**
 * Checks if an API key has all of the required scopes
 *
 * @param apiKey - The API key to check
 * @param requiredScopes - Array of scopes to check for
 * @returns True if the key has all required scopes
 */
export function hasAllScopes(apiKey: ApiKey, requiredScopes: ApiKeyScope[]): boolean {
  return requiredScopes.every(scope => apiKey.scopes.includes(scope));
}

/**
 * Cleans up expired API keys (should be run periodically)
 *
 * @returns Number of keys deleted
 */
export async function cleanupExpiredKeys(): Promise<number> {
  const result = await prisma.apiKey.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
