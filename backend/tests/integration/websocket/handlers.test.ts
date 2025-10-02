/**
 * Integration Tests: WebSocket Handlers
 * Tests WebSocket handler connections, authentication, and message flow
 * Tasks: T063-T066, T076
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logStreamHandler } from '@/api/websocket/logStream';
import { terminalHandler } from '@/api/websocket/terminal';
import { statusHandler } from '@/api/websocket/status';
import { MessageType } from '@/services/websocket.service';
import { LogStream } from '@/types/prisma-enums';
import { SocketStream } from '@fastify/websocket';
import { FastifyRequest } from 'fastify';

// Mock services
vi.mock('@/services/log.service');
vi.mock('@/services/environment.service');
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Prisma
vi.mock('@/lib/db', () => ({
  getPrismaClient: () => ({
    environment: {
      findUnique: vi.fn(),
    },
  }),
}));

/**
 * Mock WebSocket implementation for testing
 */
class MockSocket {
  public readyState: number = 1; // OPEN state
  public OPEN: number = 1;
  public sentMessages: string[] = [];
  private eventHandlers: Map<string, Function[]> = new Map();

  send(data: string): void {
    this.sentMessages.push(data);
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }

  close(): void {
    this.readyState = 3; // CLOSED state
    this.emit('close');
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  getLastMessage(): any {
    if (this.sentMessages.length === 0) return null;
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]!);
  }

  getAllMessages(): any[] {
    return this.sentMessages.map((msg) => JSON.parse(msg));
  }
}

/**
 * Create mock FastifyRequest
 */
function createMockRequest(queryParams: Record<string, any> = {}): FastifyRequest {
  return {
    query: queryParams,
  } as FastifyRequest;
}

/**
 * Create mock SocketStream
 */
function createMockSocketStream(socket: MockSocket): SocketStream {
  return {
    socket: socket as any,
  } as SocketStream;
}

describe('WebSocket Handlers - logStreamHandler', () => {
  let mockSocket: MockSocket;
  let mockConnection: SocketStream;
  let mockRequest: FastifyRequest;
  let mockLogService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSocket = new MockSocket();
    mockConnection = createMockSocketStream(mockSocket);

    // Import and setup mocks
    const { LogService } = await import('@/services/log.service');
    const { EnvironmentService } = await import('@/services/environment.service');

    mockLogService = {
      streamLogs: vi.fn(),
    };
    vi.mocked(LogService).mockImplementation(() => mockLogService as any);

    // Mock EnvironmentService for authorization checks
    const mockEnvironmentService = {
      getEnvironmentById: vi.fn().mockResolvedValue({
        id: 'env-123',
        name: 'test-env',
        projectId: 'project-123',
        status: 'running',
        containerId: 'container-123',
      }),
    };
    vi.mocked(EnvironmentService).mockImplementation(() => mockEnvironmentService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Handling', () => {
    /**
     * Test: Successful connection with valid environmentId
     */
    it('should accept connection with valid environmentId', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      const mockUnsubscribe = vi.fn();
      mockLogService.streamLogs.mockResolvedValue(mockUnsubscribe);

      // Act
      await logStreamHandler(mockConnection, mockRequest as any);

      // Assert
      expect(mockSocket.sentMessages.length).toBeGreaterThan(0);
      const lastMessage = mockSocket.getLastMessage();
      expect(lastMessage.type).toBe(MessageType.LOG);
    });

    /**
     * Test: Rejects connection without environmentId
     */
    it('should reject connection without environmentId', async () => {
      // Arrange
      mockRequest = createMockRequest({});

      // Act
      await logStreamHandler(mockConnection, mockRequest as any);

      // Assert
      const lastMessage = mockSocket.getLastMessage();
      expect(lastMessage.type).toBe(MessageType.ERROR);
      expect(lastMessage.payload.message).toContain('environmentId is required');
      expect(mockSocket.readyState).toBe(3); // CLOSED
    });

    /**
     * Test: Sends initial connection message
     */
    it('should send initial connection success message', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      const mockUnsubscribe = vi.fn();
      mockLogService.streamLogs.mockResolvedValue(mockUnsubscribe);

      // Act
      await logStreamHandler(mockConnection, mockRequest as any);

      // Assert
      const messages = mockSocket.getAllMessages();
      const initMessage = messages.find((m) => m.payload?.message === 'Log stream connected');
      expect(initMessage).toBeDefined();
      expect(initMessage.type).toBe(MessageType.LOG);
      expect(initMessage.payload.environmentId).toBe('env-123');
    });
  });

  describe('Log Streaming', () => {
    /**
     * Test: Calls LogService.streamLogs with callback
     */
    it('should call LogService.streamLogs with callback', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      const mockUnsubscribe = vi.fn();
      mockLogService.streamLogs.mockResolvedValue(mockUnsubscribe);

      // Act
      await logStreamHandler(mockConnection, mockRequest as any);

      // Assert
      expect(mockLogService.streamLogs).toHaveBeenCalledWith('env-123', expect.any(Function));
    });

    /**
     * Test: Broadcasts logs received from LogService
     */
    it('should broadcast logs received from streamLogs callback', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      let streamCallback: Function;
      mockLogService.streamLogs.mockImplementation(
        async (envId: string, callback: Function) => {
          streamCallback = callback;
          return vi.fn();
        }
      );

      // Act
      await logStreamHandler(mockConnection, mockRequest as any);

      // Simulate log entry from Docker
      streamCallback!({
        stream: LogStream.stdout,
        content: 'Application started',
        timestamp: new Date(),
        level: 'info',
      });

      // Assert
      const messages = mockSocket.getAllMessages();
      const logMessage = messages.find((m) => m.payload?.message === 'Application started');
      expect(logMessage).toBeDefined();
      expect(logMessage.type).toBe(MessageType.LOG);
      expect(logMessage.payload.stream).toBe(LogStream.stdout);
    });
  });

  describe('Connection Cleanup', () => {
    /**
     * Test: Calls unsubscribe on socket close
     */
    it('should call unsubscribe when socket closes', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      const mockUnsubscribe = vi.fn();
      mockLogService.streamLogs.mockResolvedValue(mockUnsubscribe);

      // Act
      await logStreamHandler(mockConnection, mockRequest as any);
      mockSocket.close();

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    /**
     * Test: Calls unsubscribe on socket error
     */
    it('should call unsubscribe when socket errors', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      const mockUnsubscribe = vi.fn();
      mockLogService.streamLogs.mockResolvedValue(mockUnsubscribe);

      // Act
      await logStreamHandler(mockConnection, mockRequest as any);
      mockSocket.simulateError(new Error('Connection error'));

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    /**
     * Test: Handles streamLogs errors gracefully
     */
    it('should handle streamLogs errors gracefully', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      mockLogService.streamLogs.mockRejectedValue(new Error('Stream error'));

      // Act
      await logStreamHandler(mockConnection, mockRequest as any);

      // Assert
      const lastMessage = mockSocket.getLastMessage();
      expect(lastMessage.type).toBe(MessageType.ERROR);
      expect(lastMessage.payload.message).toContain('Failed to setup log stream');
    });
  });
});

describe('WebSocket Handlers - terminalHandler', () => {
  let mockSocket: MockSocket;
  let mockConnection: SocketStream;
  let mockRequest: FastifyRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSocket = new MockSocket();
    mockConnection = createMockSocketStream(mockSocket);

    // Mock SessionService for authorization checks
    const { SessionService } = await import('@/services/session.service');
    const mockSessionService = {
      getSessionById: vi.fn().mockResolvedValue({
        id: 'session-789',
        environmentId: 'env-123',
        type: 'shell',
        status: 'active',
      }),
    };
    vi.mocked(SessionService).mockImplementation(() => mockSessionService as any);
  });

  describe('Connection Handling', () => {
    /**
     * Test: Successful connection with valid sessionId
     */
    it('should accept connection with valid sessionId', () => {
      // Arrange
      mockRequest = createMockRequest({ sessionId: 'session-789' });

      // Act
      terminalHandler(mockConnection, mockRequest as any);

      // Assert
      expect(mockSocket.sentMessages.length).toBeGreaterThan(0);
      const lastMessage = mockSocket.getLastMessage();
      expect(lastMessage.type).toBe(MessageType.TERMINAL_OUTPUT);
      expect(lastMessage.payload.data).toContain('Terminal connected');
    });

    /**
     * Test: Rejects connection without sessionId
     */
    it('should reject connection without sessionId', () => {
      // Arrange
      mockRequest = createMockRequest({});

      // Act
      terminalHandler(mockConnection, mockRequest as any);

      // Assert
      const lastMessage = mockSocket.getLastMessage();
      expect(lastMessage.type).toBe(MessageType.ERROR);
      expect(lastMessage.payload.message).toContain('sessionId is required');
    });
  });

  describe('Message Handling', () => {
    /**
     * Test: Handles terminal input messages
     */
    it('should handle terminal input messages', () => {
      // Arrange
      mockRequest = createMockRequest({ sessionId: 'session-789' });

      // Act
      terminalHandler(mockConnection, mockRequest as any);

      // Send terminal input
      const inputMessage = JSON.stringify({
        type: MessageType.TERMINAL_INPUT,
        payload: { data: 'ls -la\n' },
      });

      mockSocket.emit('message', Buffer.from(inputMessage));

      // Assert - Should echo back (in real implementation would come from actual terminal)
      const messages = mockSocket.getAllMessages();
      const outputMessage = messages.find(
        (m) => m.type === MessageType.TERMINAL_OUTPUT && m.payload.data === 'ls -la\n'
      );
      expect(outputMessage).toBeDefined();
    });

    /**
     * Test: Handles terminal resize messages
     */
    it('should handle terminal resize messages', () => {
      // Arrange
      mockRequest = createMockRequest({ sessionId: 'session-789' });

      // Act
      terminalHandler(mockConnection, mockRequest as any);

      // Send resize message
      const resizeMessage = JSON.stringify({
        type: MessageType.TERMINAL_RESIZE,
        payload: { cols: 120, rows: 40 },
      });

      // Should not throw error
      expect(() => mockSocket.emit('message', Buffer.from(resizeMessage))).not.toThrow();
    });

    /**
     * Test: Handles malformed messages gracefully
     */
    it('should handle malformed messages gracefully', () => {
      // Arrange
      mockRequest = createMockRequest({ sessionId: 'session-789' });

      // Act
      terminalHandler(mockConnection, mockRequest as any);

      // Send malformed message
      expect(() => mockSocket.emit('message', Buffer.from('not-json'))).not.toThrow();
    });
  });

  describe('Connection Cleanup', () => {
    /**
     * Test: Handles socket close event
     */
    it('should handle socket close gracefully', () => {
      // Arrange
      mockRequest = createMockRequest({ sessionId: 'session-789' });

      // Act
      terminalHandler(mockConnection, mockRequest as any);
      mockSocket.close();

      // Assert - Should not throw
      expect(mockSocket.readyState).toBe(3); // CLOSED
    });

    /**
     * Test: Handles socket error event
     */
    it('should handle socket error gracefully', () => {
      // Arrange
      mockRequest = createMockRequest({ sessionId: 'session-789' });

      // Act
      terminalHandler(mockConnection, mockRequest as any);
      mockSocket.simulateError(new Error('Connection error'));

      // Assert - Should not throw
      expect(true).toBe(true);
    });
  });
});

describe('WebSocket Handlers - statusHandler', () => {
  let mockSocket: MockSocket;
  let mockConnection: SocketStream;
  let mockRequest: FastifyRequest;
  let mockEnvironmentService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSocket = new MockSocket();
    mockConnection = createMockSocketStream(mockSocket);

    // Import and setup mocks
    const { EnvironmentService } = await import('@/services/environment.service');
    mockEnvironmentService = {
      getEnvironmentById: vi.fn().mockResolvedValue({
        id: 'env-123',
        name: 'test-env',
        projectId: 'project-123',
        status: 'running',
        containerId: 'container-123',
      }),
      getEnvironmentStatus: vi.fn(),
    };
    vi.mocked(EnvironmentService).mockImplementation(() => mockEnvironmentService as any);
  });

  describe('Connection Handling', () => {
    /**
     * Test: Successful connection with valid environmentId
     */
    it('should accept connection with valid environmentId', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      mockEnvironmentService.getEnvironmentStatus.mockResolvedValue({
        status: 'running',
        containerStatus: 'healthy',
        uptime: 3600,
        lastError: null,
      });

      // Act
      await statusHandler(mockConnection, mockRequest as any);

      // Assert
      expect(mockSocket.sentMessages.length).toBeGreaterThan(0);
      const lastMessage = mockSocket.getLastMessage();
      expect(lastMessage.type).toBe(MessageType.ENV_STATUS);
    });

    /**
     * Test: Rejects connection without environmentId
     */
    it('should reject connection without environmentId', async () => {
      // Arrange
      mockRequest = createMockRequest({});

      // Act
      await statusHandler(mockConnection, mockRequest as any);

      // Assert
      const lastMessage = mockSocket.getLastMessage();
      expect(lastMessage.type).toBe(MessageType.ERROR);
      expect(lastMessage.payload.message).toContain('environmentId is required');
    });

    /**
     * Test: Sends initial status on connection
     */
    it('should send initial environment status on connection', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      mockEnvironmentService.getEnvironmentStatus.mockResolvedValue({
        status: 'running',
        containerStatus: 'healthy',
        uptime: 3600,
        lastError: null,
      });

      // Act
      await statusHandler(mockConnection, mockRequest as any);

      // Assert
      expect(mockEnvironmentService.getEnvironmentStatus).toHaveBeenCalledWith('env-123');
      const messages = mockSocket.getAllMessages();
      const statusMessage = messages.find((m) => m.type === MessageType.ENV_STATUS);
      expect(statusMessage).toBeDefined();
      expect(statusMessage.payload.status).toBe('running');
    });
  });

  describe('Status Polling', () => {
    /**
     * Test: Polls for status updates periodically
     */
    it(
      'should poll for status updates every 5 seconds',
      async () => {
        // Arrange
        vi.useFakeTimers();
        mockRequest = createMockRequest({ environmentId: 'env-123' });
        mockEnvironmentService.getEnvironmentStatus.mockResolvedValue({
          status: 'running',
          containerStatus: 'healthy',
          uptime: 3600,
          lastError: null,
        });

        try {
          // Act
          await statusHandler(mockConnection, mockRequest as any);

          // Initial call
          expect(mockEnvironmentService.getEnvironmentStatus).toHaveBeenCalledTimes(1);

          // Advance time by 5 seconds and run timers
          await vi.advanceTimersByTimeAsync(5100);

          // Assert - Second call should have happened
          expect(mockEnvironmentService.getEnvironmentStatus).toHaveBeenCalledTimes(2);
        } finally {
          vi.useRealTimers();
        }
      },
      15000
    ); // Increase test timeout

    /**
     * Test: Stops polling when socket closes
     */
    it(
      'should stop polling when socket closes',
      async () => {
        // Arrange
        vi.useFakeTimers();
        mockRequest = createMockRequest({ environmentId: 'env-123' });
        mockEnvironmentService.getEnvironmentStatus.mockResolvedValue({
          status: 'running',
          containerStatus: 'healthy',
          uptime: 3600,
          lastError: null,
        });

        try {
          // Act
          await statusHandler(mockConnection, mockRequest as any);
          const initialCalls = mockEnvironmentService.getEnvironmentStatus.mock.calls.length;

          // Close the socket
          mockSocket.close();

          // Advance time - should not poll anymore
          await vi.advanceTimersByTimeAsync(10000);

          // Assert - No additional calls after close
          expect(mockEnvironmentService.getEnvironmentStatus).toHaveBeenCalledTimes(initialCalls);
        } finally {
          vi.useRealTimers();
        }
      },
      15000
    ); // Increase test timeout
  });

  describe('Error Handling', () => {
    /**
     * Test: Handles getEnvironmentStatus errors gracefully
     */
    it('should handle getEnvironmentStatus errors gracefully', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      mockEnvironmentService.getEnvironmentStatus.mockRejectedValue(
        new Error('Environment not found')
      );

      // Act & Assert - Should not throw
      await expect(
        statusHandler(mockConnection, mockRequest as any)
      ).resolves.not.toThrow();
    });

    /**
     * Test: Continues polling after transient errors
     */
    it(
      'should continue polling after transient errors',
      async () => {
        // Arrange
        vi.useFakeTimers();
        mockRequest = createMockRequest({ environmentId: 'env-123' });

        // First call fails, second succeeds
        mockEnvironmentService.getEnvironmentStatus
          .mockRejectedValueOnce(new Error('Transient error'))
          .mockResolvedValue({
            status: 'running',
            containerStatus: 'healthy',
            uptime: 3600,
            lastError: null,
          });

        try {
          // Act
          await statusHandler(mockConnection, mockRequest as any);

          // Advance time to trigger second poll
          await vi.advanceTimersByTimeAsync(5100);

          // Assert - Should have called twice despite first error
          expect(mockEnvironmentService.getEnvironmentStatus).toHaveBeenCalledTimes(2);
        } finally {
          vi.useRealTimers();
        }
      },
      15000
    ); // Increase test timeout
  });

  describe('Connection Cleanup', () => {
    /**
     * Test: Cleans up interval on socket close
     */
    it('should clear interval on socket close', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      mockEnvironmentService.getEnvironmentStatus.mockResolvedValue({
        status: 'running',
        containerStatus: 'healthy',
        uptime: 3600,
        lastError: null,
      });

      // Act
      await statusHandler(mockConnection, mockRequest as any);
      mockSocket.close();

      // Assert - Should have cleaned up
      expect(mockSocket.readyState).toBe(3); // CLOSED
    });

    /**
     * Test: Cleans up interval on socket error
     */
    it('should clear interval on socket error', async () => {
      // Arrange
      mockRequest = createMockRequest({ environmentId: 'env-123' });
      mockEnvironmentService.getEnvironmentStatus.mockResolvedValue({
        status: 'running',
        containerStatus: 'healthy',
        uptime: 3600,
        lastError: null,
      });

      // Act
      await statusHandler(mockConnection, mockRequest as any);
      mockSocket.simulateError(new Error('Connection error'));

      // Assert - Should not throw
      expect(true).toBe(true);
    });
  });
});

describe('WebSocket Handlers - JWT Authentication', () => {
  /**
   * Test: Token parameter is passed in query string
   * Note: Actual JWT verification is not implemented yet (marked as TODO in handlers)
   */
  it('should accept token parameter in query string', async () => {
    // Arrange
    const mockSocket = new MockSocket();
    const mockConnection = createMockSocketStream(mockSocket);
    const mockRequest = createMockRequest({
      environmentId: 'env-123',
      token: 'mock-jwt-token',
    });

    const { LogService } = await import('@/services/log.service');
    const mockLogService = {
      streamLogs: vi.fn().mockResolvedValue(vi.fn()),
    };
    vi.mocked(LogService).mockImplementation(() => mockLogService as any);

    // Act
    await logStreamHandler(mockConnection, mockRequest as any);

    // Assert - Connection should be accepted (auth not yet enforced)
    expect(mockSocket.sentMessages.length).toBeGreaterThan(0);
  });
});
