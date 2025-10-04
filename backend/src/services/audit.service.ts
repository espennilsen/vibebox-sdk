/**
 * Audit Logging Service
 * Tracks sensitive operations for security monitoring and compliance
 * Task: Security Hardening (#6)
 */

import { AuditAction, AuditSeverity, Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { logger } from '@/lib/logger';
import { getPrismaClient } from '@/lib/db';

const prisma = getPrismaClient();

/**
 * Audit log entry data
 */
export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  severity: AuditSeverity;
  success?: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Extract IP address from Fastify request
 *
 * @param request - Fastify request object
 * @returns IP address
 */
function getIpAddress(request: FastifyRequest): string | undefined {
  // Check X-Forwarded-For header (for proxied requests)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips?.split(',')[0]?.trim();
  }

  // Check X-Real-IP header
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to request.ip
  return request.ip;
}

/**
 * Extract user agent from Fastify request
 *
 * @param request - Fastify request object
 * @returns User agent string
 */
function getUserAgent(request: FastifyRequest): string | undefined {
  const userAgent = request.headers['user-agent'];
  return Array.isArray(userAgent) ? userAgent[0] : userAgent;
}

/**
 * Create an audit log entry
 *
 * Best-effort logging: Returns undefined if audit logging fails to avoid
 * disrupting the main operation.
 *
 * @param data - Audit log data
 * @returns Created audit log entry, or undefined if logging failed
 *
 * @example
 * ```typescript
 * const auditEntry = await createAuditLog({
 *   userId: user.id,
 *   action: AuditAction.auth_login_success,
 *   resource: 'user',
 *   resourceId: user.id,
 *   severity: AuditSeverity.medium,
 *   ipAddress: request.ip,
 *   userAgent: request.headers['user-agent'],
 * });
 * // auditEntry may be undefined if logging failed
 * ```
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: (data.details ?? {}) as Prisma.InputJsonValue,
        severity: data.severity,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
      },
    });

    // Log to application logger for real-time monitoring
    const logData = {
      auditId: auditLog.id,
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      severity: data.severity,
      success: data.success ?? true,
      ipAddress: data.ipAddress,
    };

    if (data.success === false || data.severity === 'critical' || data.severity === 'high') {
      logger.warn(logData, `Audit: ${data.action}`);
    } else {
      logger.info(logData, `Audit: ${data.action}`);
    }

    return auditLog;
  } catch (error) {
    // Best-effort logging: Don't fail the operation if audit logging fails
    // Sanitize data to avoid logging sensitive fields like data.details
    const sanitizedMetadata = {
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      userId: data.userId,
      severity: data.severity,
      success: data.success,
      // Omit data.details and other potentially sensitive fields
    };

    logger.error({ error, metadata: sanitizedMetadata }, 'Failed to create audit log entry');
    return undefined;
  }
}

/**
 * Create an audit log from a Fastify request
 * Automatically extracts IP address and user agent
 *
 * Best-effort logging: Returns undefined if audit logging fails to avoid
 * disrupting the main operation.
 *
 * @param request - Fastify request object
 * @param data - Audit log data (without IP/user agent)
 * @returns Created audit log entry, or undefined if logging failed
 *
 * @example
 * ```typescript
 * const auditEntry = await auditLog(request, {
 *   userId: request.user?.id,
 *   action: AuditAction.environment_create,
 *   resource: 'environment',
 *   resourceId: environment.id,
 *   severity: AuditSeverity.medium,
 *   details: { name: environment.name },
 * });
 * // auditEntry may be undefined if logging failed
 * ```
 */
export async function auditLog(
  request: FastifyRequest,
  data: Omit<AuditLogData, 'ipAddress' | 'userAgent'>
) {
  return createAuditLog({
    ...data,
    ipAddress: getIpAddress(request),
    userAgent: getUserAgent(request),
  });
}

/**
 * Get audit logs for a user
 *
 * @param userId - User ID
 * @param options - Query options
 * @returns Audit log entries
 */
export async function getUserAuditLogs(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    severity?: AuditSeverity;
  } = {}
) {
  const { limit = 100, offset = 0, action, severity } = options;

  return prisma.auditLog.findMany({
    where: {
      userId,
      ...(action && { action }),
      ...(severity && { severity }),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get audit logs for a resource
 *
 * @param resource - Resource type
 * @param resourceId - Resource ID
 * @param options - Query options
 * @returns Audit log entries
 */
export async function getResourceAuditLogs(
  resource: string,
  resourceId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
) {
  const { limit = 100, offset = 0 } = options;

  return prisma.auditLog.findMany({
    where: {
      resource,
      resourceId,
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get recent security events (high/critical severity)
 *
 * @param options - Query options
 * @returns Recent security events
 */
export async function getSecurityEvents(
  options: {
    limit?: number;
    hours?: number;
  } = {}
) {
  const { limit = 100, hours = 24 } = options;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return prisma.auditLog.findMany({
    where: {
      severity: {
        in: [AuditSeverity.high, AuditSeverity.critical],
      },
      timestamp: {
        gte: since,
      },
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

/**
 * Get failed authentication attempts
 *
 * @param options - Query options
 * @returns Failed authentication attempts
 */
export async function getFailedAuthAttempts(
  options: {
    limit?: number;
    hours?: number;
    ipAddress?: string;
  } = {}
) {
  const { limit = 100, hours = 24, ipAddress } = options;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return prisma.auditLog.findMany({
    where: {
      action: AuditAction.auth_login_failed,
      timestamp: {
        gte: since,
      },
      ...(ipAddress && { ipAddress }),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

/**
 * Count failed authentication attempts by IP
 *
 * @param ipAddress - IP address to check
 * @param minutes - Time window in minutes
 * @returns Count of failed attempts
 */
export async function countFailedAuthAttempts(
  ipAddress: string,
  minutes: number = 15
): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  return prisma.auditLog.count({
    where: {
      action: AuditAction.auth_login_failed,
      ipAddress,
      timestamp: {
        gte: since,
      },
    },
  });
}

/**
 * Audit severity helpers
 */
export const AuditHelper = {
  /**
   * Determine severity based on action
   *
   * @param action - Audit action
   * @returns Recommended severity
   */
  getSeverityForAction(action: AuditAction): AuditSeverity {
    // Critical actions
    if (
      action === AuditAction.auth_password_change ||
      action === AuditAction.user_delete ||
      action === AuditAction.user_role_change ||
      action === AuditAction.team_member_remove ||
      action === AuditAction.team_role_change ||
      action === AuditAction.secret_delete ||
      action === AuditAction.system_config_change
    ) {
      return AuditSeverity.critical;
    }

    // High severity actions
    if (
      action === AuditAction.auth_login_failed ||
      action === AuditAction.auth_password_reset ||
      action === AuditAction.secret_access ||
      action === AuditAction.secret_create ||
      action === AuditAction.secret_update ||
      action === AuditAction.environment_delete ||
      action === AuditAction.project_delete
    ) {
      return AuditSeverity.high;
    }

    // Medium severity actions
    if (
      action === AuditAction.auth_login_success ||
      action === AuditAction.auth_register ||
      action === AuditAction.user_create ||
      action === AuditAction.user_update ||
      action === AuditAction.environment_create ||
      action === AuditAction.project_create ||
      action === AuditAction.team_create
    ) {
      return AuditSeverity.medium;
    }

    // Low severity (routine operations)
    return AuditSeverity.low;
  },
};

export { AuditAction, AuditSeverity };
