/**
 * Validation Middleware
 * Request validation helpers and schemas with input sanitization
 * Task: Phase 3.5 - API Layer
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationError } from '@/lib/errors';
import { sanitize } from './security';

/**
 * Validation schema interface
 */
interface ValidationSchema {
  body?: ValidationRules;
  params?: ValidationRules;
  query?: ValidationRules;
}

/**
 * Validation rules for a field
 */
interface ValidationRules {
  [key: string]: FieldRule;
}

/**
 * Field validation rule
 */
interface FieldRule {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: unknown) => boolean | string;
  sanitize?: boolean | 'string' | 'html' | 'email' | 'url' | 'filename';
}

/**
 * Validate a single field against its rules
 *
 * @param value - Field value
 * @param rules - Validation rules
 * @param fieldName - Field name for error messages
 * @returns Validated and potentially sanitized value
 * @throws {ValidationError} If validation fails
 */
function validateField(value: unknown, rules: FieldRule, fieldName: string): unknown {
  let processedValue = value;

  // Required check
  if (
    rules.required &&
    (processedValue === undefined || processedValue === null || processedValue === '')
  ) {
    throw new ValidationError(`${fieldName} is required`);
  }

  // Skip further validation if value is undefined/null and not required
  if (!rules.required && (processedValue === undefined || processedValue === null)) {
    return processedValue;
  }

  // Apply sanitization before validation
  if (rules.sanitize && typeof processedValue === 'string') {
    const sanitizeType = rules.sanitize === true ? 'string' : rules.sanitize;
    switch (sanitizeType) {
      case 'string':
        processedValue = sanitize.string(processedValue);
        break;
      case 'html':
        processedValue = sanitize.html(processedValue);
        break;
      case 'email':
        processedValue = sanitize.email(processedValue);
        break;
      case 'url':
        processedValue = sanitize.url(processedValue);
        break;
      case 'filename':
        processedValue = sanitize.filename(processedValue);
        break;
    }
  }

  // Type check
  if (rules.type) {
    const actualType = Array.isArray(processedValue) ? 'array' : typeof processedValue;
    if (actualType !== rules.type) {
      throw new ValidationError(`${fieldName} must be a ${rules.type}`);
    }
  }

  // String validations
  if (rules.type === 'string' && typeof processedValue === 'string') {
    if (rules.min !== undefined && processedValue.length < rules.min) {
      throw new ValidationError(`${fieldName} must be at least ${rules.min} characters`);
    }
    if (rules.max !== undefined && processedValue.length > rules.max) {
      throw new ValidationError(`${fieldName} must be at most ${rules.max} characters`);
    }
    if (rules.pattern && !rules.pattern.test(processedValue)) {
      throw new ValidationError(`${fieldName} format is invalid`);
    }
    if (rules.enum && !rules.enum.includes(processedValue)) {
      throw new ValidationError(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
    }
  }

  // Number validations
  if (rules.type === 'number' && typeof processedValue === 'number') {
    if (rules.min !== undefined && processedValue < rules.min) {
      throw new ValidationError(`${fieldName} must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && processedValue > rules.max) {
      throw new ValidationError(`${fieldName} must be at most ${rules.max}`);
    }
  }

  // Array validations
  if (rules.type === 'array' && Array.isArray(processedValue)) {
    if (rules.min !== undefined && processedValue.length < rules.min) {
      throw new ValidationError(`${fieldName} must have at least ${rules.min} items`);
    }
    if (rules.max !== undefined && processedValue.length > rules.max) {
      throw new ValidationError(`${fieldName} must have at most ${rules.max} items`);
    }
  }

  // Custom validation
  if (rules.custom) {
    const result = rules.custom(processedValue);
    if (result === false) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    if (typeof result === 'string') {
      throw new ValidationError(result);
    }
  }

  return processedValue;
}

/**
 * Create validation middleware from schema
 *
 * @param schema - Validation schema
 * @returns Validation middleware function
 *
 * @example
 * ```typescript
 * const validateCreateTeam = validate({
 *   body: {
 *     name: { type: 'string', required: true, min: 1, max: 100 },
 *     slug: { type: 'string', required: true, pattern: /^[a-z0-9-]+$/ },
 *     description: { type: 'string', max: 500 }
 *   }
 * });
 *
 * fastify.post('/teams', { preHandler: validateCreateTeam }, handler);
 * ```
 */
export function validate(schema: ValidationSchema) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    // Validate and sanitize body
    if (schema.body && request.body) {
      const body = request.body as Record<string, unknown>;
      for (const [fieldName, rules] of Object.entries(schema.body)) {
        const value = body[fieldName];
        const sanitized = validateField(value, rules, fieldName);
        if (sanitized !== value && rules.sanitize) {
          body[fieldName] = sanitized;
        }
      }
    }

    // Validate and sanitize params
    if (schema.params && request.params) {
      const params = request.params as Record<string, unknown>;
      for (const [fieldName, rules] of Object.entries(schema.params)) {
        const value = params[fieldName];
        const sanitized = validateField(value, rules, fieldName);
        if (sanitized !== value && rules.sanitize) {
          params[fieldName] = sanitized;
        }
      }
    }

    // Validate and sanitize query
    if (schema.query && request.query) {
      const query = request.query as Record<string, unknown>;
      for (const [fieldName, rules] of Object.entries(schema.query)) {
        const value = query[fieldName];
        const sanitized = validateField(value, rules, fieldName);
        if (sanitized !== value && rules.sanitize) {
          query[fieldName] = sanitized;
        }
      }
    }
  };
}

/**
 * Common validation patterns
 */
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  slug: /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  url: /^https?:\/\/.+/,
  semver: /^\d+\.\d+\.\d+$/,
};

/**
 * Pre-built validators for common use cases
 */
export const validators = {
  /**
   * Validate pagination query parameters
   */
  pagination: validate({
    query: {
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 },
    },
  }),

  /**
   * Validate UUID parameter
   */
  uuidParam: (paramName: string) =>
    validate({
      params: {
        [paramName]: { type: 'string', required: true, pattern: patterns.uuid },
      },
    }),

  /**
   * Validate email format
   */
  email: (fieldName: string = 'email') =>
    validate({
      body: {
        [fieldName]: { type: 'string', required: true, pattern: patterns.email },
      },
    }),

  /**
   * Validate slug format
   */
  slug: (fieldName: string = 'slug') =>
    validate({
      body: {
        [fieldName]: { type: 'string', required: true, pattern: patterns.slug },
      },
    }),
};
