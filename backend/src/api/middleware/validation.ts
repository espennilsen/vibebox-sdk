/**
 * Validation Middleware
 * Request validation helpers and schemas
 * Task: Phase 3.5 - API Layer
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationError } from '@/lib/errors';

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
}

/**
 * Validate a single field against its rules
 *
 * @param value - Field value
 * @param rules - Validation rules
 * @param fieldName - Field name for error messages
 * @throws {ValidationError} If validation fails
 */
function validateField(value: unknown, rules: FieldRule, fieldName: string): void {
  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    throw new ValidationError(`${fieldName} is required`);
  }

  // Skip further validation if value is undefined/null and not required
  if (!rules.required && (value === undefined || value === null)) {
    return;
  }

  // Type check
  if (rules.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      throw new ValidationError(`${fieldName} must be a ${rules.type}`);
    }
  }

  // String validations
  if (rules.type === 'string' && typeof value === 'string') {
    if (rules.min !== undefined && value.length < rules.min) {
      throw new ValidationError(`${fieldName} must be at least ${rules.min} characters`);
    }
    if (rules.max !== undefined && value.length > rules.max) {
      throw new ValidationError(`${fieldName} must be at most ${rules.max} characters`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      throw new ValidationError(`${fieldName} format is invalid`);
    }
    if (rules.enum && !rules.enum.includes(value)) {
      throw new ValidationError(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
    }
  }

  // Number validations
  if (rules.type === 'number' && typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      throw new ValidationError(`${fieldName} must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      throw new ValidationError(`${fieldName} must be at most ${rules.max}`);
    }
  }

  // Array validations
  if (rules.type === 'array' && Array.isArray(value)) {
    if (rules.min !== undefined && value.length < rules.min) {
      throw new ValidationError(`${fieldName} must have at least ${rules.min} items`);
    }
    if (rules.max !== undefined && value.length > rules.max) {
      throw new ValidationError(`${fieldName} must have at most ${rules.max} items`);
    }
  }

  // Custom validation
  if (rules.custom) {
    const result = rules.custom(value);
    if (result === false) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    if (typeof result === 'string') {
      throw new ValidationError(result);
    }
  }
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
    // Validate body
    if (schema.body) {
      for (const [fieldName, rules] of Object.entries(schema.body)) {
        const value = (request.body as Record<string, unknown>)?.[fieldName];
        validateField(value, rules, fieldName);
      }
    }

    // Validate params
    if (schema.params) {
      for (const [fieldName, rules] of Object.entries(schema.params)) {
        const value = (request.params as Record<string, unknown>)?.[fieldName];
        validateField(value, rules, fieldName);
      }
    }

    // Validate query
    if (schema.query) {
      for (const [fieldName, rules] of Object.entries(schema.query)) {
        const value = (request.query as Record<string, unknown>)?.[fieldName];
        validateField(value, rules, fieldName);
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
