/**
 * WebSocket Streaming Performance Test
 *
 * Tests WebSocket connections for real-time log streaming and terminal access.
 * Validates connection stability, message throughput, and latency.
 *
 * Performance Goals:
 * - Stable WebSocket connections under load
 * - Handle 1,000+ messages/second per connection
 * - <100ms message latency
 * - Support 100+ concurrent WebSocket connections
 *
 * Scenarios:
 * - smoke: Single WebSocket connection
 * - load: 50 concurrent connections
 * - stress: 100+ concurrent connections
 *
 * Run:
 *   k6 run --env SCENARIO=smoke tests/performance/scenarios/websocket-streaming.test.js
 *   k6 run --env SCENARIO=load tests/performance/scenarios/websocket-streaming.test.js
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import ws from 'k6/ws';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomIntBetween, randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import testConfig from '../k6.config.js';

// Custom metrics
const wsConnectionTime = new Trend('ws_connection_time');
const wsMessageLatency = new Trend('ws_message_latency');
const wsMessageRate = new Trend('ws_message_rate');
const wsConnectionSuccessRate = new Rate('ws_connection_success_rate');
const wsMessageReceived = new Counter('ws_messages_received');
const wsMessageSent = new Counter('ws_messages_sent');
const wsErrors = new Counter('ws_errors');
const wsPingLatency = new Trend('ws_ping_latency');
const activeConnections = new Gauge('active_ws_connections');

// Test configuration
const scenario = __ENV.SCENARIO || 'smoke';

// WebSocket-specific scenarios
const customScenarios = {
  smoke: {
    executor: 'shared-iterations',
    vus: 1,
    iterations: 1,
    maxDuration: '3m',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '3m', target: 25 },
      { duration: '5m', target: 50 },
      { duration: '5m', target: 50 },  // Sustain
      { duration: '2m', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
  },
  soak: {
    executor: 'constant-vus',
    vus: 25,
    duration: '30m', // 30 minutes sustained WebSocket connections
  },
};

export const options = {
  scenarios: {
    [scenario]: customScenarios[scenario] || testConfig.scenarios[scenario],
  },
  thresholds: {
    // WebSocket-specific thresholds
    'ws_connection_time': ['p(95)<1000', 'p(99)<2000'],
    'ws_message_latency': ['p(95)<100', 'p(99)<200'], // <100ms p95
    'ws_connection_success_rate': ['rate>0.95'],
    'ws_ping_latency': ['p(95)<50', 'p(99)<100'],
    'ws_errors': ['count<50'],
    'ws_messages_received': ['count>0'],
  },
};

/**
 * Setup function - create test users and environments
 */
export function setup() {
  const baseURL = testConfig.config.baseURL;
  const apiVersion = testConfig.config.apiVersion;
  const testUserCount = Math.min(testConfig.config.testUsers.count, 10);

  console.log(`Setting up ${testUserCount} test users with environments...`);
  const userData = [];

  for (let i = 0; i < testUserCount; i++) {
    const user = testConfig.getTestUser(i);

    // Register or login
    let loginRes = http.post(
      `${baseURL}${apiVersion}/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (loginRes.status !== 200) {
      const registerRes = http.post(
        `${baseURL}${apiVersion}/auth/register`,
        JSON.stringify({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (registerRes.status === 201) {
        loginRes = { status: 200, body: registerRes.body };
      }
    }

    if (loginRes.status === 200) {
      const authBody = JSON.parse(loginRes.body);
      const accessToken = authBody.accessToken;
      const params = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      };

      // Create a project
      const projectRes = http.post(
        `${baseURL}${apiVersion}/projects`,
        JSON.stringify({
          name: `WS Test Project ${i}`,
          slug: `ws-test-${i}-${randomString(6).toLowerCase()}`,
          description: 'Project for WebSocket testing',
        }),
        params
      );

      if (projectRes.status === 201) {
        const projectBody = JSON.parse(projectRes.body);
        const projectId = projectBody.id;

        // Create an environment
        const envRes = http.post(
          `${baseURL}${apiVersion}/environments`,
          JSON.stringify({
            name: `WS Test Env`,
            slug: `ws-env-${randomString(8).toLowerCase()}`,
            projectId: projectId,
            baseImage: 'node:20-alpine',
            cpuLimit: 1.0,
            memoryLimit: 2048,
          }),
          params
        );

        if (envRes.status === 201) {
          const envBody = JSON.parse(envRes.body);

          // Start the environment
          const startRes = http.post(
            `${baseURL}${apiVersion}/environments/${envBody.id}/start`,
            null,
            params
          );

          // Wait a bit for environment to start
          sleep(3);

          userData.push({
            email: user.email,
            accessToken: accessToken,
            userId: authBody.user.id,
            projectId: projectId,
            environmentId: envBody.id,
          });
        }
      }
    }
  }

  console.log(`Setup complete. ${userData.length} users with running environments ready.`);
  return { users: userData, baseURL };
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('WebSocket streaming test complete.');
  // Note: Could cleanup environments here if needed
}

/**
 * Main test function - WebSocket connection testing
 */
export default function (data) {
  const { users, baseURL } = data;

  if (!users || users.length === 0) {
    console.error('No users available for testing');
    return;
  }

  // Each VU gets a random user
  const userIndex = randomIntBetween(0, users.length - 1);
  const user = users[userIndex];

  // Convert HTTP URL to WebSocket URL
  const wsBaseURL = baseURL.replace('http://', 'ws://').replace('https://', 'wss://');

  group('WebSocket Log Streaming', () => {
    const url = `${wsBaseURL}/ws/environments/${user.environmentId}/logs?token=${user.accessToken}`;

    const connectionStart = Date.now();
    let connectionEstablished = false;
    let messagesReceived = 0;
    let firstMessageTime = null;

    const res = ws.connect(url, {
      tags: { endpoint: 'websocket_logs' },
    }, function (socket) {
      const connectionDuration = Date.now() - connectionStart;
      wsConnectionTime.add(connectionDuration);
      connectionEstablished = true;
      activeConnections.add(1);

      socket.on('open', () => {
        wsConnectionSuccessRate.add(1);
        console.log(`WebSocket connected: ${user.environmentId}`);

        // Send ping to measure latency
        const pingStart = Date.now();
        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: pingStart,
        }));
        wsMessageSent.add(1);
      });

      socket.on('message', (data) => {
        messagesReceived++;
        wsMessageReceived.add(1);

        try {
          const message = JSON.parse(data);

          // Track first message latency
          if (!firstMessageTime) {
            firstMessageTime = Date.now();
            const latency = firstMessageTime - connectionStart;
            wsMessageLatency.add(latency);
          }

          // Handle pong messages for latency measurement
          if (message.type === 'pong') {
            const latency = Date.now() - message.timestamp;
            wsPingLatency.add(latency);
          }

          // Handle log messages
          if (message.type === 'log') {
            // Validate log message structure
            check(message, {
              'log has timestamp': (m) => !!m.data?.timestamp,
              'log has stream': (m) => !!m.data?.stream,
              'log has message': (m) => !!m.data?.message,
            });
          }

          // Handle status updates
          if (message.type === 'status') {
            check(message, {
              'status has connected': (m) => m.data?.connected !== undefined,
            });
          }
        } catch (e) {
          wsErrors.add(1);
          console.error('Error parsing WebSocket message:', e);
        }
      });

      socket.on('error', (e) => {
        wsErrors.add(1);
        console.error('WebSocket error:', e);
      });

      socket.on('close', () => {
        activeConnections.add(-1);
        console.log('WebSocket closed');
      });

      // Keep connection alive for testing duration
      const testDuration = scenario === 'smoke' ? 10 : 30; // seconds
      socket.setTimeout(() => {
        // Send control message before closing
        socket.send(JSON.stringify({
          type: 'control',
          action: 'pause',
        }));
        wsMessageSent.add(1);

        sleep(1);

        // Calculate message rate
        if (messagesReceived > 0) {
          const rate = messagesReceived / testDuration;
          wsMessageRate.add(rate);
        }

        socket.close();
      }, testDuration * 1000);
    });

    if (!connectionEstablished) {
      wsConnectionSuccessRate.add(0);
      wsErrors.add(1);
    }

    check(res, {
      'WebSocket connection established': () => connectionEstablished,
      'received messages': () => messagesReceived > 0,
    });
  });

  sleep(2);

  group('WebSocket Terminal Connection', () => {
    const url = `${wsBaseURL}/ws/environments/${user.environmentId}/terminal?token=${user.accessToken}`;

    const connectionStart = Date.now();
    let connectionEstablished = false;
    let echoReceived = false;

    const res = ws.connect(url, {
      tags: { endpoint: 'websocket_terminal' },
    }, function (socket) {
      const connectionDuration = Date.now() - connectionStart;
      wsConnectionTime.add(connectionDuration);
      connectionEstablished = true;

      socket.on('open', () => {
        wsConnectionSuccessRate.add(1);
        console.log('Terminal WebSocket connected');

        // Send terminal input
        socket.send(JSON.stringify({
          type: 'input',
          data: 'echo "WebSocket Test"\n',
        }));
        wsMessageSent.add(1);

        // Send resize command
        socket.send(JSON.stringify({
          type: 'resize',
          cols: 120,
          rows: 40,
        }));
        wsMessageSent.add(1);
      });

      socket.on('message', (data) => {
        wsMessageReceived.add(1);

        try {
          const message = JSON.parse(data);

          if (message.type === 'data') {
            // Check if we received echo response
            if (message.data && message.data.includes('WebSocket Test')) {
              echoReceived = true;
            }
          }
        } catch (e) {
          // Terminal data might not be JSON, that's okay
          if (typeof data === 'string' && data.includes('WebSocket Test')) {
            echoReceived = true;
          }
        }
      });

      socket.on('error', (e) => {
        wsErrors.add(1);
        console.error('Terminal WebSocket error:', e);
      });

      // Keep terminal connection for shorter duration
      socket.setTimeout(() => {
        socket.close();
      }, 15 * 1000);
    });

    if (!connectionEstablished) {
      wsConnectionSuccessRate.add(0);
      wsErrors.add(1);
    }

    check(res, {
      'Terminal WebSocket connected': () => connectionEstablished,
      'Terminal echo received': () => echoReceived,
    });
  });

  testConfig.randomThinkTime(sleep);
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateTextSummary(data);

  return {
    'stdout': summary,
    'results/websocket-streaming-summary.json': JSON.stringify(data),
  };
}

function generateTextSummary(data) {
  let summary = '\n';
  summary += '='.repeat(60) + '\n';
  summary += 'WebSocket Streaming Performance Test Results\n';
  summary += '='.repeat(60) + '\n\n';

  const metrics = data.metrics;

  if (metrics.ws_connection_time) {
    const values = metrics.ws_connection_time.values;
    summary += 'WebSocket Connection Time:\n';
    summary += `  avg: ${values.avg.toFixed(2)}ms\n`;
    summary += `  p95: ${values['p(95)'].toFixed(2)}ms (target: <1000ms)\n`;
    summary += `  p99: ${values['p(99)'].toFixed(2)}ms\n`;
    summary += `  max: ${values.max.toFixed(2)}ms\n\n`;
  }

  if (metrics.ws_message_latency) {
    const values = metrics.ws_message_latency.values;
    summary += 'WebSocket Message Latency (First message):\n';
    summary += `  avg: ${values.avg.toFixed(2)}ms\n`;
    summary += `  p95: ${values['p(95)'].toFixed(2)}ms (target: <100ms)\n`;
    summary += `  p99: ${values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.ws_ping_latency) {
    const values = metrics.ws_ping_latency.values;
    summary += 'WebSocket Ping Latency:\n';
    summary += `  avg: ${values.avg.toFixed(2)}ms\n`;
    summary += `  p95: ${values['p(95)'].toFixed(2)}ms (target: <50ms)\n\n`;
  }

  if (metrics.ws_message_rate) {
    const values = metrics.ws_message_rate.values;
    summary += 'WebSocket Message Rate:\n';
    summary += `  avg: ${values.avg.toFixed(2)} messages/sec\n`;
    summary += `  max: ${values.max.toFixed(2)} messages/sec\n\n`;
  }

  if (metrics.ws_messages_received) {
    summary += `Total Messages Received: ${metrics.ws_messages_received.values.count}\n`;
  }

  if (metrics.ws_messages_sent) {
    summary += `Total Messages Sent: ${metrics.ws_messages_sent.values.count}\n`;
  }

  if (metrics.ws_connection_success_rate) {
    const rate = (metrics.ws_connection_success_rate.values.rate * 100).toFixed(2);
    summary += `\nWebSocket Connection Success Rate: ${rate}%\n`;
  }

  if (metrics.ws_errors) {
    summary += `WebSocket Errors: ${metrics.ws_errors.values.count}\n`;
  }

  // Performance target assessment
  summary += '\n';
  if (metrics.ws_message_latency) {
    const p95 = metrics.ws_message_latency.values['p(95)'];
    const targetMet = p95 < 100;
    summary += `Message Latency Target (<100ms p95): ${targetMet ? 'PASS' : 'FAIL'}\n`;
  }

  summary += '\n' + '='.repeat(60) + '\n';
  return summary;
}
