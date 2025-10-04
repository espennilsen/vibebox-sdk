/**
 * Docker Security Service
 * Implements security restrictions for Docker container management
 * Task: Security Hardening (#6) - Docker Socket Access Restrictions
 */

import Docker from 'dockerode';
import { logger } from '@/lib/logger';

/**
 * Security policy for container creation
 */
export interface SecurityPolicy {
  /**
   * Allowed base images (whitelist)
   */
  allowedImages?: string[];

  /**
   * Blocked images (blacklist)
   */
  blockedImages?: string[];

  /**
   * Prevent Docker socket mounting
   */
  preventDockerSocket?: boolean;

  /**
   * Enforce non-root user
   */
  enforceNonRoot?: boolean;

  /**
   * Drop Linux capabilities
   */
  dropCapabilities?: string[];

  /**
   * Read-only root filesystem
   */
  readOnlyRootFs?: boolean;

  /**
   * Prevent privilege escalation
   */
  preventPrivilegeEscalation?: boolean;

  /**
   * Network isolation mode
   */
  networkIsolation?: 'none' | 'isolated' | 'shared';
}

/**
 * Default security policy for production
 */
export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  preventDockerSocket: true,
  enforceNonRoot: true,
  dropCapabilities: ['ALL'], // Drop all capabilities by default
  readOnlyRootFs: false, // Allow writes to container filesystem
  preventPrivilegeEscalation: true,
  networkIsolation: 'isolated',
  allowedImages: [
    'node:*',
    'python:*',
    'ubuntu:*',
    'debian:*',
    'alpine:*',
    'postgres:*',
    'redis:*',
    'nginx:*',
  ],
  blockedImages: [
    '*:latest', // Prevent use of latest tag
    'docker:*', // Prevent Docker-in-Docker
    'dind:*',
  ],
};

/**
 * Validation error for security policy violations
 */
export class SecurityPolicyViolationError extends Error {
  constructor(
    message: string,
    public readonly violations: string[]
  ) {
    super(message);
    this.name = 'SecurityPolicyViolationError';
  }
}

/**
 * Docker Security Service
 * Enforces security policies for container operations
 */
export class DockerSecurityService {
  /**
   * Validate container creation options against security policy
   *
   * @param options - Docker container creation options
   * @param policy - Security policy to enforce
   * @throws {SecurityPolicyViolationError} If policy is violated
   */
  static validateContainerConfig(
    options: Docker.ContainerCreateOptions,
    policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
  ): void {
    const violations: string[] = [];

    // Check image whitelist/blacklist
    if (policy.allowedImages || policy.blockedImages) {
      const image = options.Image || '';

      // Check blacklist first
      if (policy.blockedImages) {
        for (const blocked of policy.blockedImages) {
          if (this.matchesPattern(image, blocked)) {
            violations.push(
              `Image '${image}' is blocked by security policy (matches '${blocked}')`
            );
          }
        }
      }

      // Check whitelist
      if (policy.allowedImages && policy.allowedImages.length > 0) {
        const isAllowed = policy.allowedImages.some((allowed) =>
          this.matchesPattern(image, allowed)
        );
        if (!isAllowed) {
          violations.push(
            `Image '${image}' is not in the allowed images list. Allowed: ${policy.allowedImages.join(', ')}`
          );
        }
      }
    }

    // Check Docker socket mounting (Binds and Mounts)
    if (policy.preventDockerSocket && options.HostConfig) {
      const binds = options.HostConfig.Binds ?? [];
      const mounts = (options.HostConfig as any).Mounts ?? [];

      const dockerBinds = binds.filter(
        (b) => b.includes('docker.sock') || b.includes('/var/run/docker')
      );

      const dockerMounts = mounts.filter(
        (m: any) =>
          (m.Source || '').includes('docker.sock') || (m.Source || '').includes('/var/run/docker')
      );

      if (dockerBinds.length > 0 || dockerMounts.length > 0) {
        violations.push(
          `Docker socket mounting is prohibited. Found mounts: ${[
            ...dockerBinds,
            ...dockerMounts.map((m: any) => `${m.Source}:${m.Target}`),
          ].join(', ')}`
        );
      }
    }

    // Check privileged mode
    if (options.HostConfig?.Privileged) {
      violations.push('Privileged mode is not allowed');
    }

    // Enforce non-root user
    if (policy.enforceNonRoot) {
      const user = options.User;
      if (!user || user === 'root' || user === '0') {
        violations.push(
          'Container must run as non-root user. Specify User in container config (e.g., "1000" or "node")'
        );
      }
    }

    if (violations.length > 0) {
      throw new SecurityPolicyViolationError(
        `Container configuration violates security policy: ${violations.length} violation(s)`,
        violations
      );
    }

    logger.info(
      { image: options.Image, name: options.name },
      'Container config passed security validation'
    );
  }

  /**
   * Apply security hardening to container options
   *
   * @param options - Docker container creation options
   * @param policy - Security policy to apply
   * @returns Hardened container options
   */
  static applySecurityHardening(
    options: Docker.ContainerCreateOptions,
    policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
  ): Docker.ContainerCreateOptions {
    const hardened = { ...options };

    // Initialize HostConfig if not present
    if (!hardened.HostConfig) {
      hardened.HostConfig = {};
    }

    // Drop capabilities
    if (policy.dropCapabilities && policy.dropCapabilities.length > 0) {
      hardened.HostConfig.CapDrop = policy.dropCapabilities;
    }

    // Read-only root filesystem
    if (policy.readOnlyRootFs) {
      hardened.HostConfig.ReadonlyRootfs = true;
    }

    // Prevent privilege escalation
    if (policy.preventPrivilegeEscalation) {
      hardened.HostConfig.SecurityOpt = hardened.HostConfig.SecurityOpt || [];
      if (!hardened.HostConfig.SecurityOpt.includes('no-new-privileges:true')) {
        hardened.HostConfig.SecurityOpt.push('no-new-privileges:true');
      }
    }

    // Set non-root user if not specified
    if (policy.enforceNonRoot && (!hardened.User || hardened.User === 'root')) {
      // Default to user 1000 (common non-root user in containers)
      hardened.User = '1000';
      logger.warn(
        { image: hardened.Image },
        'No user specified, defaulting to UID 1000 for security'
      );
    }

    // Disable privileged mode
    hardened.HostConfig.Privileged = false;

    // Filter out Docker socket mounts if preventDockerSocket is enabled
    if (policy.preventDockerSocket && hardened.HostConfig) {
      // Binds
      if (hardened.HostConfig.Binds) {
        const originalBinds = [...hardened.HostConfig.Binds];
        hardened.HostConfig.Binds = hardened.HostConfig.Binds.filter(
          (bind) => !bind.includes('docker.sock') && !bind.includes('/var/run/docker')
        );
        if (originalBinds.length !== hardened.HostConfig.Binds.length) {
          logger.warn(
            { removed: originalBinds.filter((b) => !hardened.HostConfig!.Binds!.includes(b)) },
            'Removed Docker socket mounts from Binds'
          );
        }
      }

      // Mounts
      const hc: any = hardened.HostConfig;
      if (hc.Mounts && Array.isArray(hc.Mounts)) {
        const originalMounts = [...hc.Mounts];
        hc.Mounts = hc.Mounts.filter(
          (m: any) =>
            !(
              (m.Source || '').includes('docker.sock') ||
              (m.Source || '').includes('/var/run/docker')
            )
        );
        if (originalMounts.length !== hc.Mounts.length) {
          logger.warn(
            { removed: originalMounts.filter((m: any) => !hc.Mounts.includes(m)) },
            'Removed Docker socket mounts from Mounts'
          );
        }
      }
    }

    logger.info(
      {
        image: hardened.Image,
        user: hardened.User,
        capDrop: hardened.HostConfig.CapDrop,
        securityOpt: hardened.HostConfig.SecurityOpt,
      },
      'Applied security hardening to container config'
    );

    return hardened;
  }

  /**
   * Create isolated network for environment
   *
   * @param docker - Docker client
   * @param environmentId - Environment ID
   * @returns Network ID
   */
  static async createIsolatedNetwork(docker: Docker, environmentId: string): Promise<string> {
    const networkName = `vibebox-env-${environmentId}`;

    try {
      // Check if network already exists
      const networks = await docker.listNetworks({
        filters: { name: [networkName] },
      });

      if (networks.length > 0 && networks[0]?.Id) {
        logger.info(
          { networkId: networks[0].Id, environmentId },
          'Using existing isolated network'
        );
        return networks[0].Id;
      }

      // Create new isolated network
      const network = await docker.createNetwork({
        Name: networkName,
        Driver: 'bridge',
        Internal: false, // Allow internet access
        EnableIPv6: false,
        IPAM: {
          Config: [
            {
              Subnet: (() => {
                const { secondOctet, thirdOctet } = this.getNetworkSubnet(environmentId);
                return `172.${secondOctet}.${thirdOctet}.0/24`;
              })(),
            },
          ],
        },
        Labels: {
          'vibebox.environment.id': environmentId,
          'vibebox.network.type': 'isolated',
        },
      });

      logger.info(
        { networkId: network.id, networkName, environmentId },
        'Created isolated network for environment'
      );

      return network.id;
    } catch (error) {
      logger.error({ error, environmentId }, 'Failed to create isolated network');
      throw error;
    }
  }

  /**
   * Remove isolated network for environment
   *
   * @param docker - Docker client
   * @param environmentId - Environment ID
   */
  static async removeIsolatedNetwork(docker: Docker, environmentId: string): Promise<void> {
    const networkName = `vibebox-env-${environmentId}`;

    try {
      const networks = await docker.listNetworks({
        filters: { name: [networkName] },
      });

      if (networks.length > 0 && networks[0]) {
        const network = docker.getNetwork(networks[0].Id);
        await network.remove();
        logger.info({ environmentId, networkName }, 'Removed isolated network');
      }
    } catch (error) {
      logger.error({ error, environmentId }, 'Failed to remove isolated network');
      // Don't throw - network cleanup is not critical
    }
  }

  /**
   * Get network subnet for environment ID
   * Maps environment ID to a unique subnet in the RFC1918 172.16.0.0/12 range
   * Returns both second and third octets to provide collision-resistant /24 blocks
   *
   * @param environmentId - Environment ID
   * @returns Object with secondOctet (16-31, excluding 17-18) and thirdOctet (0-255)
   */
  private static getNetworkSubnet(environmentId: string): {
    secondOctet: number;
    thirdOctet: number;
  } {
    // Hash environment ID to derive two stable octets
    // Using RFC1918 private range 172.16.0.0/12 (172.16.x.0/24 to 172.31.x.0/24)
    // Avoid Docker-reserved subnets 172.17.0.0/16 and 172.18.0.0/16

    let hash = 0;
    for (let i = 0; i < environmentId.length; i++) {
      hash = (hash << 5) - hash + environmentId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    const absHash = Math.abs(hash);

    // Second octet: 16-31 range, but skip 17 and 18 (Docker defaults)
    // Available values: 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31 (14 values)
    const allowedSecondOctets = [16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
    const secondOctet = allowedSecondOctets[absHash % allowedSecondOctets.length] || 16;

    // Third octet: full range 0-255
    // Use a different part of the hash for third octet to increase entropy
    const thirdOctet = (absHash >> 8) % 256;

    return { secondOctet, thirdOctet };
  }

  /**
   * Match image name against pattern (supports wildcards)
   *
   * @param image - Image name
   * @param pattern - Pattern with wildcards (*, ?)
   * @returns True if image matches pattern
   */
  private static matchesPattern(image: string, pattern: string): boolean {
    if (pattern.length > 256) return false; // guard against pathological inputs

    // Escape regex meta characters, then expand wildcards (*, ?)
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const wildcarded = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${wildcarded}$`);
    return regex.test(image);
  }
}
