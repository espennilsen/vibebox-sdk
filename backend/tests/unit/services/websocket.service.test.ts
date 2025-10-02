/**
 * Unit Tests: WebSocketService - Real-time Communication
 * Tests WebSocket connection management, subscriptions, and message broadcasting
 * Tasks: T076, T065-T066
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService, MessageType } from '@/services/websocket.service';
import { LogStream } from '@/types/prisma-enums';
import type {
  LogMessagePayload,
  EnvironmentStatusPayload,
  TerminalOutputPayload,
  ClientConnection,
} from '@/services/websocket.service';
import { WebSocket } from 'ws';

/**
 * Mock WebSocket implementation for testing
 */
class MockWebSocket {
  public readyState: number = WebSocket.OPEN;
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

  ping(): void {
    // Simulate ping
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
  }
}

describe('WebSocketService - Client Management', () => {
  let wsService: WebSocketService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    wsService = new WebSocketService();
    mockWs = new MockWebSocket();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerClient', () => {
    /**
     * Test: Successful client registration
     */
    it('should register a new client connection', () => {
      // Act
      const client = wsService.registerClient('client-123', mockWs as any, 'user-456');

      // Assert
      expect(client).toBeDefined();
      expect(client.id).toBe('client-123');
      expect(client.userId).toBe('user-456');
      expect(client.subscribedEnvironments).toBeDefined();
      expect(client.subscribedSessions).toBeDefined();
      expect(client.lastActivity).toBeInstanceOf(Date);
      expect(client.ws).toBe(mockWs);
    });

    /**
     * Test: Client appears in active clients list
     */
    it('should add client to active clients list', () => {
      // Act
      wsService.registerClient('client-123', mockWs as any, 'user-456');
      const activeClients = wsService.getActiveClients();

      // Assert
      expect(activeClients).toHaveLength(1);
      expect(activeClients[0]!.id).toBe('client-123');
    });

    /**
     * Test: Sets up pong event handler for connection health
     */
    it('should set up pong handler to update last activity', () => {
      // Arrange
      const initialTime = new Date();

      // Act
      const client = wsService.registerClient('client-123', mockWs as any, 'user-456');
      const initialActivity = client.lastActivity;

      // Wait a bit
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      // Simulate pong event
      mockWs.emit('pong');

      // Assert
      expect(client.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());

      vi.useRealTimers();
    });

    /**
     * Test: Multiple clients can be registered
     */
    it('should handle multiple client registrations', () => {
      // Arrange
      const mockWs1 = new MockWebSocket();
      const mockWs2 = new MockWebSocket();
      const mockWs3 = new MockWebSocket();

      // Act
      wsService.registerClient('client-1', mockWs1 as any, 'user-1');
      wsService.registerClient('client-2', mockWs2 as any, 'user-2');
      wsService.registerClient('client-3', mockWs3 as any, 'user-3');

      // Assert
      const activeClients = wsService.getActiveClients();
      expect(activeClients).toHaveLength(3);
    });
  });

  describe('unregisterClient', () => {
    /**
     * Test: Successful client unregistration
     */
    it('should unregister a client connection', () => {
      // Arrange
      wsService.registerClient('client-123', mockWs as any, 'user-456');

      // Act
      wsService.unregisterClient('client-123');

      // Assert
      const activeClients = wsService.getActiveClients();
      expect(activeClients).toHaveLength(0);
    });

    /**
     * Test: Removes client from all environment subscriptions
     */
    it('should remove client from all environment subscriptions', () => {
      // Arrange
      wsService.registerClient('client-123', mockWs as any, 'user-456');
      wsService.subscribeToEnvironment('client-123', 'env-1');
      wsService.subscribeToEnvironment('client-123', 'env-2');

      // Act
      wsService.unregisterClient('client-123');

      // Assert
      expect(wsService.getEnvironmentSubscribers('env-1')).toHaveLength(0);
      expect(wsService.getEnvironmentSubscribers('env-2')).toHaveLength(0);
    });

    /**
     * Test: Removes client from all session subscriptions
     */
    it('should remove client from all session subscriptions', () => {
      // Arrange
      wsService.registerClient('client-123', mockWs as any, 'user-456');
      wsService.subscribeToSession('client-123', 'session-1');
      wsService.subscribeToSession('client-123', 'session-2');

      // Act
      wsService.unregisterClient('client-123');

      // Assert
      expect(wsService.getSessionSubscribers('session-1')).toHaveLength(0);
      expect(wsService.getSessionSubscribers('session-2')).toHaveLength(0);
    });

    /**
     * Test: Handles unregistering non-existent client gracefully
     */
    it('should handle unregistering non-existent client without error', () => {
      // Act & Assert
      expect(() => wsService.unregisterClient('non-existent')).not.toThrow();
    });
  });
});

describe('WebSocketService - Subscription Management', () => {
  let wsService: WebSocketService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    wsService = new WebSocketService();
    mockWs = new MockWebSocket();
    wsService.registerClient('client-123', mockWs as any, 'user-456');
  });

  describe('subscribeToEnvironment', () => {
    /**
     * Test: Successful environment subscription
     */
    it('should subscribe client to environment', () => {
      // Act
      wsService.subscribeToEnvironment('client-123', 'env-456');

      // Assert
      const subscribers = wsService.getEnvironmentSubscribers('env-456');
      expect(subscribers).toContain('client-123');
    });

    /**
     * Test: Client can subscribe to multiple environments
     */
    it('should allow client to subscribe to multiple environments', () => {
      // Act
      wsService.subscribeToEnvironment('client-123', 'env-1');
      wsService.subscribeToEnvironment('client-123', 'env-2');
      wsService.subscribeToEnvironment('client-123', 'env-3');

      // Assert
      expect(wsService.getEnvironmentSubscribers('env-1')).toContain('client-123');
      expect(wsService.getEnvironmentSubscribers('env-2')).toContain('client-123');
      expect(wsService.getEnvironmentSubscribers('env-3')).toContain('client-123');
    });

    /**
     * Test: Multiple clients can subscribe to same environment
     */
    it('should allow multiple clients to subscribe to same environment', () => {
      // Arrange
      const mockWs2 = new MockWebSocket();
      const mockWs3 = new MockWebSocket();
      wsService.registerClient('client-2', mockWs2 as any, 'user-2');
      wsService.registerClient('client-3', mockWs3 as any, 'user-3');

      // Act
      wsService.subscribeToEnvironment('client-123', 'env-456');
      wsService.subscribeToEnvironment('client-2', 'env-456');
      wsService.subscribeToEnvironment('client-3', 'env-456');

      // Assert
      const subscribers = wsService.getEnvironmentSubscribers('env-456');
      expect(subscribers).toHaveLength(3);
      expect(subscribers).toContain('client-123');
      expect(subscribers).toContain('client-2');
      expect(subscribers).toContain('client-3');
    });

    /**
     * Test: Handles subscribing non-existent client
     */
    it('should handle subscribing non-existent client gracefully', () => {
      // Arrange
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      wsService.subscribeToEnvironment('non-existent', 'env-456');

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot subscribe: client non-existent not found')
      );
      expect(wsService.getEnvironmentSubscribers('env-456')).toHaveLength(0);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('unsubscribeFromEnvironment', () => {
    /**
     * Test: Successful environment unsubscription
     */
    it('should unsubscribe client from environment', () => {
      // Arrange
      wsService.subscribeToEnvironment('client-123', 'env-456');

      // Act
      wsService.unsubscribeFromEnvironment('client-123', 'env-456');

      // Assert
      const subscribers = wsService.getEnvironmentSubscribers('env-456');
      expect(subscribers).toHaveLength(0);
    });

    /**
     * Test: Unsubscribing one client doesn't affect other subscribers
     */
    it('should not affect other subscribers when unsubscribing', () => {
      // Arrange
      const mockWs2 = new MockWebSocket();
      wsService.registerClient('client-2', mockWs2 as any, 'user-2');
      wsService.subscribeToEnvironment('client-123', 'env-456');
      wsService.subscribeToEnvironment('client-2', 'env-456');

      // Act
      wsService.unsubscribeFromEnvironment('client-123', 'env-456');

      // Assert
      const subscribers = wsService.getEnvironmentSubscribers('env-456');
      expect(subscribers).toHaveLength(1);
      expect(subscribers).toContain('client-2');
    });

    /**
     * Test: Handles unsubscribing from non-existent subscription
     */
    it('should handle unsubscribing from non-existent subscription gracefully', () => {
      // Act & Assert
      expect(() =>
        wsService.unsubscribeFromEnvironment('client-123', 'env-not-subscribed')
      ).not.toThrow();
    });
  });

  describe('subscribeToSession', () => {
    /**
     * Test: Successful session subscription
     */
    it('should subscribe client to session', () => {
      // Act
      wsService.subscribeToSession('client-123', 'session-789');

      // Assert
      const subscribers = wsService.getSessionSubscribers('session-789');
      expect(subscribers).toContain('client-123');
    });

    /**
     * Test: Client can subscribe to multiple sessions
     */
    it('should allow client to subscribe to multiple sessions', () => {
      // Act
      wsService.subscribeToSession('client-123', 'session-1');
      wsService.subscribeToSession('client-123', 'session-2');

      // Assert
      expect(wsService.getSessionSubscribers('session-1')).toContain('client-123');
      expect(wsService.getSessionSubscribers('session-2')).toContain('client-123');
    });

    /**
     * Test: Multiple clients can subscribe to same session
     */
    it('should allow multiple clients to subscribe to same session', () => {
      // Arrange
      const mockWs2 = new MockWebSocket();
      wsService.registerClient('client-2', mockWs2 as any, 'user-2');

      // Act
      wsService.subscribeToSession('client-123', 'session-789');
      wsService.subscribeToSession('client-2', 'session-789');

      // Assert
      const subscribers = wsService.getSessionSubscribers('session-789');
      expect(subscribers).toHaveLength(2);
    });
  });

  describe('unsubscribeFromSession', () => {
    /**
     * Test: Successful session unsubscription
     */
    it('should unsubscribe client from session', () => {
      // Arrange
      wsService.subscribeToSession('client-123', 'session-789');

      // Act
      wsService.unsubscribeFromSession('client-123', 'session-789');

      // Assert
      const subscribers = wsService.getSessionSubscribers('session-789');
      expect(subscribers).toHaveLength(0);
    });
  });
});

describe('WebSocketService - Message Broadcasting', () => {
  let wsService: WebSocketService;
  let mockWs1: MockWebSocket;
  let mockWs2: MockWebSocket;

  beforeEach(() => {
    wsService = new WebSocketService();
    mockWs1 = new MockWebSocket();
    mockWs2 = new MockWebSocket();
    wsService.registerClient('client-1', mockWs1 as any, 'user-1');
    wsService.registerClient('client-2', mockWs2 as any, 'user-2');
  });

  describe('broadcastLog', () => {
    /**
     * Test: Broadcasts log to environment subscribers
     */
    it('should broadcast log message to environment subscribers', () => {
      // Arrange
      wsService.subscribeToEnvironment('client-1', 'env-123');
      wsService.subscribeToEnvironment('client-2', 'env-123');

      const logPayload: LogMessagePayload = {
        environmentId: 'env-123',
        stream: LogStream.stdout,
        message: 'Application started',
        timestamp: new Date(),
      };

      // Act
      wsService.broadcastLog(logPayload);

      // Assert
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(1);

      const message1 = JSON.parse(mockWs1.sentMessages[0]!);
      expect(message1.type).toBe(MessageType.LOG);
      expect(message1.payload.environmentId).toBe('env-123');
      expect(message1.payload.message).toBe('Application started');
      expect(message1.timestamp).toBeDefined();
    });

    /**
     * Test: Doesn't broadcast to non-subscribers
     */
    it('should not broadcast to clients not subscribed to environment', () => {
      // Arrange
      wsService.subscribeToEnvironment('client-1', 'env-123');
      // client-2 is not subscribed

      const logPayload: LogMessagePayload = {
        environmentId: 'env-123',
        stream: LogStream.stdout,
        message: 'Application started',
        timestamp: new Date(),
      };

      // Act
      wsService.broadcastLog(logPayload);

      // Assert
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(0);
    });

    /**
     * Test: Handles broadcasting to environment with no subscribers
     */
    it('should handle broadcasting to environment with no subscribers', () => {
      // Arrange
      const logPayload: LogMessagePayload = {
        environmentId: 'env-no-subscribers',
        stream: LogStream.stdout,
        message: 'Test',
        timestamp: new Date(),
      };

      // Act & Assert
      expect(() => wsService.broadcastLog(logPayload)).not.toThrow();
      expect(mockWs1.sentMessages).toHaveLength(0);
      expect(mockWs2.sentMessages).toHaveLength(0);
    });
  });

  describe('broadcastEnvironmentStatus', () => {
    /**
     * Test: Broadcasts environment status to subscribers
     */
    it('should broadcast environment status to subscribers', () => {
      // Arrange
      wsService.subscribeToEnvironment('client-1', 'env-123');

      const statusPayload: EnvironmentStatusPayload = {
        environmentId: 'env-123',
        status: 'running',
        message: 'Environment started successfully',
      };

      // Act
      wsService.broadcastEnvironmentStatus(statusPayload);

      // Assert
      expect(mockWs1.sentMessages).toHaveLength(1);

      const message = JSON.parse(mockWs1.sentMessages[0]!);
      expect(message.type).toBe(MessageType.ENV_STATUS);
      expect(message.payload.environmentId).toBe('env-123');
      expect(message.payload.status).toBe('running');
      expect(message.payload.message).toBe('Environment started successfully');
    });
  });

  describe('sendTerminalOutput', () => {
    /**
     * Test: Sends terminal output to session subscribers
     */
    it('should send terminal output to session subscribers', () => {
      // Arrange
      wsService.subscribeToSession('client-1', 'session-789');

      const outputPayload: TerminalOutputPayload = {
        sessionId: 'session-789',
        data: 'user@host:~$ ls\n',
      };

      // Act
      wsService.sendTerminalOutput(outputPayload);

      // Assert
      expect(mockWs1.sentMessages).toHaveLength(1);

      const message = JSON.parse(mockWs1.sentMessages[0]!);
      expect(message.type).toBe(MessageType.TERMINAL_OUTPUT);
      expect(message.payload.sessionId).toBe('session-789');
      expect(message.payload.data).toBe('user@host:~$ ls\n');
    });
  });

  describe('sendToClient', () => {
    /**
     * Test: Sends message to specific client
     */
    it('should send message to specific client', () => {
      // Arrange
      const message = { type: 'test', data: 'Hello' };

      // Act
      wsService.sendToClient('client-1', message);

      // Assert
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(0);

      const received = JSON.parse(mockWs1.sentMessages[0]!);
      expect(received.type).toBe('test');
      expect(received.data).toBe('Hello');
    });

    /**
     * Test: Accepts string messages
     */
    it('should accept string messages', () => {
      // Arrange
      const message = '{"type":"test","data":"Hello"}';

      // Act
      wsService.sendToClient('client-1', message);

      // Assert
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs1.sentMessages[0]).toBe(message);
    });

    /**
     * Test: Updates last activity timestamp
     */
    it('should update last activity timestamp when sending', () => {
      // Arrange
      vi.useFakeTimers();
      const client = wsService.getActiveClients()[0]!;
      const initialActivity = client.lastActivity;

      vi.advanceTimersByTime(100);

      // Act
      wsService.sendToClient('client-1', { type: 'test' });

      // Assert
      expect(client.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());

      vi.useRealTimers();
    });

    /**
     * Test: Only sends to clients with OPEN connection
     */
    it('should only send to clients with OPEN connection', () => {
      // Arrange
      mockWs1.readyState = WebSocket.CLOSED;

      // Act
      wsService.sendToClient('client-1', { type: 'test' });

      // Assert
      expect(mockWs1.sentMessages).toHaveLength(0);
    });

    /**
     * Test: Handles sending to non-existent client
     */
    it('should handle sending to non-existent client gracefully', () => {
      // Act & Assert
      expect(() => wsService.sendToClient('non-existent', { type: 'test' })).not.toThrow();
    });
  });

  describe('sendError', () => {
    /**
     * Test: Sends error message to client
     */
    it('should send error message to client', () => {
      // Act
      wsService.sendError('client-1', 'Environment not found');

      // Assert
      expect(mockWs1.sentMessages).toHaveLength(1);

      const message = JSON.parse(mockWs1.sentMessages[0]!);
      expect(message.type).toBe(MessageType.ERROR);
      expect(message.payload.error).toBe('Environment not found');
      expect(message.timestamp).toBeDefined();
    });
  });
});

describe('WebSocketService - Connection Health', () => {
  let wsService: WebSocketService;
  let mockWs1: MockWebSocket;
  let mockWs2: MockWebSocket;

  beforeEach(() => {
    wsService = new WebSocketService();
    mockWs1 = new MockWebSocket();
    mockWs2 = new MockWebSocket();
    wsService.registerClient('client-1', mockWs1 as any, 'user-1');
    wsService.registerClient('client-2', mockWs2 as any, 'user-2');
  });

  describe('pingAll', () => {
    /**
     * Test: Pings all connected clients
     */
    it('should ping all connected clients', () => {
      // Arrange
      const pingSpy1 = vi.spyOn(mockWs1, 'ping');
      const pingSpy2 = vi.spyOn(mockWs2, 'ping');

      // Act
      wsService.pingAll();

      // Assert
      expect(pingSpy1).toHaveBeenCalled();
      expect(pingSpy2).toHaveBeenCalled();
    });

    /**
     * Test: Removes disconnected clients during ping
     */
    it('should remove disconnected clients during ping', () => {
      // Arrange
      mockWs1.readyState = WebSocket.CLOSED;

      // Act
      wsService.pingAll();

      // Assert
      const activeClients = wsService.getActiveClients();
      expect(activeClients).toHaveLength(1);
      expect(activeClients[0]!.id).toBe('client-2');
    });
  });
});

describe('WebSocketService - Statistics and Utilities', () => {
  let wsService: WebSocketService;

  beforeEach(() => {
    wsService = new WebSocketService();
  });

  describe('getStats', () => {
    /**
     * Test: Returns accurate connection statistics
     */
    it('should return accurate connection statistics', () => {
      // Arrange
      const mockWs1 = new MockWebSocket();
      const mockWs2 = new MockWebSocket();
      const mockWs3 = new MockWebSocket();

      wsService.registerClient('client-1', mockWs1 as any, 'user-1');
      wsService.registerClient('client-2', mockWs2 as any, 'user-2');
      wsService.registerClient('client-3', mockWs3 as any, 'user-3');

      wsService.subscribeToEnvironment('client-1', 'env-1');
      wsService.subscribeToEnvironment('client-2', 'env-1');
      wsService.subscribeToEnvironment('client-3', 'env-2');

      wsService.subscribeToSession('client-1', 'session-1');
      wsService.subscribeToSession('client-2', 'session-2');

      // Act
      const stats = wsService.getStats();

      // Assert
      expect(stats.totalClients).toBe(3);
      expect(stats.subscribedEnvironments).toBe(2);
      expect(stats.subscribedSessions).toBe(2);
    });
  });

  describe('closeAll', () => {
    /**
     * Test: Closes all connections
     */
    it('should close all WebSocket connections', () => {
      // Arrange
      const mockWs1 = new MockWebSocket();
      const mockWs2 = new MockWebSocket();

      wsService.registerClient('client-1', mockWs1 as any, 'user-1');
      wsService.registerClient('client-2', mockWs2 as any, 'user-2');

      const closeSpy1 = vi.spyOn(mockWs1, 'close');
      const closeSpy2 = vi.spyOn(mockWs2, 'close');

      // Act
      wsService.closeAll();

      // Assert
      expect(closeSpy1).toHaveBeenCalledWith(1000, 'Server shutting down');
      expect(closeSpy2).toHaveBeenCalledWith(1000, 'Server shutting down');
      expect(wsService.getActiveClients()).toHaveLength(0);
    });

    /**
     * Test: Removes all subscriptions when closing
     */
    it('should remove all subscriptions when closing', () => {
      // Arrange
      const mockWs1 = new MockWebSocket();
      wsService.registerClient('client-1', mockWs1 as any, 'user-1');
      wsService.subscribeToEnvironment('client-1', 'env-1');
      wsService.subscribeToSession('client-1', 'session-1');

      // Act
      wsService.closeAll();

      // Assert
      expect(wsService.getEnvironmentSubscribers('env-1')).toHaveLength(0);
      expect(wsService.getSessionSubscribers('session-1')).toHaveLength(0);
      expect(wsService.getStats().totalClients).toBe(0);
    });
  });
});

describe('WebSocketService - Error Handling', () => {
  let wsService: WebSocketService;

  beforeEach(() => {
    wsService = new WebSocketService();
  });

  /**
   * Test: Gracefully handles errors during message broadcasting
   */
  it('should handle errors during broadcast gracefully', () => {
    // Arrange
    const mockWs = new MockWebSocket();
    mockWs.send = vi.fn().mockImplementation(() => {
      throw new Error('Send failed');
    });

    wsService.registerClient('client-1', mockWs as any, 'user-1');
    wsService.subscribeToEnvironment('client-1', 'env-123');

    const logPayload: LogMessagePayload = {
      environmentId: 'env-123',
      stream: LogStream.stdout,
      message: 'Test',
      timestamp: new Date(),
    };

    // Act & Assert
    expect(() => wsService.broadcastLog(logPayload)).toThrow('Send failed');
  });
});
