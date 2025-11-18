/**
 * File operations resource
 *
 * Provides methods for file operations within a sandbox:
 * - List files and directories
 * - Upload and download files
 * - Create directories
 * - Copy and move files
 * - Delete files
 * - Search for files
 */

import type { HttpClient } from '../utils/http-client';
import type {
  FileInfo,
  ListFilesResponse,
  UploadResult,
  DeleteFileOptions,
  MakeDirOptions,
  SearchFilesResponse,
} from '../types';

/**
 * File operations resource class
 */
export class FilesResource {
  constructor(
    private readonly environmentId: string,
    private readonly http: HttpClient
  ) {}

  /**
   * List files in a directory
   *
   * @param path - Directory path (default: /workspace)
   * @returns List of files and directories
   *
   * @example
   * ```typescript
   * const files = await sandbox.files.list('/workspace');
   * files.forEach(file => {
   *   console.log(`${file.name} (${file.size} bytes)`);
   * });
   * ```
   */
  async list(path: string = '/workspace'): Promise<FileInfo[]> {
    const response = await this.http.get<ListFilesResponse>(
      `/api/v1/environments/${this.environmentId}/files`,
      { params: { path } }
    );
    return response.files;
  }

  /**
   * Get file information
   *
   * @param path - File path
   * @returns File metadata
   *
   * @example
   * ```typescript
   * const info = await sandbox.files.info('/workspace/package.json');
   * console.log(`Size: ${info.size} bytes`);
   * console.log(`Modified: ${info.modifiedAt}`);
   * ```
   */
  async info(path: string): Promise<FileInfo> {
    return this.http.get<FileInfo>(
      `/api/v1/environments/${this.environmentId}/files/info`,
      { params: { path } }
    );
  }

  /**
   * Upload file content
   *
   * @param path - Destination path in sandbox
   * @param content - File content (string or Buffer)
   * @param permissions - File permissions (default: 644)
   * @returns Upload result
   *
   * @example
   * ```typescript
   * // Upload text content
   * await sandbox.files.upload('/workspace/config.json', JSON.stringify(config));
   *
   * // Upload with custom permissions
   * await sandbox.files.upload('/workspace/script.sh', scriptContent, '755');
   *
   * // Upload binary content (base64 encoded)
   * const buffer = fs.readFileSync('image.png');
   * await sandbox.files.upload('/workspace/image.png', buffer.toString('base64'));
   * ```
   */
  async upload(path: string, content: string | Buffer, permissions: string = '644'): Promise<UploadResult> {
    const contentStr = Buffer.isBuffer(content) ? content.toString('base64') : content;

    return this.http.post<UploadResult>(
      `/api/v1/environments/${this.environmentId}/files`,
      {
        path,
        content: contentStr,
        permissions,
      }
    );
  }

  /**
   * Download file content
   *
   * @param path - File path in sandbox
   * @returns File content as Buffer
   *
   * @example
   * ```typescript
   * const content = await sandbox.files.download('/workspace/output.txt');
   * console.log(content.toString('utf-8'));
   *
   * // Download binary file
   * const imageData = await sandbox.files.download('/workspace/image.png');
   * fs.writeFileSync('local-image.png', imageData);
   * ```
   */
  async download(path: string): Promise<Buffer> {
    const arrayBuffer = await this.http.get<ArrayBuffer>(
      `/api/v1/environments/${this.environmentId}/files/download`,
      {
        params: { path },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete a file or directory
   *
   * @param path - Path to delete
   * @param options - Delete options
   *
   * @example
   * ```typescript
   * await sandbox.files.delete('/workspace/temp.txt');
   *
   * // Delete directory recursively
   * await sandbox.files.delete('/workspace/old-build', { recursive: true });
   * ```
   */
  async delete(path: string, options?: DeleteFileOptions): Promise<void> {
    await this.http.delete(
      `/api/v1/environments/${this.environmentId}/files`,
      {
        params: {
          path,
          recursive: options?.recursive || false,
        },
      }
    );
  }

  /**
   * Create a directory
   *
   * @param path - Directory path
   * @param options - Mkdir options
   *
   * @example
   * ```typescript
   * await sandbox.files.mkdir('/workspace/dist');
   *
   * // Create nested directories
   * await sandbox.files.mkdir('/workspace/src/components', { recursive: true });
   * ```
   */
  async mkdir(path: string, options?: MakeDirOptions): Promise<void> {
    await this.http.post(
      `/api/v1/environments/${this.environmentId}/files/mkdir`,
      {
        path,
        recursive: options?.recursive !== false, // Default true
      }
    );
  }

  /**
   * Copy a file or directory
   *
   * @param source - Source path
   * @param dest - Destination path
   * @param recursive - Copy directories recursively
   *
   * @example
   * ```typescript
   * await sandbox.files.copy('/workspace/file.txt', '/workspace/backup/file.txt');
   *
   * // Copy directory recursively
   * await sandbox.files.copy('/workspace/src', '/workspace/backup/src', true);
   * ```
   */
  async copy(source: string, dest: string, recursive: boolean = false): Promise<void> {
    await this.http.post(
      `/api/v1/environments/${this.environmentId}/files/copy`,
      {
        source,
        dest,
        recursive,
      }
    );
  }

  /**
   * Move or rename a file or directory
   *
   * @param source - Source path
   * @param dest - Destination path
   *
   * @example
   * ```typescript
   * await sandbox.files.move('/workspace/old-name.txt', '/workspace/new-name.txt');
   * await sandbox.files.move('/workspace/src', '/workspace/lib');
   * ```
   */
  async move(source: string, dest: string): Promise<void> {
    await this.http.post(
      `/api/v1/environments/${this.environmentId}/files/move`,
      {
        source,
        dest,
      }
    );
  }

  /**
   * Search for files matching a pattern
   *
   * @param basePath - Base path to search
   * @param pattern - Search pattern/glob
   * @returns Array of matching file paths
   *
   * @example
   * ```typescript
   * const tsFiles = await sandbox.files.search('/workspace', '**\/*.ts');
   * const testFiles = await sandbox.files.search('/workspace', '**\/*.test.ts');
   * ```
   */
  async search(basePath: string, pattern: string): Promise<string[]> {
    const response = await this.http.get<SearchFilesResponse>(
      `/api/v1/environments/${this.environmentId}/files/search`,
      {
        params: {
          path: basePath,
          pattern,
        },
      }
    );
    return response.files;
  }
}
