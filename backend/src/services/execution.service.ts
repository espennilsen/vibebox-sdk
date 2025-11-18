/**
 * Execution Service
 * Handles code execution within sandbox containers
 */

import { PrismaClient, Execution, ExecutionStatus } from '@prisma/client';
import { DockerService } from './docker.service';
import { WebSocketService } from './websocket.service';
import {
  ExecuteCodeRequest,
  ExecuteCodeResponse,
} from '@vibebox/types';

const prisma = new PrismaClient();
const dockerService = new DockerService();

/**
 * Language runtime configuration
 * Maps language names to their execution commands
 */
const LANGUAGE_RUNTIMES: Record<string, { command: string[]; fileExtension: string }> = {
  javascript: {
    command: ['node'],
    fileExtension: '.js',
  },
  typescript: {
    command: ['ts-node'],
    fileExtension: '.ts',
  },
  python: {
    command: ['python3'],
    fileExtension: '.py',
  },
  bash: {
    command: ['bash'],
    fileExtension: '.sh',
  },
  sh: {
    command: ['sh'],
    fileExtension: '.sh',
  },
};

/**
 * Gets the runtime configuration for a language
 *
 * @param language - Programming language
 * @returns Runtime configuration
 * @throws {Error} If language is not supported
 */
function getRuntimeConfig(language: string): { command: string[]; fileExtension: string } {
  const runtime = LANGUAGE_RUNTIMES[language.toLowerCase()];
  if (!runtime) {
    throw new Error(
      `Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGE_RUNTIMES).join(', ')}`
    );
  }
  return runtime;
}

/**
 * Creates a temporary file in the container with the code
 *
 * @param containerId - Container ID
 * @param code - Code to write
 * @param extension - File extension
 * @returns Path to the created file
 */
async function createTempFile(
  containerId: string,
  code: string,
  extension: string
): Promise<string> {
  const filename = `/tmp/exec_${Date.now()}${extension}`;

  // Write code to file using sh -c to handle special characters
  const escapedCode = code.replace(/'/g, "'\\''");
  await dockerService.executeCommand(containerId, [
    'sh',
    '-c',
    `cat > ${filename} << 'EOFCODE'\n${code}\nEOFCODE`,
  ]);

  return filename;
}

/**
 * Executes code in a sandbox container
 *
 * @param environmentId - Environment/sandbox ID
 * @param userId - User ID
 * @param request - Execution request
 * @returns Execution result
 */
export async function executeCode(
  environmentId: string,
  userId: string,
  request: ExecuteCodeRequest
): Promise<ExecuteCodeResponse> {
  const { code, language, timeout = 30000, env = {} } = request;

  // Validate language support
  const runtime = getRuntimeConfig(language);

  // Get environment/container info
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  // Create execution record
  const execution = await prisma.execution.create({
    data: {
      environmentId,
      userId,
      code,
      language: language.toLowerCase(),
      status: 'pending',
      timeout,
      env,
    },
  });

  try {
    // Update status to running
    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    // Create temporary file with code
    const tempFile = await createTempFile(
      environment.containerId,
      code,
      runtime.fileExtension
    );

    // Build execution command
    const execCommand = [...runtime.command, tempFile];

    // Set environment variables
    const envVars = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    const fullCommand = envVars
      ? ['sh', '-c', `${envVars} ${execCommand.join(' ')}`]
      : execCommand;

    // Execute with timeout
    const startTime = Date.now();
    const result = await Promise.race([
      dockerService.executeCommand(environment.containerId, fullCommand),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      ),
    ]);

    const duration = Date.now() - startTime;

    // Clean up temporary file
    await dockerService.executeCommand(environment.containerId, ['rm', '-f', tempFile]);

    // Update execution record with results
    const updatedExecution = await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: result.exitCode === 0 ? 'completed' : 'failed',
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        duration,
        completedAt: new Date(),
      },
    });

    return {
      executionId: execution.id,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      duration,
      status: updatedExecution.status as any,
    };
  } catch (error: any) {
    // Handle timeout
    const isTimeout = error.message === 'Execution timeout';
    const status: ExecutionStatus = isTimeout ? 'timeout' : 'failed';

    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status,
        stderr: error.message,
        completedAt: new Date(),
      },
    });

    throw new Error(isTimeout ? 'Execution timed out' : error.message);
  }
}

/**
 * Executes code with WebSocket streaming for real-time output
 *
 * @param environmentId - Environment/sandbox ID
 * @param userId - User ID
 * @param request - Execution request
 * @param wsService - WebSocket service instance for streaming
 * @returns Execution ID
 */
export async function executeCodeStreaming(
  environmentId: string,
  userId: string,
  request: ExecuteCodeRequest,
  wsService: WebSocketService
): Promise<string> {
  const { code, language, timeout = 30000, env = {} } = request;

  // Validate language support
  const runtime = getRuntimeConfig(language);

  // Get environment/container info
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  // Create execution record
  const execution = await prisma.execution.create({
    data: {
      environmentId,
      userId,
      code,
      language: language.toLowerCase(),
      status: 'pending',
      timeout,
      env,
    },
  });

  // Start execution in background
  (async () => {
    try {
      // Update status to running
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      // Notify start via WebSocket
      wsService.broadcastToEnvironment(environmentId, {
        type: 'execution:start',
        data: { executionId: execution.id },
      });

      // Create temporary file with code
      const tempFile = await createTempFile(
        environment.containerId!,
        code,
        runtime.fileExtension
      );

      // Execute and stream output
      const execCommand = [...runtime.command, tempFile];
      const startTime = Date.now();

      // For streaming, we'll use docker exec with streaming
      // This is simplified - in production you'd use dockerode's stream API
      const result = await dockerService.executeCommand(
        environment.containerId!,
        execCommand
      );

      const duration = Date.now() - startTime;

      // Stream output chunks
      if (result.stdout) {
        wsService.broadcastToEnvironment(environmentId, {
          type: 'execution:output',
          data: {
            executionId: execution.id,
            stream: 'stdout',
            data: result.stdout,
          },
        });
      }

      if (result.stderr) {
        wsService.broadcastToEnvironment(environmentId, {
          type: 'execution:output',
          data: {
            executionId: execution.id,
            stream: 'stderr',
            data: result.stderr,
          },
        });
      }

      // Clean up
      await dockerService.executeCommand(environment.containerId!, ['rm', '-f', tempFile]);

      // Update execution record
      const status = result.exitCode === 0 ? 'completed' : 'failed';
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          duration,
          completedAt: new Date(),
        },
      });

      // Notify completion
      wsService.broadcastToEnvironment(environmentId, {
        type: 'execution:end',
        data: {
          executionId: execution.id,
          exitCode: result.exitCode,
          duration,
          status,
        },
      });
    } catch (error: any) {
      const isTimeout = error.message === 'Execution timeout';
      const status: ExecutionStatus = isTimeout ? 'timeout' : 'failed';

      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status,
          stderr: error.message,
          completedAt: new Date(),
        },
      });

      // Notify error
      wsService.broadcastToEnvironment(environmentId, {
        type: 'execution:end',
        data: {
          executionId: execution.id,
          exitCode: 1,
          duration: 0,
          status,
        },
      });
    }
  })();

  return execution.id;
}

/**
 * Gets execution by ID
 *
 * @param executionId - Execution ID
 * @returns Execution record
 */
export async function getExecution(executionId: string): Promise<Execution | null> {
  return prisma.execution.findUnique({
    where: { id: executionId },
  });
}

/**
 * Lists executions for an environment
 *
 * @param environmentId - Environment ID
 * @param limit - Maximum number of results
 * @returns Array of executions
 */
export async function listExecutions(
  environmentId: string,
  limit = 50
): Promise<Execution[]> {
  return prisma.execution.findMany({
    where: { environmentId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Cancels a running execution (if possible)
 *
 * @param executionId - Execution ID
 * @returns Success boolean
 */
export async function cancelExecution(executionId: string): Promise<boolean> {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
  });

  if (!execution || execution.status !== 'running') {
    return false;
  }

  // Mark as cancelled
  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status: 'cancelled',
      completedAt: new Date(),
    },
  });

  return true;
}

/**
 * Gets supported languages
 *
 * @returns Array of supported language names
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_RUNTIMES);
}
