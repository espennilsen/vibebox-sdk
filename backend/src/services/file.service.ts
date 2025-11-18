/**
 * File Service
 * Handles file operations within sandbox containers
 */

import { PrismaClient } from '@prisma/client';
import { DockerService } from './docker.service';
import { FileInfo, ListFilesResponse, UploadFileResponse, DeleteFileResponse } from '@vibebox/types';
import { Readable } from 'stream';

const prisma = new PrismaClient();
const dockerService = new DockerService();

/**
 * Parses ls -la output into FileInfo objects
 *
 * @param lsOutput - Output from ls -la command
 * @param basePath - Base path for the listing
 * @returns Array of FileInfo objects
 */
function parseLsOutput(lsOutput: string, basePath: string): FileInfo[] {
  const lines = lsOutput.split('\n').filter(line => line.trim());
  const files: FileInfo[] = [];

  // Skip first line (total) and entries for . and ..
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse ls -la format: permissions links owner group size month day time name
    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;

    const permissions = parts[0];
    const name = parts.slice(8).join(' ');

    // Skip . and ..
    if (name === '.' || name === '..') continue;

    const isDirectory = permissions.startsWith('d');
    const size = parseInt(parts[4], 10) || 0;

    // Construct full path
    const fullPath = basePath.endsWith('/')
      ? `${basePath}${name}`
      : `${basePath}/${name}`;

    files.push({
      name,
      path: fullPath,
      size,
      isDirectory,
      permissions,
      modifiedAt: new Date().toISOString(), // Simplified - parse from ls output in production
    });
  }

  return files;
}

/**
 * Lists files in a directory within a container
 *
 * @param environmentId - Environment/sandbox ID
 * @param path - Directory path to list (default: /workspace)
 * @returns List of files
 */
export async function listFiles(
  environmentId: string,
  path = '/workspace'
): Promise<ListFilesResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  // Execute ls -la command
  const result = await dockerService.executeCommand(environment.containerId, [
    'ls',
    '-la',
    path,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to list directory: ${result.stderr}`);
  }

  const files = parseLsOutput(result.stdout, path);

  return {
    files,
    path,
  };
}

/**
 * Reads a file from the container
 *
 * @param environmentId - Environment/sandbox ID
 * @param filePath - Path to the file
 * @returns File content as string
 */
export async function readFile(
  environmentId: string,
  filePath: string
): Promise<string> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  // Read file using cat
  const result = await dockerService.executeCommand(environment.containerId, [
    'cat',
    filePath,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to read file: ${result.stderr}`);
  }

  return result.stdout;
}

/**
 * Writes a file to the container
 *
 * @param environmentId - Environment/sandbox ID
 * @param filePath - Path to write the file
 * @param content - File content
 * @param permissions - File permissions (e.g., '644', '755')
 * @returns Upload result
 */
export async function writeFile(
  environmentId: string,
  filePath: string,
  content: string | Buffer,
  permissions = '644'
): Promise<UploadFileResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  const contentStr = Buffer.isBuffer(content) ? content.toString('utf-8') : content;

  // Create directory if it doesn't exist
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (dir) {
    await dockerService.executeCommand(environment.containerId, [
      'mkdir',
      '-p',
      dir,
    ]);
  }

  // Write file using cat with heredoc
  const escapedContent = contentStr.replace(/'/g, "'\\''");
  const writeResult = await dockerService.executeCommand(environment.containerId, [
    'sh',
    '-c',
    `cat > ${filePath} << 'EOFFILE'\n${contentStr}\nEOFFILE`,
  ]);

  if (writeResult.exitCode !== 0) {
    throw new Error(`Failed to write file: ${writeResult.stderr}`);
  }

  // Set permissions
  await dockerService.executeCommand(environment.containerId, [
    'chmod',
    permissions,
    filePath,
  ]);

  // Get file size
  const statResult = await dockerService.executeCommand(environment.containerId, [
    'stat',
    '-c',
    '%s',
    filePath,
  ]);

  const size = parseInt(statResult.stdout.trim(), 10) || 0;

  return {
    success: true,
    path: filePath,
    size,
  };
}

/**
 * Deletes a file or directory from the container
 *
 * @param environmentId - Environment/sandbox ID
 * @param path - Path to delete
 * @param recursive - Whether to delete directories recursively
 * @returns Delete result
 */
export async function deleteFile(
  environmentId: string,
  path: string,
  recursive = false
): Promise<DeleteFileResponse> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  // Check if path exists
  const checkResult = await dockerService.executeCommand(environment.containerId, [
    'test',
    '-e',
    path,
  ]);

  if (checkResult.exitCode !== 0) {
    throw new Error('File or directory not found');
  }

  // Delete file or directory
  const rmCmd = recursive ? ['rm', '-rf', path] : ['rm', '-f', path];
  const result = await dockerService.executeCommand(environment.containerId, rmCmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to delete: ${result.stderr}`);
  }

  return {
    success: true,
    deleted: 1, // Simplified - could count files in production
  };
}

/**
 * Gets file info (stat)
 *
 * @param environmentId - Environment/sandbox ID
 * @param filePath - Path to the file
 * @returns File info
 */
export async function getFileInfo(
  environmentId: string,
  filePath: string
): Promise<FileInfo> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  // Get file info using stat
  const statResult = await dockerService.executeCommand(environment.containerId, [
    'stat',
    '-c',
    '%n|%s|%A|%Y',
    filePath,
  ]);

  if (statResult.exitCode !== 0) {
    throw new Error('File not found');
  }

  const [name, sizeStr, permissions, mtimeStr] = statResult.stdout.trim().split('|');
  const size = parseInt(sizeStr, 10) || 0;
  const mtime = parseInt(mtimeStr, 10) * 1000; // Convert to milliseconds

  // Check if directory
  const isDirectory = permissions.startsWith('d');

  return {
    name: name.split('/').pop() || name,
    path: filePath,
    size,
    isDirectory,
    permissions,
    modifiedAt: new Date(mtime).toISOString(),
  };
}

/**
 * Creates a directory in the container
 *
 * @param environmentId - Environment/sandbox ID
 * @param path - Directory path to create
 * @param recursive - Create parent directories if needed
 * @returns Success boolean
 */
export async function createDirectory(
  environmentId: string,
  path: string,
  recursive = true
): Promise<boolean> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  const mkdirCmd = recursive ? ['mkdir', '-p', path] : ['mkdir', path];
  const result = await dockerService.executeCommand(environment.containerId, mkdirCmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to create directory: ${result.stderr}`);
  }

  return true;
}

/**
 * Copies a file or directory within the container
 *
 * @param environmentId - Environment/sandbox ID
 * @param sourcePath - Source path
 * @param destPath - Destination path
 * @param recursive - Copy directories recursively
 * @returns Success boolean
 */
export async function copyFile(
  environmentId: string,
  sourcePath: string,
  destPath: string,
  recursive = false
): Promise<boolean> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  const cpCmd = recursive
    ? ['cp', '-r', sourcePath, destPath]
    : ['cp', sourcePath, destPath];

  const result = await dockerService.executeCommand(environment.containerId, cpCmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to copy: ${result.stderr}`);
  }

  return true;
}

/**
 * Moves/renames a file or directory within the container
 *
 * @param environmentId - Environment/sandbox ID
 * @param sourcePath - Source path
 * @param destPath - Destination path
 * @returns Success boolean
 */
export async function moveFile(
  environmentId: string,
  sourcePath: string,
  destPath: string
): Promise<boolean> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  const result = await dockerService.executeCommand(environment.containerId, [
    'mv',
    sourcePath,
    destPath,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to move: ${result.stderr}`);
  }

  return true;
}

/**
 * Searches for files matching a pattern
 *
 * @param environmentId - Environment/sandbox ID
 * @param searchPath - Base path to search in
 * @param pattern - Search pattern (glob)
 * @returns Array of matching file paths
 */
export async function searchFiles(
  environmentId: string,
  searchPath: string,
  pattern: string
): Promise<string[]> {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment || !environment.containerId) {
    throw new Error('Environment not found or not running');
  }

  const result = await dockerService.executeCommand(environment.containerId, [
    'find',
    searchPath,
    '-name',
    pattern,
    '-type',
    'f',
  ]);

  if (result.exitCode !== 0) {
    return [];
  }

  return result.stdout
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.trim());
}
