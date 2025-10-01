/**
 * k6 Performance Testing Configuration
 *
 * This configuration file defines test scenarios, thresholds, and options
 * for load testing the VibeBox API.
 *
 * Performance Goals (from plan.md):
 * - Sub-second API response times for CRUD operations
 * - <2s environment startup (excluding Docker spin-up)
 * - Support 1,000+ total environments
 * - 10 concurrent environments per user
 * - <200ms p95 for dashboard queries
 */

/**
 * Test scenario configurations
 *
 * Each scenario defines a different load testing pattern:
 * - smoke: Verify all endpoints work with minimal load
 * - load: Sustained load to verify performance under normal conditions
 * - stress: Push system to limits to identify breaking point
 * - spike: Sudden traffic spike to test elasticity
 * - soak: Extended duration to identify memory leaks
 */
export const scenarios = {
  // Smoke test: 1 user, 1 iteration
  smoke: {
    executor: 'shared-iterations',
    vus: 1,
    iterations: 1,
    maxDuration: '1m',
  },

  // Load test: Ramp up to 100 users over 5 minutes, sustain for 10 minutes
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 20 },  // Ramp up to 20 users
      { duration: '10m', target: 50 }, // Scale to 50 users
      { duration: '5m', target: 100 }, // Peak at 100 users
      { duration: '10m', target: 100 }, // Sustain 100 users
      { duration: '5m', target: 0 },   // Ramp down
    ],
    gracefulRampDown: '30s',
  },

  // Stress test: Ramp up to 500 users to identify breaking point
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },  // Warm up
      { duration: '5m', target: 200 },  // Approaching limits
      { duration: '5m', target: 300 },  // Beyond normal load
      { duration: '5m', target: 400 },  // Stress territory
      { duration: '5m', target: 500 },  // Maximum stress
      { duration: '10m', target: 500 }, // Sustain stress
      { duration: '5m', target: 0 },    // Recovery
    ],
    gracefulRampDown: '30s',
  },

  // Spike test: Sudden spike from 10 to 200 users
  spike: {
    executor: 'ramping-vus',
    startVUs: 10,
    stages: [
      { duration: '30s', target: 10 },  // Normal baseline
      { duration: '10s', target: 200 }, // Sudden spike
      { duration: '3m', target: 200 },  // Sustain spike
      { duration: '10s', target: 10 },  // Sudden drop
      { duration: '30s', target: 10 },  // Recovery
    ],
  },

  // Soak test: 50 users for 1 hour (memory leak detection)
  soak: {
    executor: 'constant-vus',
    vus: 50,
    duration: '1h',
  },
};

/**
 * Performance thresholds based on project requirements
 *
 * Thresholds define the acceptance criteria for performance tests.
 * If any threshold is violated, the test is considered failed.
 */
export const thresholds = {
  // HTTP request duration
  'http_req_duration': [
    'p(95)<1000',      // 95% of requests must complete below 1s
    'p(99)<2000',      // 99% of requests must complete below 2s
    'max<5000',        // Absolute maximum 5s
  ],

  // Dashboard queries (tagged requests)
  'http_req_duration{endpoint:dashboard}': [
    'p(95)<200',       // Dashboard queries: <200ms p95 (project requirement)
    'p(99)<500',
  ],

  // CRUD operations
  'http_req_duration{operation:read}': [
    'p(95)<500',       // Read operations: <500ms p95
    'p(99)<1000',
  ],
  'http_req_duration{operation:write}': [
    'p(95)<1000',      // Write operations: <1s p95
    'p(99)<2000',
  ],

  // Environment operations
  'http_req_duration{endpoint:environment_start}': [
    'p(95)<2000',      // Environment startup: <2s p95 (project requirement)
    'p(99)<5000',
  ],

  // HTTP request failures
  'http_req_failed': [
    'rate<0.01',       // Error rate must be below 1%
  ],

  // Checks (assertions)
  'checks': [
    'rate>0.95',       // 95% of checks must pass
  ],

  // WebSocket connections
  'ws_connecting': [
    'p(95)<1000',      // WebSocket connection time
  ],
  'ws_msgs_received': [
    'count>0',         // Must receive WebSocket messages
  ],

  // Iterations
  'iteration_duration': [
    'p(95)<5000',      // Full user journey: <5s p95
  ],

  // HTTP request waiting time (TTFB - Time To First Byte)
  'http_req_waiting': [
    'p(95)<800',       // Server processing time: <800ms p95
  ],

  // HTTP request blocked time (DNS + TCP connection)
  'http_req_blocked': [
    'p(95)<100',       // Connection establishment: <100ms p95
  ],
};

/**
 * General k6 options
 */
export const options = {
  // Test run configuration
  noConnectionReuse: false,  // Reuse connections (more realistic)
  userAgent: 'k6-VibeBox-LoadTest/1.0',

  // Rate limiting
  rps: 1000,                 // Max requests per second (global)

  // Thresholds
  thresholds: thresholds,

  // Summary export
  summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],

  // Tags for all requests
  tags: {
    test_type: 'performance',
    project: 'vibebox',
  },
};

/**
 * Test environment configuration
 */
export const config = {
  // API base URL
  baseURL: __ENV.BASE_URL || 'http://localhost:3000',

  // API version
  apiVersion: '/api/v1',

  // Test data
  testUsers: {
    count: parseInt(__ENV.TEST_USERS || '10'),
    emailPrefix: 'perftest',
    emailDomain: 'vibebox.test',
    password: 'TestPassword123!',
  },

  // Think time (time between requests to simulate real user behavior)
  thinkTime: {
    min: parseInt(__ENV.THINK_TIME_MIN || '1'),    // 1 second minimum
    max: parseInt(__ENV.THINK_TIME_MAX || '5'),    // 5 seconds maximum
  },

  // Timeouts
  timeout: {
    default: '30s',
    environment: '60s',  // Environment operations may take longer
    websocket: '120s',
  },

  // Batch sizes
  batch: {
    projects: 5,
    environments: 10,
  },
};

/**
 * Helper function to get full API URL
 *
 * @param {string} endpoint - API endpoint path
 * @returns {string} Full URL
 */
export function getURL(endpoint) {
  return `${config.baseURL}${config.apiVersion}${endpoint}`;
}

/**
 * Helper function to generate test user credentials
 *
 * @param {number} index - User index
 * @returns {object} User credentials
 */
export function getTestUser(index) {
  return {
    email: `${config.testUsers.emailPrefix}${index}@${config.testUsers.emailDomain}`,
    password: config.testUsers.password,
    displayName: `Performance Test User ${index}`,
  };
}

/**
 * Helper function to sleep for a random think time
 * Simulates real user behavior (reading, thinking, clicking)
 *
 * @param {function} sleep - k6 sleep function
 */
export function randomThinkTime(sleep) {
  const min = config.thinkTime.min;
  const max = config.thinkTime.max;
  const duration = Math.random() * (max - min) + min;
  sleep(duration);
}

/**
 * Export configuration for use in test scripts
 */
export default {
  scenarios,
  thresholds,
  options,
  config,
  getURL,
  getTestUser,
  randomThinkTime,
};
