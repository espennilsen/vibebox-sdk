/**
 * Docker Security Service Tests
 * Comprehensive tests for Docker container security validation and hardening
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Docker from 'dockerode';
import {
  DockerSecurityService,
  SecurityPolicy,
  DEFAULT_SECURITY_POLICY,
  SecurityPolicyViolationError,
} from '@/services/docker-security.service';

describe('DockerSecurityService - validateContainerConfig', () => {
  describe('Image validation', () => {
    it('should allow whitelisted images', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: '1000',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).not.toThrow();
    });

    it('should block images not in whitelist', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'malicious:latest',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).toThrow(SecurityPolicyViolationError);
    });

    it('should block images with :latest tag', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:latest',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).toThrow(SecurityPolicyViolationError);
    });

    it('should block Docker-in-Docker images', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'docker:20-dind',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).toThrow(SecurityPolicyViolationError);
    });

    it('should match wildcard patterns correctly', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:18-alpine',
        User: '1000',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).not.toThrow();
    });

    it('should throw error with violation details for blocked image', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:latest',
        User: '1000',
      };

      try {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
        expect.fail('Should have thrown SecurityPolicyViolationError');
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityPolicyViolationError);
        expect((error as SecurityPolicyViolationError).violations).toHaveLength(1);
        expect((error as SecurityPolicyViolationError).violations[0]).toContain(':latest');
      }
    });
  });

  describe('Docker socket validation', () => {
    it('should block Docker socket mounting', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: '1000',
        HostConfig: {
          Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
        },
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).toThrow(SecurityPolicyViolationError);
    });

    it('should allow normal volume mounts', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: '1000',
        HostConfig: {
          Binds: ['/home/user/code:/workspace'],
        },
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).not.toThrow();
    });

    it('should allow Docker socket when policy disabled', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        preventDockerSocket: false,
      };

      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: '1000',
        HostConfig: {
          Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
        },
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, policy);
      }).not.toThrow();
    });
  });

  describe('Privileged mode validation', () => {
    it('should block privileged mode', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: '1000',
        HostConfig: {
          Privileged: true,
        },
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).toThrow(SecurityPolicyViolationError);
    });

    it('should allow non-privileged containers', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: '1000',
        HostConfig: {
          Privileged: false,
        },
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).not.toThrow();
    });
  });

  describe('Non-root user validation', () => {
    it('should block root user', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: 'root',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).toThrow(SecurityPolicyViolationError);
    });

    it('should block UID 0', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: '0',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).toThrow(SecurityPolicyViolationError);
    });

    it('should allow non-root user by name', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: 'node',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).not.toThrow();
    });

    it('should allow non-root user by UID', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: '1000',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
      }).not.toThrow();
    });

    it('should allow root user when policy disabled', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        enforceNonRoot: false,
      };

      const options: Docker.ContainerCreateOptions = {
        Image: 'node:20-alpine',
        User: 'root',
      };

      expect(() => {
        DockerSecurityService.validateContainerConfig(options, policy);
      }).not.toThrow();
    });
  });

  describe('Multiple violations', () => {
    it('should report all violations', () => {
      const options: Docker.ContainerCreateOptions = {
        Image: 'malicious:latest',
        User: 'root',
        HostConfig: {
          Privileged: true,
          Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
        },
      };

      try {
        DockerSecurityService.validateContainerConfig(options, DEFAULT_SECURITY_POLICY);
        expect.fail('Should have thrown SecurityPolicyViolationError');
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityPolicyViolationError);
        expect((error as SecurityPolicyViolationError).violations.length).toBeGreaterThan(1);
      }
    });
  });
});

describe('DockerSecurityService - applySecurityHardening', () => {
  it('should drop all capabilities by default', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.HostConfig?.CapDrop).toEqual(['ALL']);
  });

  it('should set no-new-privileges security option', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.HostConfig?.SecurityOpt).toContain('no-new-privileges:true');
  });

  it('should disable privileged mode', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
      HostConfig: {
        Privileged: true,
      },
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.HostConfig?.Privileged).toBe(false);
  });

  it('should set default user to 1000 if not specified', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.User).toBe('1000');
  });

  it('should preserve specified non-root user', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: 'node',
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.User).toBe('node');
  });

  it('should override root user with default user', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: 'root',
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.User).toBe('1000');
  });

  it('should remove Docker socket mounts', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
      HostConfig: {
        Binds: [
          '/var/run/docker.sock:/var/run/docker.sock',
          '/home/user/code:/workspace',
        ],
      },
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.HostConfig?.Binds).toEqual(['/home/user/code:/workspace']);
  });

  it('should preserve other binds when removing Docker socket', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
      HostConfig: {
        Binds: [
          '/home/user/code:/workspace',
          '/home/user/data:/data',
        ],
      },
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.HostConfig?.Binds).toHaveLength(2);
  });

  it('should set read-only root filesystem when enabled', () => {
    const policy: SecurityPolicy = {
      ...DEFAULT_SECURITY_POLICY,
      readOnlyRootFs: true,
    };

    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
    };

    const hardened = DockerSecurityService.applySecurityHardening(options, policy);

    expect(hardened.HostConfig?.ReadonlyRootfs).toBe(true);
  });

  it('should preserve existing HostConfig settings', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
      HostConfig: {
        Memory: 1024 * 1024 * 1024,
        NanoCpus: 1e9,
      },
    };

    const hardened = DockerSecurityService.applySecurityHardening(options);

    expect(hardened.HostConfig?.Memory).toBe(1024 * 1024 * 1024);
    expect(hardened.HostConfig?.NanoCpus).toBe(1e9);
  });

  it('should not modify original options object', () => {
    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
    };

    const originalUser = options.User;
    DockerSecurityService.applySecurityHardening(options);

    expect(options.User).toBe(originalUser);
  });
});

describe('DockerSecurityService - createIsolatedNetwork', () => {
  let mockDocker: any;
  let mockNetwork: any;

  beforeEach(() => {
    mockNetwork = {
      id: 'network-123',
    };

    mockDocker = {
      listNetworks: vi.fn(),
      createNetwork: vi.fn().mockResolvedValue(mockNetwork),
    };
  });

  it('should create new isolated network', async () => {
    mockDocker.listNetworks.mockResolvedValue([]);

    const networkId = await DockerSecurityService.createIsolatedNetwork(
      mockDocker as unknown as Docker,
      'env-123'
    );

    expect(networkId).toBe('network-123');
    expect(mockDocker.createNetwork).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: 'vibebox-env-env-123',
        Driver: 'bridge',
        Internal: false,
        Labels: {
          'vibebox.environment.id': 'env-123',
          'vibebox.network.type': 'isolated',
        },
      })
    );
  });

  it('should reuse existing network', async () => {
    mockDocker.listNetworks.mockResolvedValue([
      { Id: 'existing-network-123', Name: 'vibebox-env-env-123' },
    ]);

    const networkId = await DockerSecurityService.createIsolatedNetwork(
      mockDocker as unknown as Docker,
      'env-123'
    );

    expect(networkId).toBe('existing-network-123');
    expect(mockDocker.createNetwork).not.toHaveBeenCalled();
  });

  it('should use unique subnet for each environment', async () => {
    mockDocker.listNetworks.mockResolvedValue([]);

    await DockerSecurityService.createIsolatedNetwork(
      mockDocker as unknown as Docker,
      'env-123'
    );

    const createCall = mockDocker.createNetwork.mock.calls[0][0];
    // Updated to expect 172.secondOctet.thirdOctet.0/24 format (two variable octets)
    expect(createCall.IPAM.Config[0].Subnet).toMatch(/^172\.\d{1,3}\.\d{1,3}\.0\/24$/);
  });

  it('should filter networks by name', async () => {
    mockDocker.listNetworks.mockResolvedValue([]);

    await DockerSecurityService.createIsolatedNetwork(
      mockDocker as unknown as Docker,
      'env-123'
    );

    expect(mockDocker.listNetworks).toHaveBeenCalledWith({
      filters: { name: ['vibebox-env-env-123'] },
    });
  });
});

describe('DockerSecurityService - removeIsolatedNetwork', () => {
  let mockDocker: any;
  let mockNetwork: any;

  beforeEach(() => {
    mockNetwork = {
      remove: vi.fn().mockResolvedValue(undefined),
    };

    mockDocker = {
      listNetworks: vi.fn(),
      getNetwork: vi.fn().mockReturnValue(mockNetwork),
    };
  });

  it('should remove existing network', async () => {
    mockDocker.listNetworks.mockResolvedValue([
      { Id: 'network-123', Name: 'vibebox-env-env-123' },
    ]);

    await DockerSecurityService.removeIsolatedNetwork(
      mockDocker as unknown as Docker,
      'env-123'
    );

    expect(mockDocker.getNetwork).toHaveBeenCalledWith('network-123');
    expect(mockNetwork.remove).toHaveBeenCalled();
  });

  it('should not throw if network does not exist', async () => {
    mockDocker.listNetworks.mockResolvedValue([]);

    await expect(
      DockerSecurityService.removeIsolatedNetwork(mockDocker as unknown as Docker, 'env-123')
    ).resolves.not.toThrow();
  });

  it('should not throw if network removal fails', async () => {
    mockDocker.listNetworks.mockResolvedValue([
      { Id: 'network-123', Name: 'vibebox-env-env-123' },
    ]);
    mockNetwork.remove.mockRejectedValue(new Error('Network in use'));

    await expect(
      DockerSecurityService.removeIsolatedNetwork(mockDocker as unknown as Docker, 'env-123')
    ).resolves.not.toThrow();
  });
});

describe('DockerSecurityService - Pattern Matching', () => {
  it('should match exact image names', () => {
    const policy: SecurityPolicy = {
      allowedImages: ['node:20-alpine'],
    };

    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
    };

    expect(() => {
      DockerSecurityService.validateContainerConfig(options, policy);
    }).not.toThrow();
  });

  it('should match wildcard patterns', () => {
    const policy: SecurityPolicy = {
      allowedImages: ['node:*'],
    };

    const options: Docker.ContainerCreateOptions = {
      Image: 'node:18-alpine',
      User: '1000',
    };

    expect(() => {
      DockerSecurityService.validateContainerConfig(options, policy);
    }).not.toThrow();
  });

  it('should match multiple wildcards', () => {
    const policy: SecurityPolicy = {
      allowedImages: ['*/*:*'],
    };

    const options: Docker.ContainerCreateOptions = {
      Image: 'myregistry/node:20-alpine',
      User: '1000',
    };

    expect(() => {
      DockerSecurityService.validateContainerConfig(options, policy);
    }).not.toThrow();
  });

  it('should not match partial patterns', () => {
    const policy: SecurityPolicy = {
      allowedImages: ['node:20'],
    };

    const options: Docker.ContainerCreateOptions = {
      Image: 'node:20-alpine',
      User: '1000',
    };

    expect(() => {
      DockerSecurityService.validateContainerConfig(options, policy);
    }).toThrow(SecurityPolicyViolationError);
  });
});

describe('DEFAULT_SECURITY_POLICY', () => {
  it('should have secure defaults', () => {
    expect(DEFAULT_SECURITY_POLICY.preventDockerSocket).toBe(true);
    expect(DEFAULT_SECURITY_POLICY.enforceNonRoot).toBe(true);
    expect(DEFAULT_SECURITY_POLICY.preventPrivilegeEscalation).toBe(true);
    expect(DEFAULT_SECURITY_POLICY.networkIsolation).toBe('isolated');
    expect(DEFAULT_SECURITY_POLICY.dropCapabilities).toContain('ALL');
  });

  it('should have reasonable image whitelist', () => {
    expect(DEFAULT_SECURITY_POLICY.allowedImages).toContain('node:*');
    expect(DEFAULT_SECURITY_POLICY.allowedImages).toContain('python:*');
    expect(DEFAULT_SECURITY_POLICY.allowedImages).toContain('ubuntu:*');
  });

  it('should block dangerous images', () => {
    expect(DEFAULT_SECURITY_POLICY.blockedImages).toContain('*:latest');
    expect(DEFAULT_SECURITY_POLICY.blockedImages).toContain('docker:*');
  });
});
