/**
 * API Load Test
 *
 * Tests general API performance across all endpoints.
 * Simulates realistic user behavior with mixed read/write operations.
 *
 * Scenarios:
 * - smoke: Verify all endpoints work (1 user, 1 iteration)
 * - load: Normal load (100 users, 30 minutes)
 * - stress: High load (500 users, find breaking point)
 *
 * Run:
 *   k6 run --env SCENARIO=smoke tests/performance/scenarios/api-load.test.js
 *   k6 run --env SCENARIO=load tests/performance/scenarios/api-load.test.js
 *   k6 run --env SCENARIO=stress tests/performance/scenarios/api-load.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import testConfig from '../k6.config.js';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const projectCreationTime = new Trend('project_creation_time');
const apiErrorRate = new Rate('api_error_rate');
const authFailures = new Counter('auth_failures');
const validationErrors = new Counter('validation_errors');

// Test configuration
const scenario = __ENV.SCENARIO || 'smoke';
const selectedScenario = testConfig.scenarios[scenario];

if (!selectedScenario) {
  throw new Error(`Unknown scenario: ${scenario}. Available: ${Object.keys(testConfig.scenarios).join(', ')}`);
}

export const options = {
  scenarios: {
    [scenario]: selectedScenario,
  },
  thresholds: testConfig.thresholds,
  ...testConfig.options,
};

/**
 * Setup function - runs once before tests
 * Creates test users and authenticates them
 */
export function setup() {
  const baseURL = testConfig.config.baseURL;
  const apiVersion = testConfig.config.apiVersion;
  const testUserCount = testConfig.config.testUsers.count;

  console.log(`Setting up ${testUserCount} test users...`);
  const users = [];

  // Create test users
  for (let i = 0; i < testUserCount; i++) {
    const user = testConfig.getTestUser(i);

    // Register user
    const registerRes = http.post(
      `${baseURL}${apiVersion}/auth/register`,
      JSON.stringify({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { operation: 'setup', endpoint: 'register' },
      }
    );

    if (registerRes.status === 201 || registerRes.status === 409) {
      // User created or already exists - try to login
      const loginRes = http.post(
        `${baseURL}${apiVersion}/auth/login`,
        JSON.stringify({
          email: user.email,
          password: user.password,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { operation: 'setup', endpoint: 'login' },
        }
      );

      if (loginRes.status === 200) {
        const body = JSON.parse(loginRes.body);
        users.push({
          email: user.email,
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
          userId: body.user.id,
        });
      }
    }
  }

  console.log(`Setup complete. ${users.length} users ready.`);
  return { users, baseURL, apiVersion };
}

/**
 * Teardown function - runs once after tests
 * Cleanup test data
 */
export function teardown(data) {
  console.log('Test complete. Cleanup can be performed here if needed.');
  // Note: In a real scenario, you might want to delete test users and projects
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  const { users, baseURL, apiVersion } = data;

  // Each VU gets a random user
  const userIndex = randomIntBetween(0, users.length - 1);
  const user = users[userIndex];

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`,
    },
  };

  // Simulate user journey: Create project → Create environment → Manage resources

  group('User Authentication Flow', () => {
    // Test token refresh
    const refreshRes = http.post(
      `${baseURL}${apiVersion}/auth/refresh`,
      JSON.stringify({
        refreshToken: user.refreshToken,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { operation: 'read', endpoint: 'auth_refresh' },
      }
    );

    const refreshSuccess = check(refreshRes, {
      'refresh token successful': (r) => r.status === 200,
      'received new access token': (r) => {
        try {
          return JSON.parse(r.body).accessToken !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!refreshSuccess) {
      authFailures.add(1);
    }

    // Update params with new token if refresh succeeded
    if (refreshRes.status === 200) {
      const body = JSON.parse(refreshRes.body);
      params.headers.Authorization = `Bearer ${body.accessToken}`;
    }

    // Get current user profile
    const meRes = http.get(
      `${baseURL}${apiVersion}/auth/me`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'user_profile' },
      }
    );

    check(meRes, {
      'get user profile successful': (r) => r.status === 200,
      'profile contains user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id && body.email;
        } catch {
          return false;
        }
      },
    });
  });

  testConfig.randomThinkTime(sleep);

  let projectId;
  let environmentId;

  group('Project Management', () => {
    // List projects
    const listRes = http.get(
      `${baseURL}${apiVersion}/projects`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'list_projects' },
      }
    );

    const listSuccess = check(listRes, {
      'list projects successful': (r) => r.status === 200,
      'projects is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });

    if (!listSuccess) {
      apiErrorRate.add(1);
    }

    sleep(1);

    // Create a new project
    const projectData = {
      name: `Load Test Project ${randomString(8)}`,
      slug: `loadtest-${randomString(8).toLowerCase()}`,
      description: 'Project created during performance testing',
    };

    const createStart = Date.now();
    const createRes = http.post(
      `${baseURL}${apiVersion}/projects`,
      JSON.stringify(projectData),
      {
        ...params,
        tags: { operation: 'write', endpoint: 'create_project' },
      }
    );
    const createDuration = Date.now() - createStart;

    const createSuccess = check(createRes, {
      'create project successful': (r) => r.status === 201,
      'project has id': (r) => {
        try {
          const body = JSON.parse(r.body);
          projectId = body.id;
          return !!body.id;
        } catch {
          return false;
        }
      },
      'project has correct name': (r) => {
        try {
          return JSON.parse(r.body).name === projectData.name;
        } catch {
          return false;
        }
      },
    });

    if (createSuccess) {
      projectCreationTime.add(createDuration);
    } else {
      apiErrorRate.add(1);
      if (createRes.status === 400) {
        validationErrors.add(1);
      }
    }

    if (!projectId) {
      console.warn('Project creation failed, skipping environment tests');
      return;
    }

    sleep(1);

    // Get project details
    const getRes = http.get(
      `${baseURL}${apiVersion}/projects/${projectId}`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'get_project' },
      }
    );

    check(getRes, {
      'get project successful': (r) => r.status === 200,
      'project details correct': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id === projectId && body.name === projectData.name;
        } catch {
          return false;
        }
      },
    });

    sleep(1);

    // Update project
    const updateData = {
      description: 'Updated during performance testing',
    };

    const updateRes = http.patch(
      `${baseURL}${apiVersion}/projects/${projectId}`,
      JSON.stringify(updateData),
      {
        ...params,
        tags: { operation: 'write', endpoint: 'update_project' },
      }
    );

    check(updateRes, {
      'update project successful': (r) => r.status === 200,
      'project updated': (r) => {
        try {
          return JSON.parse(r.body).description === updateData.description;
        } catch {
          return false;
        }
      },
    });
  });

  testConfig.randomThinkTime(sleep);

  group('Environment Management', () => {
    if (!projectId) {
      console.warn('No project available, skipping environment tests');
      return;
    }

    // Create environment
    const envData = {
      name: `Test Env ${randomString(6)}`,
      slug: `testenv-${randomString(6).toLowerCase()}`,
      description: 'Environment for load testing',
      projectId: projectId,
      baseImage: 'node:20',
      cpuLimit: 2.0,
      memoryLimit: 4096,
      storageLimit: 20480,
    };

    const createEnvRes = http.post(
      `${baseURL}${apiVersion}/environments`,
      JSON.stringify(envData),
      {
        ...params,
        tags: { operation: 'write', endpoint: 'create_environment' },
        timeout: testConfig.config.timeout.environment,
      }
    );

    const envCreated = check(createEnvRes, {
      'create environment successful': (r) => r.status === 201,
      'environment has id': (r) => {
        try {
          const body = JSON.parse(r.body);
          environmentId = body.id;
          return !!body.id;
        } catch {
          return false;
        }
      },
    });

    if (!envCreated) {
      apiErrorRate.add(1);
      return;
    }

    sleep(2);

    // Get environment
    const getEnvRes = http.get(
      `${baseURL}${apiVersion}/environments/${environmentId}`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'get_environment' },
      }
    );

    check(getEnvRes, {
      'get environment successful': (r) => r.status === 200,
      'environment data correct': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id === environmentId;
        } catch {
          return false;
        }
      },
    });

    sleep(1);

    // List environments for project
    const listEnvRes = http.get(
      `${baseURL}${apiVersion}/projects/${projectId}/environments`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'list_environments' },
      }
    );

    check(listEnvRes, {
      'list environments successful': (r) => r.status === 200,
      'environments is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });

    sleep(1);

    // Add port mapping
    const portData = {
      containerPort: randomIntBetween(3000, 9000),
      hostPort: randomIntBetween(3000, 9000),
      protocol: 'tcp',
      description: 'Test port mapping',
    };

    const addPortRes = http.post(
      `${baseURL}${apiVersion}/environments/${environmentId}/ports`,
      JSON.stringify(portData),
      {
        ...params,
        tags: { operation: 'write', endpoint: 'add_port' },
      }
    );

    check(addPortRes, {
      'add port successful': (r) => r.status === 201,
    });

    sleep(1);

    // Add environment variable
    const varData = {
      key: `TEST_VAR_${randomString(4)}`,
      value: randomString(16),
      isEncrypted: false,
    };

    const addVarRes = http.post(
      `${baseURL}${apiVersion}/environments/${environmentId}/variables`,
      JSON.stringify(varData),
      {
        ...params,
        tags: { operation: 'write', endpoint: 'add_variable' },
      }
    );

    check(addVarRes, {
      'add variable successful': (r) => r.status === 201,
    });

    sleep(1);

    // Update environment
    const updateEnvData = {
      description: 'Updated environment description',
      memoryLimit: 8192,
    };

    const updateEnvRes = http.patch(
      `${baseURL}${apiVersion}/environments/${environmentId}`,
      JSON.stringify(updateEnvData),
      {
        ...params,
        tags: { operation: 'write', endpoint: 'update_environment' },
      }
    );

    check(updateEnvRes, {
      'update environment successful': (r) => r.status === 200,
    });
  });

  testConfig.randomThinkTime(sleep);

  group('Cleanup', () => {
    // Delete environment
    if (environmentId) {
      const deleteEnvRes = http.del(
        `${baseURL}${apiVersion}/environments/${environmentId}`,
        null,
        {
          ...params,
          tags: { operation: 'write', endpoint: 'delete_environment' },
        }
      );

      check(deleteEnvRes, {
        'delete environment successful': (r) => r.status === 200,
      });

      sleep(1);
    }

    // Delete project
    if (projectId) {
      const deleteRes = http.del(
        `${baseURL}${apiVersion}/projects/${projectId}`,
        null,
        {
          ...params,
          tags: { operation: 'write', endpoint: 'delete_project' },
        }
      );

      check(deleteRes, {
        'delete project successful': (r) => r.status === 200,
      });
    }
  });
}

/**
 * Handle summary - custom results processing
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/api-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors;
  let summary = '';

  summary += `${indent}Test Results Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  // Metrics
  const metrics = data.metrics;
  if (metrics) {
    summary += `${indent}Key Metrics:\n`;

    if (metrics.http_req_duration) {
      const values = metrics.http_req_duration.values;
      summary += `${indent}  HTTP Request Duration:\n`;
      summary += `${indent}    min: ${values.min.toFixed(2)}ms\n`;
      summary += `${indent}    avg: ${values.avg.toFixed(2)}ms\n`;
      summary += `${indent}    p95: ${values['p(95)'].toFixed(2)}ms\n`;
      summary += `${indent}    p99: ${values['p(99)'].toFixed(2)}ms\n`;
      summary += `${indent}    max: ${values.max.toFixed(2)}ms\n`;
    }

    if (metrics.http_req_failed) {
      const rate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
      summary += `${indent}  HTTP Request Failed Rate: ${rate}%\n`;
    }

    if (metrics.checks) {
      const rate = (metrics.checks.values.rate * 100).toFixed(2);
      summary += `${indent}  Checks Passed: ${rate}%\n`;
    }
  }

  summary += `\n${indent}${'='.repeat(50)}\n`;
  return summary;
}
