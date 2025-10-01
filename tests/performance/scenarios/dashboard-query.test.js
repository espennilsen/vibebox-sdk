/**
 * Dashboard Query Performance Test
 *
 * Tests dashboard-related queries and data retrieval operations.
 * Focuses on the most frequently accessed endpoints in the UI.
 *
 * Performance Goal:
 * - <200ms p95 for dashboard queries (project requirement)
 *
 * Dashboard queries include:
 * - List all projects
 * - List environments for projects
 * - Get environment details
 * - Get user profile
 * - List teams
 *
 * Scenarios:
 * - smoke: Single user dashboard load
 * - load: Normal dashboard usage (100 users)
 * - stress: Heavy dashboard traffic (500 users)
 *
 * Run:
 *   k6 run --env SCENARIO=smoke tests/performance/scenarios/dashboard-query.test.js
 *   k6 run --env SCENARIO=load tests/performance/scenarios/dashboard-query.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import testConfig from '../k6.config.js';

// Custom metrics
const dashboardLoadTime = new Trend('dashboard_load_time');
const projectListTime = new Trend('project_list_time');
const environmentListTime = new Trend('environment_list_time');
const userProfileTime = new Trend('user_profile_time');

const dashboardQuerySuccessRate = new Rate('dashboard_query_success_rate');
const cacheHitRate = new Rate('cache_hit_rate');
const slowQueries = new Counter('slow_queries'); // Queries > 500ms

// Test configuration
const scenario = __ENV.SCENARIO || 'smoke';
const selectedScenario = testConfig.scenarios[scenario];

if (!selectedScenario) {
  throw new Error(`Unknown scenario: ${scenario}`);
}

// Custom scenarios optimized for dashboard queries
const customScenarios = {
  smoke: {
    executor: 'shared-iterations',
    vus: 1,
    iterations: 5, // Multiple iterations to test consistency
    maxDuration: '2m',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 25 },
      { duration: '5m', target: 50 },
      { duration: '10m', target: 100 },
      { duration: '5m', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 300 },
      { duration: '5m', target: 500 },
      { duration: '5m', target: 0 },
    ],
  },
};

export const options = {
  scenarios: {
    [scenario]: customScenarios[scenario] || selectedScenario,
  },
  thresholds: {
    ...testConfig.thresholds,
    // Dashboard-specific thresholds
    'dashboard_load_time': ['p(95)<200', 'p(99)<500'], // <200ms p95 requirement
    'project_list_time': ['p(95)<150', 'p(99)<300'],
    'environment_list_time': ['p(95)<200', 'p(99)<400'],
    'user_profile_time': ['p(95)<100', 'p(99)<200'],
    'dashboard_query_success_rate': ['rate>0.99'], // 99% success rate for reads
    'slow_queries': ['count<100'], // Minimal slow queries allowed
  },
  ...testConfig.options,
};

/**
 * Setup function - create test users with sample data
 */
export function setup() {
  const baseURL = testConfig.config.baseURL;
  const apiVersion = testConfig.config.apiVersion;
  const testUserCount = Math.min(testConfig.config.testUsers.count, 15);

  console.log(`Setting up ${testUserCount} test users with sample data...`);
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

      // Create sample projects (3-5 per user)
      const projectCount = randomIntBetween(3, 5);
      const projects = [];

      for (let p = 0; p < projectCount; p++) {
        const projectRes = http.post(
          `${baseURL}${apiVersion}/projects`,
          JSON.stringify({
            name: `Dashboard Test Project ${i}-${p}`,
            slug: `dash-test-${i}-${p}-${Date.now()}`,
            description: 'Project for dashboard query testing',
          }),
          params
        );

        if (projectRes.status === 201) {
          const projectBody = JSON.parse(projectRes.body);
          const projectId = projectBody.id;

          // Create sample environments (2-4 per project)
          const envCount = randomIntBetween(2, 4);
          for (let e = 0; e < envCount; e++) {
            http.post(
              `${baseURL}${apiVersion}/environments`,
              JSON.stringify({
                name: `Env ${e + 1}`,
                slug: `env-${e + 1}-${Date.now()}`,
                projectId: projectId,
                baseImage: 'node:20-alpine',
                cpuLimit: 1.0,
                memoryLimit: 2048,
              }),
              params
            );
          }

          projects.push(projectId);
        }
      }

      userData.push({
        email: user.email,
        accessToken: accessToken,
        refreshToken: authBody.refreshToken,
        userId: authBody.user.id,
        projects: projects,
      });
    }
  }

  console.log(`Setup complete. ${userData.length} users with sample data ready.`);
  return { users: userData, baseURL, apiVersion };
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Dashboard query test complete.');
}

/**
 * Main test function - simulates dashboard loading and navigation
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

  // Simulate complete dashboard load sequence
  const dashboardStart = Date.now();
  let allQueriesSuccessful = true;

  group('Dashboard Initial Load', () => {
    // 1. Get user profile (always first)
    const profileStart = Date.now();
    const profileRes = http.get(
      `${baseURL}${apiVersion}/auth/me`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'dashboard' },
      }
    );
    const profileDuration = Date.now() - profileStart;

    const profileSuccess = check(profileRes, {
      'user profile loaded': (r) => r.status === 200,
      'profile has required fields': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id && body.email && body.displayName;
        } catch {
          return false;
        }
      },
    });

    userProfileTime.add(profileDuration);
    if (profileDuration > 500) slowQueries.add(1);
    if (!profileSuccess) allQueriesSuccessful = false;

    sleep(0.1);

    // 2. List all projects
    const projectsStart = Date.now();
    const projectsRes = http.get(
      `${baseURL}${apiVersion}/projects`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'dashboard' },
      }
    );
    const projectsDuration = Date.now() - projectsStart;

    const projectsSuccess = check(projectsRes, {
      'projects list loaded': (r) => r.status === 200,
      'projects is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });

    projectListTime.add(projectsDuration);
    if (projectsDuration > 500) slowQueries.add(1);
    if (!projectsSuccess) allQueriesSuccessful = false;

    sleep(0.1);

    // 3. Load environments for each project (parallel-like behavior)
    if (projectsRes.status === 200) {
      const projects = JSON.parse(projectsRes.body);
      const projectsToLoad = projects.slice(0, 5); // Load first 5 projects

      for (const project of projectsToLoad) {
        const envStart = Date.now();
        const envRes = http.get(
          `${baseURL}${apiVersion}/projects/${project.id}/environments`,
          {
            ...params,
            tags: { operation: 'read', endpoint: 'dashboard' },
          }
        );
        const envDuration = Date.now() - envStart;

        const envSuccess = check(envRes, {
          'environments loaded': (r) => r.status === 200,
          'environments is array': (r) => {
            try {
              return Array.isArray(JSON.parse(r.body));
            } catch {
              return false;
            }
          },
        });

        environmentListTime.add(envDuration);
        if (envDuration > 500) slowQueries.add(1);
        if (!envSuccess) allQueriesSuccessful = false;

        sleep(0.05); // Very brief pause
      }
    }
  });

  const totalDashboardTime = Date.now() - dashboardStart;
  dashboardLoadTime.add(totalDashboardTime);
  dashboardQuerySuccessRate.add(allQueriesSuccessful ? 1 : 0);

  testConfig.randomThinkTime(sleep);

  group('Dashboard Navigation - Project Detail', () => {
    // User clicks on a project to view details
    if (user.projects && user.projects.length > 0) {
      const projectId = user.projects[randomIntBetween(0, user.projects.length - 1)];

      // Get project details
      const projectStart = Date.now();
      const projectRes = http.get(
        `${baseURL}${apiVersion}/projects/${projectId}`,
        {
          ...params,
          tags: { operation: 'read', endpoint: 'dashboard' },
        }
      );
      const projectDuration = Date.now() - projectStart;

      check(projectRes, {
        'project details loaded': (r) => r.status === 200,
      });

      if (projectDuration > 500) slowQueries.add(1);

      sleep(0.2);

      // Get project environments
      const envStart = Date.now();
      const envRes = http.get(
        `${baseURL}${apiVersion}/projects/${projectId}/environments`,
        {
          ...params,
          tags: { operation: 'read', endpoint: 'dashboard' },
        }
      );
      const envDuration = Date.now() - envStart;

      const envSuccess = check(envRes, {
        'project environments loaded': (r) => r.status === 200,
      });

      environmentListTime.add(envDuration);
      if (envDuration > 500) slowQueries.add(1);

      // If environments exist, get details of one
      if (envSuccess && envRes.status === 200) {
        const environments = JSON.parse(envRes.body);
        if (environments.length > 0) {
          const env = environments[randomIntBetween(0, environments.length - 1)];

          sleep(0.2);

          const envDetailStart = Date.now();
          const envDetailRes = http.get(
            `${baseURL}${apiVersion}/environments/${env.id}`,
            {
              ...params,
              tags: { operation: 'read', endpoint: 'dashboard' },
            }
          );
          const envDetailDuration = Date.now() - envDetailStart;

          check(envDetailRes, {
            'environment details loaded': (r) => r.status === 200,
          });

          if (envDetailDuration > 500) slowQueries.add(1);
        }
      }
    }
  });

  testConfig.randomThinkTime(sleep);

  group('Dashboard Refresh', () => {
    // User refreshes dashboard (common action)
    // This simulates clicking refresh or auto-refresh

    const refreshStart = Date.now();

    // Quick profile check
    const profileRes = http.get(
      `${baseURL}${apiVersion}/auth/me`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'dashboard' },
      }
    );

    sleep(0.05);

    // Reload projects
    const projectsRes = http.get(
      `${baseURL}${apiVersion}/projects`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'dashboard' },
      }
    );

    const refreshSuccess = check(null, {
      'dashboard refresh successful': () =>
        profileRes.status === 200 && projectsRes.status === 200,
    });

    const refreshDuration = Date.now() - refreshStart;

    // Check if response was potentially cached (very fast response)
    if (refreshDuration < 50) {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }

    dashboardQuerySuccessRate.add(refreshSuccess ? 1 : 0);
  });

  testConfig.randomThinkTime(sleep);

  group('Dashboard Pagination', () => {
    // Test listing with pagination (if API supports it)
    // This simulates scrolling through project/environment lists

    const pageRes = http.get(
      `${baseURL}${apiVersion}/projects`,
      {
        ...params,
        tags: { operation: 'read', endpoint: 'dashboard' },
      }
    );

    check(pageRes, {
      'pagination request successful': (r) => r.status === 200,
    });
  });
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateTextSummary(data);

  return {
    'stdout': summary,
    'results/dashboard-query-summary.json': JSON.stringify(data),
  };
}

function generateTextSummary(data) {
  let summary = '\n';
  summary += '='.repeat(60) + '\n';
  summary += 'Dashboard Query Performance Test Results\n';
  summary += '='.repeat(60) + '\n\n';

  const metrics = data.metrics;

  summary += 'Dashboard Load Time (Complete page load):\n';
  if (metrics.dashboard_load_time) {
    const values = metrics.dashboard_load_time.values;
    summary += `  min: ${values.min.toFixed(2)}ms\n`;
    summary += `  avg: ${values.avg.toFixed(2)}ms\n`;
    summary += `  p95: ${values['p(95)'].toFixed(2)}ms\n`;
    summary += `  p99: ${values['p(99)'].toFixed(2)}ms\n`;
    summary += `  max: ${values.max.toFixed(2)}ms\n\n`;
  }

  summary += 'Individual Query Performance:\n';

  if (metrics.user_profile_time) {
    const values = metrics.user_profile_time.values;
    summary += `  User Profile - p95: ${values['p(95)'].toFixed(2)}ms (target: <100ms)\n`;
  }

  if (metrics.project_list_time) {
    const values = metrics.project_list_time.values;
    summary += `  Project List - p95: ${values['p(95)'].toFixed(2)}ms (target: <150ms)\n`;
  }

  if (metrics.environment_list_time) {
    const values = metrics.environment_list_time.values;
    summary += `  Environment List - p95: ${values['p(95)'].toFixed(2)}ms (target: <200ms)\n`;
  }

  summary += '\n';

  if (metrics.dashboard_query_success_rate) {
    const rate = (metrics.dashboard_query_success_rate.values.rate * 100).toFixed(2);
    summary += `Dashboard Query Success Rate: ${rate}%\n`;
  }

  if (metrics.cache_hit_rate) {
    const rate = (metrics.cache_hit_rate.values.rate * 100).toFixed(2);
    summary += `Cache Hit Rate (estimated): ${rate}%\n`;
  }

  if (metrics.slow_queries) {
    summary += `\nSlow Queries (>500ms): ${metrics.slow_queries.values.count}\n`;
  }

  // Check if p95 target was met
  if (metrics.dashboard_load_time) {
    const p95 = metrics.dashboard_load_time.values['p(95)'];
    const targetMet = p95 < 200;
    summary += `\nPerformance Target (<200ms p95): ${targetMet ? 'PASS' : 'FAIL'}\n`;
  }

  summary += '\n' + '='.repeat(60) + '\n';
  return summary;
}
