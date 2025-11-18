/**
 * Validation utilities
 */

import { ValidationError } from '../errors';

/**
 * Validate that a value is not null or undefined
 */
export function required<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`, {
      [fieldName]: 'This field is required',
    });
  }
  return value;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate API key format (vbx_live_* or vbx_test_*)
 */
export function isValidApiKey(key: string): boolean {
  return /^vbx_(live|test)_[a-zA-Z0-9]{64,}$/.test(key);
}

/**
 * Validate environment variable key format
 */
export function isValidEnvKey(key: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(key);
}

/**
 * Slugify a string (convert to URL-friendly format)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a random sandbox name
 */
export function generateSandboxName(): string {
  const adjectives = [
    'happy',
    'clever',
    'swift',
    'bright',
    'calm',
    'bold',
    'kind',
    'wise',
    'cool',
    'great',
  ];
  const nouns = [
    'sandbox',
    'box',
    'env',
    'space',
    'lab',
    'studio',
    'workspace',
    'dev',
    'code',
    'build',
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adjective}-${noun}-${number}`;
}
