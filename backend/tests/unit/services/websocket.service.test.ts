/**
 * Unit Tests: WebSocketService - Real-time Communication
 * Tests WebSocket connections, log streaming, and message handling
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService, MessageType } from '@/services/websocket.service';
import { LogStream } from '@prisma/client';

// Mock WebSocket with proper OPEN constant
const mockWebSocket = {
  send: vi.fn(),
  on: vi.fn(),
  ping: vi.fn(),
  close: vi.fn(),
  readyState: 1, // OPEN
};

vi.mock('ws', () => ({
  WebSocket: Object.assign(vi.fn(() => mockWebSocket), {
    OPEN: 1,
    CONNECTING: 0,
    CLOSING: 2,
    CLOSED: 3,
  }),
}));

describe('WebSocketService', () => {
  let wsService: WebSocketService;

  beforeEach(() => {
    wsService = new WebSocketService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerClient', () => {
    it('should register new client connection', () => {
      // Act
      const client = wsService.registerClient('client-123', mockWebSocket as any, 'user-456');

      // Assert
      expect(client.id).toBe('client-123');
      expect(client.userId).toBe('user-456');
      expect(client.subscribedEnvironments.size).toBe(0);
    });
  });

  describe('unregisterClient', () => {
    it('should remove client and cleanup subscriptions', () => {
      // Arrange
      wsService.registerClient('client-123', mockWebSocket as any, 'user-456');
      wsService.subscribeToEnvironment('client-123', 'env-123');

      // Act
      wsService.unregisterClient('client-123');

      // Assert
      const client = wsService.getClient('client-123');
      expect(client).toBeUndefined();
    });
  });

  describe('subscribeToEnvironment', () => {
    it('should subscribe client to environment logs', () => {
      // Arrange
      wsService.registerClient('client-123', mockWebSocket as any, 'user-456');

      // Act
      wsService.subscribeToEnvironment('client-123', 'env-123');

      // Assert
      const client = wsService.getClient('client-123');
      expect(client?.subscribedEnvironments.has('env-123')).toBe(true);
    });
  });

  describe('unsubscribeFromEnvironment', () => {
    it('should unsubscribe client from environment', () => {
      // Arrange
      wsService.registerClient('client-123', mockWebSocket as any, 'user-456');
      wsService.subscribeToEnvironment('client-123', 'env-123');

      // Act
      wsService.unsubscribeFromEnvironment('client-123', 'env-123');

      // Assert
      const client = wsService.getClient('client-123');
      expect(client?.subscribedEnvironments.has('env-123')).toBe(false);
    });
  });

  describe('broadcastLog', () => {
    it('should send log to subscribed clients', () => {
      // Arrange
      wsService.registerClient('client-123', mockWebSocket as any, 'user-456');
      wsService.subscribeToEnvironment('client-123', 'env-123');

      // Act
      wsService.broadcastLog({
        environmentId: 'env-123',
        stream: LogStream.stdout,
        message: 'Test log message',
        timestamp: new Date(),
      });

      // Assert
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should not send to unsubscribed clients', () => {
      // Arrange
      wsService.registerClient('client-123', mockWebSocket as any, 'user-456');

      // Act
      wsService.broadcastLog({
        environmentId: 'env-123',
        stream: LogStream.stdout,
        message: 'Test log message',
        timestamp: new Date(),
      });

      // Assert
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('sendToClient', () => {
    it('should send message to specific client', () => {
      // Arrange
      wsService.registerClient('client-123', mockWebSocket as any, 'user-456');

      // Act
      wsService.sendToClient('client-123', {
        type: MessageType.PING,
        payload: {},
      });

      // Assert
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should handle sending to non-existent client', () => {
      // Act & Assert
      expect(() => {
        wsService.sendToClient('non-existent', {
          type: MessageType.PING,
          payload: {},
        });
      }).not.toThrow();
    });
  });

  describe('broadcastToEnvironment', () => {
    it('should broadcast message to all clients subscribed to environment', () => {
      // Arrange
      const ws1 = { ...mockWebSocket, send: vi.fn(), readyState: 1 };
      const ws2 = { ...mockWebSocket, send: vi.fn(), readyState: 1 };
      wsService.registerClient('client-1', ws1 as any, 'user-1');
      wsService.registerClient('client-2', ws2 as any, 'user-2');
      wsService.subscribeToEnvironment('client-1', 'env-123');
      wsService.subscribeToEnvironment('client-2', 'env-123');

      // Act
      wsService.broadcastToEnvironment('env-123', {
        type: MessageType.ENV_STATUS,
        payload: { status: 'running' },
      });

      // Assert
      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).toHaveBeenCalled();
    });
  });

  describe('getConnectedClients', () => {
    it('should return all connected clients', () => {
      // Arrange
      wsService.registerClient('client-1', mockWebSocket as any, 'user-1');
      wsService.registerClient('client-2', mockWebSocket as any, 'user-2');

      // Act
      const clients = wsService.getConnectedClients();

      // Assert
      expect(clients).toHaveLength(2);
    });
  });

  describe('getClientsByUserId', () => {
    it('should return clients for specific user', () => {
      // Arrange
      wsService.registerClient('client-1', mockWebSocket as any, 'user-123');
      wsService.registerClient('client-2', mockWebSocket as any, 'user-123');
      wsService.registerClient('client-3', mockWebSocket as any, 'user-456');

      // Act
      const clients = wsService.getClientsByUserId('user-123');

      // Assert
      expect(clients).toHaveLength(2);
    });
  });

  describe('heartbeat', () => {
    it('should ping all connected clients', () => {
      // Arrange
      const ws1 = { ...mockWebSocket, ping: vi.fn(), readyState: 1 };
      const ws2 = { ...mockWebSocket, ping: vi.fn(), readyState: 1 };
      wsService.registerClient('client-1', ws1 as any, 'user-1');
      wsService.registerClient('client-2', ws2 as any, 'user-2');

      // Act
      wsService.heartbeat();

      // Assert
      expect(ws1.ping).toHaveBeenCalled();
      expect(ws2.ping).toHaveBeenCalled();
    });
  });
});
