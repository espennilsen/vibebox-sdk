/**
 * WebSocketService - Real-time Communication Service
 * Handles WebSocket connections, log streaming, terminal sessions, and status updates
 * Tasks: T076, T065-T066
 *
 * @example Client-side connection
 * ```javascript
 * const token = localStorage.getItem('accessToken');
 * const ws = new WebSocket(`ws://localhost:3000/api/v1/ws/logs?token=${token}`);
 *
 * ws.onopen = () => {
 *   ws.send(JSON.stringify({
 *     type: 'log_subscribe',
 *     payload: { environmentId: 'env-123', stream: 'stdout' }
 *   }));
 * };
 *
 * ws.onmessage = (event) => {
 *   const message = JSON.parse(event.data);
 *   if (message.type === 'log') {
 *     console.log(message.payload.message);
 *   }
 * };
 * ```
 *
 * @example Error handling
 * ```javascript
 * ws.onerror = (error) => {
 *   console.error('WebSocket error:', error);
 * };
 *
 * ws.onclose = (event) => {
 *   console.log('Connection closed:', event.code, event.reason);
 *   if (event.code !== 1000) {
 *     // Implement reconnection logic
 *     setTimeout(() => reconnect(), 5000);
 *   }
 * };
 * ```
 *
 * @example React Hook integration
 * ```typescript
 * function useWebSocket(url: string, token: string) {
 *   const [isConnected, setIsConnected] = useState(false);
 *   const wsRef = useRef<WebSocket | null>(null);
 *
 *   useEffect(() => {
 *     const ws = new WebSocket(`${url}?token=${token}`);
 *     wsRef.current = ws;
 *
 *     ws.onopen = () => setIsConnected(true);
 *     ws.onclose = () => setIsConnected(false);
 *
 *     return () => ws.close();
 *   }, [url, token]);
 *
 *   return { isConnected, ws: wsRef.current };
 * }
 * ```
 */
import { WebSocket } from 'ws';
import { LogStream } from '@/types/prisma-enums';

/**
 * WebSocket message types
 *
 * @example Client subscribing to logs
 * ```javascript
 * ws.send(JSON.stringify({
 *   type: 'log_subscribe',
 *   payload: { environmentId: 'env-123', stream: 'all' }
 * }));
 * ```
 *
 * @example Terminal input
 * ```javascript
 * ws.send(JSON.stringify({
 *   type: 'terminal_input',
 *   payload: { sessionId: 'session-456', data: 'ls -la\n' }
 * }));
 * ```
 */
export enum MessageType {
  // Log streaming
  LOG = 'log',
  LOG_SUBSCRIBE = 'log_subscribe',
  LOG_UNSUBSCRIBE = 'log_unsubscribe',

  // Terminal
  TERMINAL_INPUT = 'terminal_input',
  TERMINAL_OUTPUT = 'terminal_output',
  TERMINAL_RESIZE = 'terminal_resize',

  // Environment status
  ENV_STATUS = 'env_status',
  ENV_SUBSCRIBE = 'env_subscribe',
  ENV_UNSUBSCRIBE = 'env_unsubscribe',

  // Connection
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error',
}

/**
 * WebSocket message structure
 *
 * All messages follow this consistent format for both client and server communication.
 *
 * @example Receiving a log message
 * ```javascript
 * ws.onmessage = (event) => {
 *   const message = JSON.parse(event.data);
 *   console.log('Type:', message.type);
 *   console.log('Data:', message.payload);
 *   console.log('Timestamp:', new Date(message.timestamp));
 * };
 * ```
 */
export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp?: number;
}

/**
 * Log message payload
 *
 * @example Client receiving log message
 * ```javascript
 * ws.onmessage = (event) => {
 *   const msg = JSON.parse(event.data);
 *   if (msg.type === 'log') {
 *     const { environmentId, stream, message, timestamp } = msg.payload;
 *     console.log(`[${stream}] ${message}`);
 *   }
 * };
 * ```
 */
export interface LogMessagePayload {
  environmentId: string;
  stream: LogStream;
  message: string;
  timestamp: Date;
}

/**
 * Terminal input payload
 *
 * @example Sending terminal input
 * ```javascript
 * const input = 'npm start\n';
 * ws.send(JSON.stringify({
 *   type: 'terminal_input',
 *   payload: { sessionId: 'session-123', data: input }
 * }));
 * ```
 */
export interface TerminalInputPayload {
  sessionId: string;
  data: string;
}

/**
 * Terminal output payload
 *
 * @example Receiving terminal output with xterm.js
 * ```javascript
 * import { Terminal } from 'xterm';
 * const term = new Terminal();
 *
 * ws.onmessage = (event) => {
 *   const msg = JSON.parse(event.data);
 *   if (msg.type === 'terminal_output') {
 *     term.write(msg.payload.data);
 *   }
 * };
 * ```
 */
export interface TerminalOutputPayload {
  sessionId: string;
  data: string;
}

/**
 * Terminal resize payload
 *
 * @example Resizing terminal with xterm.js
 * ```javascript
 * term.onResize(({ rows, cols }) => {
 *   ws.send(JSON.stringify({
 *     type: 'terminal_resize',
 *     payload: { sessionId: 'session-123', rows, cols }
 *   }));
 * });
 * ```
 */
export interface TerminalResizePayload {
  sessionId: string;
  rows: number;
  cols: number;
}

/**
 * Environment status payload
 *
 * @example Monitoring environment status
 * ```javascript
 * ws.onmessage = (event) => {
 *   const msg = JSON.parse(event.data);
 *   if (msg.type === 'env_status') {
 *     const { status, message } = msg.payload;
 *     console.log(`Environment is ${status}: ${message}`);
 *   }
 * };
 * ```
 */
export interface EnvironmentStatusPayload {
  environmentId: string;
  status: string;
  message?: string;
}

/**
 * Client connection information
 */
export interface ClientConnection {
  id: string;
  ws: WebSocket;
  userId: string;
  subscribedEnvironments: Set<string>;
  subscribedSessions: Set<string>;
  lastActivity: Date;
}

/**
 * WebSocketService - Manages real-time WebSocket communications
 *
 * Provides methods for broadcasting messages, managing client connections,
 * streaming logs, and handling terminal sessions.
 *
 * @example Basic server-side usage
 * ```typescript
 * const wsService = new WebSocketService();
 *
 * // Register client
 * const clientId = crypto.randomUUID();
 * wsService.registerClient(clientId, websocket, userId);
 *
 * // Subscribe to environment
 * wsService.subscribeToEnvironment(clientId, environmentId);
 *
 * // Broadcast log
 * wsService.broadcastLog({
 *   environmentId,
 *   stream: LogStream.stdout,
 *   message: 'Application started',
 *   timestamp: new Date()
 * });
 * ```
 *
 * @example Keep-alive ping
 * ```typescript
 * const wsService = new WebSocketService();
 *
 * // Ping all clients every 30 seconds
 * setInterval(() => {
 *   wsService.pingAll();
 * }, 30000);
 * ```
 *
 * @example Cleanup on shutdown
 * ```typescript
 * process.on('SIGTERM', () => {
 *   wsService.closeAll();
 *   process.exit(0);
 * });
 * ```
 */
export class WebSocketService {
  private clients: Map<string, ClientConnection> = new Map();
  private environmentSubscriptions: Map<string, Set<string>> = new Map(); // environmentId -> clientIds
  private sessionSubscriptions: Map<string, Set<string>> = new Map(); // sessionId -> clientIds

  /**
   * Creates a new WebSocketService instance
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * ```
   */
  constructor() {}

  /**
   * Register a new WebSocket client connection
   *
   * Adds client to connection pool and sets up message handlers
   *
   * @param clientId - Unique client identifier
   * @param ws - WebSocket instance
   * @param userId - User ID of connected client
   * @returns Client connection object
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.registerClient('client-123', websocket, 'user-456');
   * ```
   */
  registerClient(clientId: string, ws: WebSocket, userId: string): ClientConnection {
    const client: ClientConnection = {
      id: clientId,
      ws,
      userId,
      subscribedEnvironments: new Set(),
      subscribedSessions: new Set(),
      lastActivity: new Date(),
    };

    this.clients.set(clientId, client);

    // Set up ping/pong for connection health
    ws.on('pong', () => {
      client.lastActivity = new Date();
    });

    // eslint-disable-next-line no-console
    console.log(`WebSocket client registered: ${clientId} (user: ${userId})`);

    return client;
  }

  /**
   * Unregister WebSocket client connection
   *
   * Removes client from all subscriptions and connection pool
   *
   * @param clientId - Client identifier
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.unregisterClient('client-123');
   * ```
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);

    if (!client) {
      return;
    }

    // Remove from environment subscriptions
    for (const envId of client.subscribedEnvironments) {
      this.unsubscribeFromEnvironment(clientId, envId);
    }

    // Remove from session subscriptions
    for (const sessionId of client.subscribedSessions) {
      this.unsubscribeFromSession(clientId, sessionId);
    }

    // Remove from clients
    this.clients.delete(clientId);

    // eslint-disable-next-line no-console
    console.log(`WebSocket client unregistered: ${clientId}`);
  }

  /**
   * Subscribe client to environment updates
   *
   * Client will receive log streams and status updates for environment
   *
   * @param clientId - Client identifier
   * @param environmentId - Environment ID to subscribe to
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.subscribeToEnvironment('client-123', 'env-456');
   * ```
   */
  subscribeToEnvironment(clientId: string, environmentId: string): void {
    const client = this.clients.get(clientId);

    if (!client) {
      console.warn(`Cannot subscribe: client ${clientId} not found`);
      return;
    }

    // Add to client's subscriptions
    client.subscribedEnvironments.add(environmentId);

    // Add to environment's subscribers
    if (!this.environmentSubscriptions.has(environmentId)) {
      this.environmentSubscriptions.set(environmentId, new Set());
    }
    this.environmentSubscriptions.get(environmentId)!.add(clientId);

    // eslint-disable-next-line no-console
    console.log(`Client ${clientId} subscribed to environment ${environmentId}`);
  }

  /**
   * Unsubscribe client from environment updates
   *
   * @param clientId - Client identifier
   * @param environmentId - Environment ID to unsubscribe from
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.unsubscribeFromEnvironment('client-123', 'env-456');
   * ```
   */
  unsubscribeFromEnvironment(clientId: string, environmentId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      client.subscribedEnvironments.delete(environmentId);
    }

    const subscribers = this.environmentSubscriptions.get(environmentId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.environmentSubscriptions.delete(environmentId);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`Client ${clientId} unsubscribed from environment ${environmentId}`);
  }

  /**
   * Subscribe client to terminal session
   *
   * Client will receive terminal output for session
   *
   * @param clientId - Client identifier
   * @param sessionId - Session ID to subscribe to
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.subscribeToSession('client-123', 'session-789');
   * ```
   */
  subscribeToSession(clientId: string, sessionId: string): void {
    const client = this.clients.get(clientId);

    if (!client) {
      console.warn(`Cannot subscribe: client ${clientId} not found`);
      return;
    }

    // Add to client's subscriptions
    client.subscribedSessions.add(sessionId);

    // Add to session's subscribers
    if (!this.sessionSubscriptions.has(sessionId)) {
      this.sessionSubscriptions.set(sessionId, new Set());
    }
    this.sessionSubscriptions.get(sessionId)!.add(clientId);

    // eslint-disable-next-line no-console
    console.log(`Client ${clientId} subscribed to session ${sessionId}`);
  }

  /**
   * Unsubscribe client from terminal session
   *
   * @param clientId - Client identifier
   * @param sessionId - Session ID to unsubscribe from
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.unsubscribeFromSession('client-123', 'session-789');
   * ```
   */
  unsubscribeFromSession(clientId: string, sessionId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      client.subscribedSessions.delete(sessionId);
    }

    const subscribers = this.sessionSubscriptions.get(sessionId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.sessionSubscriptions.delete(sessionId);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`Client ${clientId} unsubscribed from session ${sessionId}`);
  }

  /**
   * Broadcast log message to environment subscribers
   *
   * Sends log entry to all clients subscribed to environment
   *
   * @param payload - Log message payload
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.broadcastLog({
   *   environmentId: 'env-123',
   *   stream: LogStream.stdout,
   *   message: 'Application started',
   *   timestamp: new Date()
   * });
   * ```
   */
  broadcastLog(payload: LogMessagePayload): void {
    const subscribers = this.environmentSubscriptions.get(payload.environmentId);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message: WebSocketMessage = {
      type: MessageType.LOG,
      payload,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);

    for (const clientId of subscribers) {
      this.sendToClient(clientId, messageStr);
    }
  }

  /**
   * Broadcast environment status update to subscribers
   *
   * Sends status change to all clients subscribed to environment
   *
   * @param payload - Environment status payload
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.broadcastEnvironmentStatus({
   *   environmentId: 'env-123',
   *   status: 'running',
   *   message: 'Environment started successfully'
   * });
   * ```
   */
  broadcastEnvironmentStatus(payload: EnvironmentStatusPayload): void {
    const subscribers = this.environmentSubscriptions.get(payload.environmentId);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message: WebSocketMessage = {
      type: MessageType.ENV_STATUS,
      payload,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);

    for (const clientId of subscribers) {
      this.sendToClient(clientId, messageStr);
    }
  }

  /**
   * Send terminal output to session subscribers
   *
   * Sends terminal data to all clients subscribed to session
   *
   * @param payload - Terminal output payload
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.sendTerminalOutput({
   *   sessionId: 'session-789',
   *   data: 'user@host:~$ ls\n'
   * });
   * ```
   */
  sendTerminalOutput(payload: TerminalOutputPayload): void {
    const subscribers = this.sessionSubscriptions.get(payload.sessionId);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message: WebSocketMessage = {
      type: MessageType.TERMINAL_OUTPUT,
      payload,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);

    for (const clientId of subscribers) {
      this.sendToClient(clientId, messageStr);
    }
  }

  /**
   * Send message to specific client
   *
   * @param clientId - Client identifier
   * @param message - Message to send (string or object)
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.sendToClient('client-123', JSON.stringify({ type: 'ping' }));
   * ```
   */
  sendToClient(clientId: string, message: string | object): void {
    const client = this.clients.get(clientId);

    if (!client) {
      return;
    }

    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
      client.lastActivity = new Date();
    }
  }

  /**
   * Send error message to client
   *
   * @param clientId - Client identifier
   * @param error - Error message
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.sendError('client-123', 'Environment not found');
   * ```
   */
  sendError(clientId: string, error: string): void {
    const message: WebSocketMessage = {
      type: MessageType.ERROR,
      payload: { error },
      timestamp: Date.now(),
    };

    this.sendToClient(clientId, message);
  }

  /**
   * Ping all clients to check connection health
   *
   * Sends ping to all connected clients
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * // Run periodically to keep connections alive
   * setInterval(() => wsService.pingAll(), 30000);
   * ```
   */
  pingAll(): void {
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      } else {
        // Remove disconnected clients
        this.unregisterClient(clientId);
      }
    }
  }

  /**
   * Get all active clients
   *
   * This is equivalent to getConnectedClients() - both methods return
   * the same result. Use whichever naming convention fits your use case.
   *
   * @returns Array of client connections
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * const clients = wsService.getActiveClients();
   * console.log(`Active connections: ${clients.length}`);
   * ```
   *
   * @see getConnectedClients
   */
  getActiveClients(): ClientConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get clients subscribed to environment
   *
   * @param environmentId - Environment ID
   * @returns Array of client IDs
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * const subscribers = wsService.getEnvironmentSubscribers('env-123');
   * ```
   */
  getEnvironmentSubscribers(environmentId: string): string[] {
    const subscribers = this.environmentSubscriptions.get(environmentId);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Get clients subscribed to session
   *
   * @param sessionId - Session ID
   * @returns Array of client IDs
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * const subscribers = wsService.getSessionSubscribers('session-789');
   * ```
   */
  getSessionSubscribers(sessionId: string): string[] {
    const subscribers = this.sessionSubscriptions.get(sessionId);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Get connection statistics
   *
   * @returns Connection stats
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * const stats = wsService.getStats();
   * console.log(`Total clients: ${stats.totalClients}`);
   * console.log(`Subscribed environments: ${stats.subscribedEnvironments}`);
   * ```
   */
  getStats(): {
    totalClients: number;
    subscribedEnvironments: number;
    subscribedSessions: number;
  } {
    return {
      totalClients: this.clients.size,
      subscribedEnvironments: this.environmentSubscriptions.size,
      subscribedSessions: this.sessionSubscriptions.size,
    };
  }

  /**
   * Close all connections
   *
   * Gracefully closes all WebSocket connections
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * // On server shutdown
   * wsService.closeAll();
   * ```
   */
  closeAll(): void {
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1000, 'Server shutting down');
      }
      this.unregisterClient(clientId);
    }

    // eslint-disable-next-line no-console
    console.log('All WebSocket connections closed');
  }

  /**
   * Get a specific client by ID
   *
   * @param clientId - Client ID
   * @returns Client connection or undefined
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * const client = wsService.getClient('client-123');
   * ```
   */
  getClient(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all connected clients
   *
   * This is equivalent to getActiveClients() - both methods return
   * the same result. Use whichever naming convention fits your use case.
   *
   * @returns Array of client connections
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * const clients = wsService.getConnectedClients();
   * ```
   *
   * @see getActiveClients
   */
  getConnectedClients(): ClientConnection[] {
    return this.getActiveClients();
  }

  /**
   * Get clients by user ID
   *
   * @param userId - User ID
   * @returns Array of client connections for the user
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * const clients = wsService.getClientsByUserId('user-123');
   * ```
   */
  getClientsByUserId(userId: string): ClientConnection[] {
    return Array.from(this.clients.values()).filter((client) => client.userId === userId);
  }

  /**
   * Broadcast message to all clients subscribed to an environment
   *
   * @param environmentId - Environment ID
   * @param message - Message to broadcast
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * wsService.broadcastToEnvironment('env-123', {
   *   type: MessageType.ENV_STATUS,
   *   payload: { status: 'running' }
   * });
   * ```
   */
  broadcastToEnvironment(environmentId: string, message: WebSocketMessage): void {
    const subscribers = this.getEnvironmentSubscribers(environmentId);

    for (const clientId of subscribers) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * Heartbeat - ping all connected clients to keep connections alive
   *
   * This is the domain-appropriate name for WebSocket keep-alive functionality.
   * Internally delegates to pingAll(). Use heartbeat() in application code for
   * better semantic clarity.
   *
   * @example
   * ```typescript
   * const wsService = new WebSocketService();
   * // Run heartbeat every 30 seconds to keep connections alive
   * setInterval(() => wsService.heartbeat(), 30000);
   * ```
   *
   * @see pingAll
   */
  heartbeat(): void {
    this.pingAll();
  }
}
