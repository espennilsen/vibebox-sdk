/**
 * Environment Lifecycle Performance Test
 *
 * Tests the complete lifecycle of environments:
 * - Create → Start → Stop → Restart → Delete
 *
 * Performance Goals:
 * - <2s environment startup (excluding Docker spin-up)
 * - Sub-second stop/restart operations
 * - Support 10 concurrent environments per user
 *
 * Scenarios:
 * - smoke: Single environment lifecycle (1 user)
 * - load: Multiple concurrent environments (50 users, 10 envs each)
 * - stress: Maximum concurrent environments (100 users)
 *
 * Run:
 *   k6 run --env SCENARIO=smoke tests/performance/scenarios/environment-lifecycle.test.js
 *   k6 run --env SCENARIO=load tests/performance/scenarios/environment-lifecycle.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import testConfig from '../k6.config.js';

// Custom metrics
const environmentStartTime = new Trend('environment_start_time');
const environmentStopTime = new Trend('environment_stop_time');
const environmentRestartTime = new Trend('environment_restart_time');
const environmentCreationTime = new Trend('environment_creation_time');
const environmentDeleteTime = new Trend('environment_delete_time');

const environmentStartSuccessRate = new Rate('environment_start_success_rate');
const environmentStopSuccessRate = new Rate('environment_stop_success_rate');
const concurrentEnvironments = new Gauge('concurrent_environments_per_user');

const lifecycleErrors = new Counter('lifecycle_errors');
const timeoutErrors = new Counter('timeout_errors');

// Test configuration
const scenario = __ENV.SCENARIO || 'smoke';
const selectedScenario = testConfig.scenarios[scenario];

if (!selectedScenario) {
  throw new Error(`Unknown scenario: ${scenario}`);
}

// Custom scenarios for environment lifecycle testing
const customScenarios = {
  smoke: {
    executor: 'shared-iterations',
    vus: 1,
    iterations: 1,
    maxDuration: '5m',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },   // Ramp up to 10 users
      { duration: '5m', target: 25 },   // Scale to 25 users
      { duration: '5m', target: 50 },   // Peak at 50 users
      { duration: '10m', target: 50 },  // Sustain 50 users
      { duration: '3m', target: 0 },    // Ramp down
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '3m', target: 50 },
      { duration: '5m', target: 100 },
      { duration: '10m', target: 100 },
      { duration: '3m', target: 0 },
    ],
  },
};

export const options = {
  scenarios: {
    [scenario]: customScenarios[scenario] || selectedScenario,
  },
  thresholds: {
    ...testConfig.thresholds,
    // Environment-specific thresholds
    'environment_start_time': ['p(95)<2000', 'p(99)<5000'], // <2s p95 requirement
    'environment_stop_time': ['p(95)<1000', 'p(99)<2000'],
    'environment_restart_time': ['p(95)<3000', 'p(99)<6000'],
    'environment_start_success_rate': ['rate>0.95'], // 95% success rate
    'environment_stop_success_rate': ['rate>0.95'],
    'lifecycle_errors': ['count<10'], // Allow minimal errors
  },
  ...testConfig.options,
};

/**
 * Setup function - create test users and projects
 */
export function setup() {
  const baseURL = testConfig.config.baseURL;
  const apiVersion = testConfig.config.apiVersion;
  const testUserCount = Math.min(testConfig.config.testUsers.count, 20);

  console.log(`Setting up ${testUserCount} test users with projects...`);
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
        const body = JSON.parse(registerRes.body);
        loginRes = { status: 200, body: registerRes.body };
      }
    }

    if (loginRes.status === 200) {
      const authBody = JSON.parse(loginRes.body);
      const accessToken = authBody.accessToken;

      // Create a project for this user
      const projectRes = http.post(
        `${baseURL}${apiVersion}/projects`,
        JSON.stringify({
          name: `Env Lifecycle Test Project ${i}`,
          slug: `env-lifecycle-${i}-${randomString(6).toLowerCase()}`,
          description: 'Project for environment lifecycle testing',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (projectRes.status === 201) {
        const projectBody = JSON.parse(projectRes.body);
        userData.push({
          email: user.email,
          accessToken: accessToken,
          refreshToken: authBody.refreshToken,
          userId: authBody.user.id,
          projectId: projectBody.id,
        });
      }
    }
  }

  console.log(`Setup complete. ${userData.length} users with projects ready.`);
  return { users: userData, baseURL, apiVersion };
}

/**
 * Teardown - cleanup test data
 */
export function teardown(data) {
  console.log('Environment lifecycle test complete.');
}

/**
 * Wait for environment to reach expected status
 *
 * @param {string} envId - Environment ID
 * @param {string} expectedStatus - Expected status (running, stopped, etc.)
 * @param {object} params - Request parameters
 * @param {object} config - Configuration
 * @returns {boolean} Success
 */
function waitForEnvironmentStatus(envId, expectedStatus, params, config) {
  const { baseURL, apiVersion } = config;
  const maxAttempts = 30;
  const pollInterval = 2; // seconds

  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = http.get(
      `${baseURL}${apiVersion}/environments/${envId}`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'poll_environment_status' },
      }
    );

    if (statusRes.status === 200) {
      const body = JSON.parse(statusRes.body);
      if (body.status === expectedStatus) {
        return true;
      }
      if (body.status === 'error' || body.status === 'failed') {
        console.error(`Environment ${envId} entered error state`);
        return false;
      }
    }

    sleep(pollInterval);
  }

  console.warn(`Timeout waiting for environment ${envId} to reach ${expectedStatus}`);
  timeoutErrors.add(1);
  return false;
}

/**
 * Main test function - environment lifecycle
 */
export default function (data) {
  const { users, baseURL, apiVersion } = data;

  if (!users || users.length === 0) {
    console.error('No users available for testing');
    return;
  }

  // Each VU gets a random user
  const userIndex = randomIntBetween(0, users.length - 1);
  const user = users[userIndex];

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`,
    },
  };

  const environments = [];
  const maxEnvsPerUser = 3; // Create 3 environments to test concurrency

  group('Environment Creation', () => {
    for (let i = 0; i < maxEnvsPerUser; i++) {
      const envData = {
        name: `Lifecycle Test Env ${i + 1}`,
        slug: `lifecycle-env-${i + 1}-${randomString(8).toLowerCase()}`,
        description: `Environment ${i + 1} for lifecycle testing`,
        projectId: user.projectId,
        baseImage: 'node:20-alpine', // Use alpine for faster startup
        cpuLimit: 1.0,
        memoryLimit: 2048,
        storageLimit: 10240,
      };

      const createStart = Date.now();
      const createRes = http.post(
        `${baseURL}${apiVersion}/environments`,
        JSON.stringify(envData),
        {
          ...params,
          tags: { operation: 'write', endpoint: 'create_environment' },
          timeout: testConfig.config.timeout.environment,
        }
      );
      const createDuration = Date.now() - createStart;

      const created = check(createRes, {
        'environment created': (r) => r.status === 201,
        'environment has id': (r) => {
          try {
            return !!JSON.parse(r.body).id;
          } catch {
            return false;
          }
        },
      });

      if (created) {
        const envBody = JSON.parse(createRes.body);
        environments.push({
          id: envBody.id,
          name: envBody.name,
          status: envBody.status,
        });
        environmentCreationTime.add(createDuration);
      } else {
        lifecycleErrors.add(1);
      }

      sleep(1); // Brief pause between creations
    }

    concurrentEnvironments.add(environments.length);
  });

  if (environments.length === 0) {
    console.warn('No environments created, skipping lifecycle tests');
    return;
  }

  testConfig.randomThinkTime(sleep);

  group('Environment Start', () => {
    for (const env of environments) {
      const startBegin = Date.now();
      const startRes = http.post(
        `${baseURL}${apiVersion}/environments/${env.id}/start`,
        null,
        {
          ...params,
          tags: { operation: 'write', endpoint: 'environment_start' },
          timeout: testConfig.config.timeout.environment,
        }
      );
      const startDuration = Date.now() - startBegin;

      const startInitiated = check(startRes, {
        'start request accepted': (r) => r.status === 200 || r.status === 202,
      });

      if (startInitiated) {
        // Wait for environment to reach running state
        const running = waitForEnvironmentStatus(env.id, 'running', params, { baseURL, apiVersion });

        const totalStartTime = Date.now() - startBegin;
        environmentStartTime.add(totalStartTime);
        environmentStartSuccessRate.add(running ? 1 : 0);

        if (running) {
          env.status = 'running';
        } else {
          lifecycleErrors.add(1);
        }
      } else {
        lifecycleErrors.add(1);
        environmentStartSuccessRate.add(0);
      }

      sleep(1);
    }
  });

  testConfig.randomThinkTime(sleep);

  group('Environment Stop', () => {
    for (const env of environments) {
      if (env.status !== 'running') {
        continue;
      }

      const stopBegin = Date.now();
      const stopRes = http.post(
        `${baseURL}${apiVersion}/environments/${env.id}/stop`,
        null,
        {
          ...params,
          tags: { operation: 'write', endpoint: 'environment_stop' },
          timeout: testConfig.config.timeout.environment,
        }
      );

      const stopInitiated = check(stopRes, {
        'stop request accepted': (r) => r.status === 200 || r.status === 202,
      });

      if (stopInitiated) {
        const stopped = waitForEnvironmentStatus(env.id, 'stopped', params, { baseURL, apiVersion });

        const totalStopTime = Date.now() - stopBegin;
        environmentStopTime.add(totalStopTime);
        environmentStopSuccessRate.add(stopped ? 1 : 0);

        if (stopped) {
          env.status = 'stopped';
        } else {
          lifecycleErrors.add(1);
        }
      } else {
        lifecycleErrors.add(1);
        environmentStopSuccessRate.add(0);
      }

      sleep(1);
    }
  });

  testConfig.randomThinkTime(sleep);

  group('Environment Restart', () => {
    // Test restart on one environment
    const env = environments[0];

    if (env) {
      const restartBegin = Date.now();
      const restartRes = http.post(
        `${baseURL}${apiVersion}/environments/${env.id}/restart`,
        null,
        {
          ...params,
          tags: { operation: 'write', endpoint: 'environment_restart' },
          timeout: testConfig.config.timeout.environment,
        }
      );

      const restartInitiated = check(restartRes, {
        'restart request accepted': (r) => r.status === 200 || r.status === 202,
      });

      if (restartInitiated) {
        const running = waitForEnvironmentStatus(env.id, 'running', params, { baseURL, apiVersion });

        const totalRestartTime = Date.now() - restartBegin;
        environmentRestartTime.add(totalRestartTime);

        if (!running) {
          lifecycleErrors.add(1);
        }
      } else {
        lifecycleErrors.add(1);
      }
    }
  });

  testConfig.randomThinkTime(sleep);

  group('Environment Cleanup', () => {
    for (const env of environments) {
      // Stop if running
      if (env.status === 'running') {
        http.post(
          `${baseURL}${apiVersion}/environments/${env.id}/stop`,
          null,
          {
            ...params,
            tags: { operation: 'write', endpoint: 'environment_stop' },
          }
        );
        sleep(2); // Wait for stop to complete
      }

      // Delete
      const deleteBegin = Date.now();
      const deleteRes = http.del(
        `${baseURL}${apiVersion}/environments/${env.id}`,
        null,
        {
          ...params,
          tags: { operation: 'write', endpoint: 'delete_environment' },
        }
      );
      const deleteDuration = Date.now() - deleteBegin;

      const deleted = check(deleteRes, {
        'environment deleted': (r) => r.status === 200,
      });

      if (deleted) {
        environmentDeleteTime.add(deleteDuration);
      } else {
        lifecycleErrors.add(1);
      }

      sleep(1);
    }
  });
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateTextSummary(data);

  return {
    'stdout': summary,
    'results/environment-lifecycle-summary.json': JSON.stringify(data),
  };
}

function generateTextSummary(data) {
  let summary = '\n';
  summary += '='.repeat(60) + '\n';
  summary += 'Environment Lifecycle Test Results\n';
  summary += '='.repeat(60) + '\n\n';

  const metrics = data.metrics;

  if (metrics.environment_start_time) {
    const values = metrics.environment_start_time.values;
    summary += 'Environment Start Time:\n';
    summary += `  avg: ${values.avg.toFixed(2)}ms\n`;
    summary += `  p95: ${values['p(95)'].toFixed(2)}ms (target: <2000ms)\n`;
    summary += `  p99: ${values['p(99)'].toFixed(2)}ms\n`;
    summary += `  max: ${values.max.toFixed(2)}ms\n\n`;
  }

  if (metrics.environment_stop_time) {
    const values = metrics.environment_stop_time.values;
    summary += 'Environment Stop Time:\n';
    summary += `  avg: ${values.avg.toFixed(2)}ms\n`;
    summary += `  p95: ${values['p(95)'].toFixed(2)}ms (target: <1000ms)\n`;
    summary += `  p99: ${values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.environment_start_success_rate) {
    const rate = (metrics.environment_start_success_rate.values.rate * 100).toFixed(2);
    summary += `Environment Start Success Rate: ${rate}%\n`;
  }

  if (metrics.environment_stop_success_rate) {
    const rate = (metrics.environment_stop_success_rate.values.rate * 100).toFixed(2);
    summary += `Environment Stop Success Rate: ${rate}%\n`;
  }

  if (metrics.lifecycle_errors) {
    summary += `\nLifecycle Errors: ${metrics.lifecycle_errors.values.count}\n`;
  }

  if (metrics.timeout_errors) {
    summary += `Timeout Errors: ${metrics.timeout_errors.values.count}\n`;
  }

  summary += '\n' + '='.repeat(60) + '\n';
  return summary;
}
