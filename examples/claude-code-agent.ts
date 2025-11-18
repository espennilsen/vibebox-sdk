/**
 * Claude Code Agent Example
 *
 * Demonstrates how a Claude Code agent can use the VibeBox SDK
 * to orchestrate multiple sandboxes for distributed tasks.
 *
 * This example shows:
 * - Creating multiple sandboxes in parallel
 * - Executing tasks across sandboxes
 * - Collecting and aggregating results
 * - Proper cleanup and error handling
 */

import { VibeBox } from '../src';

/**
 * Claude Code Agent for distributed testing across multiple repositories
 */
class ClaudeCodeTestAgent {
  private vb: VibeBox;

  constructor(apiKey: string) {
    this.vb = new VibeBox({
      apiKey,
      baseUrl: process.env.VIBEBOX_BASE_URL || 'http://localhost:3000',
      retries: 3,
    });
  }

  /**
   * Run tests across multiple repositories in parallel
   */
  async runParallelTests(repositories: string[]): Promise<TestResult[]> {
    console.log(`🤖 Claude Agent: Testing ${repositories.length} repositories in parallel...`);

    // Create sandboxes for each repository
    const sandboxes = await this.vb.createMany(
      repositories.map((repo, index) => ({
        name: `test-sandbox-${index + 1}`,
        template: 'node:20-alpine',
        autoStart: true,
        ephemeral: true,
        timeout: '30m',
        git: {
          url: repo,
          branch: 'main',
          path: '/workspace/repo',
        },
      }))
    );

    console.log(`✅ Created ${sandboxes.length} sandboxes`);

    // Run tests in parallel across all sandboxes
    const results = await Promise.all(
      sandboxes.map(async (sandbox, index) => {
        try {
          console.log(`🔄 Running tests in sandbox ${index + 1}...`);

          // Install dependencies
          const installResult = await sandbox.run('npm install', {
            cwd: '/workspace/repo',
            timeout: 120000,
          });

          if (installResult.exitCode !== 0) {
            throw new Error(`npm install failed: ${installResult.stderr}`);
          }

          // Run tests
          const testResult = await sandbox.run('npm test', {
            cwd: '/workspace/repo',
            timeout: 300000,
          });

          // Get coverage if available
          let coverage = 0;
          try {
            const coverageResult = await sandbox.run(
              'npm run coverage:summary || echo "No coverage"',
              { cwd: '/workspace/repo' }
            );
            coverage = this.parseCoverage(coverageResult.stdout);
          } catch {
            // Coverage not available
          }

          return {
            repository: repositories[index],
            sandboxId: sandbox.id,
            success: testResult.exitCode === 0,
            output: testResult.stdout,
            errors: testResult.stderr,
            duration: testResult.duration,
            coverage,
          };
        } catch (error: any) {
          return {
            repository: repositories[index],
            sandboxId: sandbox.id,
            success: false,
            output: '',
            errors: error.message,
            duration: 0,
            coverage: 0,
          };
        } finally {
          // Cleanup sandbox
          await sandbox.destroy().catch(() => {
            console.warn(`⚠️  Failed to cleanup sandbox ${sandbox.id}`);
          });
        }
      })
    );

    return results;
  }

  /**
   * Analyze code quality across multiple repositories
   */
  async analyzeCodeQuality(repositories: string[]): Promise<QualityReport[]> {
    console.log(`🤖 Claude Agent: Analyzing ${repositories.length} repositories...`);

    const reports = await Promise.all(
      repositories.map(async (repo) => {
        return this.vb.withSandbox('node:20-alpine', async (sandbox) => {
          // Clone repository
          await sandbox.git.clone(repo, {
            path: '/workspace/repo',
            depth: 1,
          });

          // Install dependencies
          await sandbox.run('npm install', { cwd: '/workspace/repo' });

          // Run linter
          const lintResult = await sandbox.run('npm run lint || eslint .', {
            cwd: '/workspace/repo',
          });

          // Count TypeScript files
          const tsFiles = await sandbox.files.search('/workspace/repo', '**/*.ts');
          const jsFiles = await sandbox.files.search('/workspace/repo', '**/*.js');

          // Check for test files
          const testFiles = await sandbox.files.search(
            '/workspace/repo',
            '**/*.test.{ts,js}'
          );

          return {
            repository: repo,
            lintIssues: this.parseLintOutput(lintResult.stdout),
            totalFiles: tsFiles.length + jsFiles.length,
            typeScriptFiles: tsFiles.length,
            javaScriptFiles: jsFiles.length,
            testFiles: testFiles.length,
            testCoverage: testFiles.length / (tsFiles.length + jsFiles.length),
          };
        });
      })
    );

    return reports;
  }

  /**
   * Deploy applications across multiple environments
   */
  async deployToMultipleEnvironments(
    repo: string,
    environments: Array<{ name: string; env: Record<string, string> }>
  ): Promise<DeploymentResult[]> {
    console.log(`🤖 Claude Agent: Deploying to ${environments.length} environments...`);

    const results = await Promise.all(
      environments.map(async ({ name, env }) => {
        return this.vb.withSandbox('node:20-alpine', async (sandbox) => {
          try {
            // Clone repository
            await sandbox.git.clone(repo, { path: '/workspace/app' });

            // Set environment variables
            await sandbox.env.set(env);

            // Install dependencies
            const installResult = await sandbox.run('npm install', {
              cwd: '/workspace/app',
            });

            if (installResult.exitCode !== 0) {
              throw new Error('Installation failed');
            }

            // Build application
            const buildResult = await sandbox.run('npm run build', {
              cwd: '/workspace/app',
              env,
            });

            if (buildResult.exitCode !== 0) {
              throw new Error('Build failed');
            }

            // Download build artifacts
            const buildFiles = await sandbox.files.list('/workspace/app/dist');

            return {
              environment: name,
              success: true,
              buildTime: buildResult.duration,
              artifactCount: buildFiles.length,
              message: `Successfully built for ${name}`,
            };
          } catch (error: any) {
            return {
              environment: name,
              success: false,
              buildTime: 0,
              artifactCount: 0,
              message: `Deployment failed: ${error.message}`,
            };
          }
        });
      })
    );

    return results;
  }

  /**
   * Migration task: Update dependencies across multiple repositories
   */
  async updateDependenciesAcrossRepos(
    repositories: string[],
    packageUpdates: Record<string, string>
  ): Promise<MigrationResult[]> {
    console.log(
      `🤖 Claude Agent: Updating dependencies in ${repositories.length} repositories...`
    );

    const results = await Promise.all(
      repositories.map(async (repo) => {
        return this.vb.withSandbox('node:20-alpine', async (sandbox) => {
          try {
            // Clone with authentication
            await sandbox.git.clone(repo, {
              path: '/workspace/repo',
              auth: {
                type: 'token',
                token: process.env.GITHUB_TOKEN || '',
              },
            });

            // Read package.json
            const packageJsonContent = await sandbox.files.download(
              '/workspace/repo/package.json'
            );
            const packageJson = JSON.parse(packageJsonContent.toString('utf-8'));

            // Update dependencies
            let updated = false;
            for (const [pkg, version] of Object.entries(packageUpdates)) {
              if (packageJson.dependencies?.[pkg]) {
                packageJson.dependencies[pkg] = version;
                updated = true;
              }
              if (packageJson.devDependencies?.[pkg]) {
                packageJson.devDependencies[pkg] = version;
                updated = true;
              }
            }

            if (!updated) {
              return {
                repository: repo,
                success: true,
                updated: false,
                message: 'No matching dependencies found',
              };
            }

            // Write updated package.json
            await sandbox.files.upload(
              '/workspace/repo/package.json',
              JSON.stringify(packageJson, null, 2)
            );

            // Install updated dependencies
            const installResult = await sandbox.run('npm install', {
              cwd: '/workspace/repo',
            });

            if (installResult.exitCode !== 0) {
              throw new Error('npm install failed after update');
            }

            // Run tests to verify
            const testResult = await sandbox.run('npm test', {
              cwd: '/workspace/repo',
            });

            if (testResult.exitCode !== 0) {
              throw new Error('Tests failed after dependency update');
            }

            // Commit changes
            await sandbox.git.commit(
              `chore: Update dependencies\n\n${Object.entries(packageUpdates)
                .map(([pkg, ver]) => `- ${pkg}: ${ver}`)
                .join('\n')}\n\n🤖 Updated by Claude Code Agent`,
              {
                all: true,
                author: {
                  name: 'Claude Code Agent',
                  email: 'claude@vibebox.dev',
                },
              }
            );

            // Push changes
            await sandbox.git.push();

            return {
              repository: repo,
              success: true,
              updated: true,
              message: 'Dependencies updated and pushed successfully',
            };
          } catch (error: any) {
            return {
              repository: repo,
              success: false,
              updated: false,
              message: `Migration failed: ${error.message}`,
            };
          }
        });
      })
    );

    return results;
  }

  private parseCoverage(output: string): number {
    const match = output.match(/All files[^\d]+([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private parseLintOutput(output: string): number {
    const match = output.match(/(\d+)\s+problems?/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

// Type definitions
interface TestResult {
  repository: string;
  sandboxId: string;
  success: boolean;
  output: string;
  errors: string;
  duration: number;
  coverage: number;
}

interface QualityReport {
  repository: string;
  lintIssues: number;
  totalFiles: number;
  typeScriptFiles: number;
  javaScriptFiles: number;
  testFiles: number;
  testCoverage: number;
}

interface DeploymentResult {
  environment: string;
  success: boolean;
  buildTime: number;
  artifactCount: number;
  message: string;
}

interface MigrationResult {
  repository: string;
  success: boolean;
  updated: boolean;
  message: string;
}

// Example usage
async function main() {
  const agent = new ClaudeCodeTestAgent(process.env.VIBEBOX_API_KEY!);

  // Example 1: Run tests across multiple repositories
  console.log('\n📊 Example 1: Parallel Testing\n');
  const testResults = await agent.runParallelTests([
    'https://github.com/user/repo1.git',
    'https://github.com/user/repo2.git',
    'https://github.com/user/repo3.git',
  ]);

  console.log('\n✅ Test Results:');
  testResults.forEach((result) => {
    console.log(
      `  ${result.success ? '✅' : '❌'} ${result.repository}: ${
        result.success ? 'PASSED' : 'FAILED'
      } (${result.duration}ms, ${result.coverage}% coverage)`
    );
  });

  // Example 2: Code quality analysis
  console.log('\n📊 Example 2: Code Quality Analysis\n');
  const qualityReports = await agent.analyzeCodeQuality([
    'https://github.com/user/repo1.git',
    'https://github.com/user/repo2.git',
  ]);

  console.log('\n📈 Quality Reports:');
  qualityReports.forEach((report) => {
    console.log(`\n  ${report.repository}:`);
    console.log(`    Files: ${report.totalFiles} (${report.typeScriptFiles} TS)`);
    console.log(`    Tests: ${report.testFiles} (${(report.testCoverage * 100).toFixed(1)}% coverage)`);
    console.log(`    Lint Issues: ${report.lintIssues}`);
  });

  // Example 3: Multi-environment deployment
  console.log('\n📊 Example 3: Multi-Environment Deployment\n');
  const deployResults = await agent.deployToMultipleEnvironments(
    'https://github.com/user/my-app.git',
    [
      { name: 'staging', env: { NODE_ENV: 'staging', API_URL: 'https://staging.api.com' } },
      { name: 'production', env: { NODE_ENV: 'production', API_URL: 'https://api.com' } },
    ]
  );

  console.log('\n🚀 Deployment Results:');
  deployResults.forEach((result) => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.environment}: ${result.message}`);
  });

  // Example 4: Dependency migration
  console.log('\n📊 Example 4: Dependency Migration\n');
  const migrationResults = await agent.updateDependenciesAcrossRepos(
    ['https://github.com/user/repo1.git', 'https://github.com/user/repo2.git'],
    {
      'typescript': '^5.5.0',
      'vitest': '^1.6.0',
    }
  );

  console.log('\n🔄 Migration Results:');
  migrationResults.forEach((result) => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.repository}: ${result.message}`);
  });

  console.log('\n✨ All tasks completed!\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { ClaudeCodeTestAgent };
