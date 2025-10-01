/**
 * API Client Service - VibeBox Frontend
 * Handles all HTTP communication with the backend API
 */

import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UpdateUserRequest,
  GetUserResponse,
  UpdateUserResponse,
  CreateTeamRequest,
  UpdateTeamRequest,
  GetTeamResponse,
  AddTeamMemberRequest,
  ListTeamMembersResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  GetProjectResponse,
  ListProjectsResponse,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  GetEnvironmentResponse,
  ListEnvironmentsResponse,
  AddPortMappingRequest,
  AddEnvironmentVariableRequest,
  CreateSessionRequest,
  GetSessionResponse,
  ListSessionsResponse,
  InstallExtensionRequest,
  SearchExtensionsRequest,
  SearchExtensionsResponse,
  ListExtensionsResponse,
  GetLogsRequest,
  GetLogsResponse,
  HealthCheckResponse,
  ApiError,
  AddSshKeyRequest,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'vibebox_token';
const REFRESH_TOKEN_KEY = 'vibebox_refresh_token';

/**
 * Custom error class for API errors
 */
export class ApiException extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

/**
 * Get stored access token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store access token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove access token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store refresh token
 */
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/**
 * Remove refresh token
 */
export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Base fetch wrapper with authentication and error handling
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          // Try to refresh the token
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const data: RefreshTokenResponse = await refreshResponse.json();
            setToken(data.tokens.accessToken);
            setRefreshToken(data.tokens.refreshToken);

            // Retry the original request with new token
            (headers as Record<string, string>)['Authorization'] =
              `Bearer ${data.tokens.accessToken}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
            });

            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        } catch {
          // Refresh failed, clear tokens and redirect to login
          removeToken();
          removeRefreshToken();
          window.location.href = '/login';
          throw new ApiException(401, 'Unauthorized', 'Session expired. Please log in again.');
        }
      }

      // No refresh token or refresh failed
      removeToken();
      removeRefreshToken();
      window.location.href = '/login';
      throw new ApiException(401, 'Unauthorized', 'Authentication required. Please log in.');
    }

    // Handle other error responses
    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          statusCode: response.status,
          error: response.statusText,
          message: `Request failed with status ${response.status}`,
        };
      }

      throw new ApiException(
        errorData.statusCode,
        errorData.error,
        errorData.message,
        errorData.details
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }

    // Network error or other fetch failure
    throw new ApiException(
      0,
      'NetworkError',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return fetchApi<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    return fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return fetchApi<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get current authenticated user
   */
  async me(): Promise<GetUserResponse> {
    return fetchApi<GetUserResponse>('/auth/me');
  },
};

/**
 * Users API
 */
export const usersApi = {
  /**
   * Get user profile by ID
   */
  async getUser(userId: string): Promise<GetUserResponse> {
    return fetchApi<GetUserResponse>(`/users/${userId}`);
  },

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<UpdateUserResponse> {
    return fetchApi<UpdateUserResponse>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Add SSH public key
   */
  async addSshKey(userId: string, data: AddSshKeyRequest): Promise<GetUserResponse> {
    return fetchApi<GetUserResponse>(`/users/${userId}/ssh-keys`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove SSH public key
   */
  async removeSshKey(userId: string, keyIndex: number): Promise<GetUserResponse> {
    return fetchApi<GetUserResponse>(`/users/${userId}/ssh-keys/${keyIndex}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Teams API
 */
export const teamsApi = {
  /**
   * Create a new team
   */
  async createTeam(data: CreateTeamRequest): Promise<GetTeamResponse> {
    return fetchApi<GetTeamResponse>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<GetTeamResponse> {
    return fetchApi<GetTeamResponse>(`/teams/${teamId}`);
  },

  /**
   * Update team
   */
  async updateTeam(teamId: string, data: UpdateTeamRequest): Promise<GetTeamResponse> {
    return fetchApi<GetTeamResponse>(`/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<void> {
    return fetchApi<void>(`/teams/${teamId}`, {
      method: 'DELETE',
    });
  },

  /**
   * List team members
   */
  async listMembers(teamId: string): Promise<ListTeamMembersResponse> {
    return fetchApi<ListTeamMembersResponse>(`/teams/${teamId}/members`);
  },

  /**
   * Add team member
   */
  async addMember(teamId: string, data: AddTeamMemberRequest): Promise<void> {
    return fetchApi<void>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove team member
   */
  async removeMember(teamId: string, userId: string): Promise<void> {
    return fetchApi<void>(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Projects API
 */
export const projectsApi = {
  /**
   * Create a new project
   */
  async createProject(data: CreateProjectRequest): Promise<GetProjectResponse> {
    return fetchApi<GetProjectResponse>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<GetProjectResponse> {
    return fetchApi<GetProjectResponse>(`/projects/${projectId}`);
  },

  /**
   * Update project
   */
  async updateProject(projectId: string, data: UpdateProjectRequest): Promise<GetProjectResponse> {
    return fetchApi<GetProjectResponse>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    return fetchApi<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  },

  /**
   * List user's projects
   */
  async listProjects(): Promise<ListProjectsResponse> {
    return fetchApi<ListProjectsResponse>('/projects');
  },
};

/**
 * Environments API
 */
export const environmentsApi = {
  /**
   * Create a new environment
   */
  async createEnvironment(data: CreateEnvironmentRequest): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>('/environments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get environment by ID
   */
  async getEnvironment(envId: string): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}`);
  },

  /**
   * Update environment
   */
  async updateEnvironment(
    envId: string,
    data: UpdateEnvironmentRequest
  ): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete environment
   */
  async deleteEnvironment(envId: string): Promise<void> {
    return fetchApi<void>(`/environments/${envId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Start environment
   */
  async startEnvironment(envId: string): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}/start`, {
      method: 'POST',
    });
  },

  /**
   * Stop environment
   */
  async stopEnvironment(envId: string): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}/stop`, {
      method: 'POST',
    });
  },

  /**
   * Restart environment
   */
  async restartEnvironment(envId: string): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}/restart`, {
      method: 'POST',
    });
  },

  /**
   * List environments for a project
   */
  async listEnvironments(projectId: string): Promise<ListEnvironmentsResponse> {
    return fetchApi<ListEnvironmentsResponse>(`/projects/${projectId}/environments`);
  },

  /**
   * Add port mapping
   */
  async addPort(envId: string, data: AddPortMappingRequest): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}/ports`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove port mapping
   */
  async removePort(envId: string, port: number): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}/ports/${port}`, {
      method: 'DELETE',
    });
  },

  /**
   * Add environment variable
   */
  async addVariable(
    envId: string,
    data: AddEnvironmentVariableRequest
  ): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}/variables`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove environment variable
   */
  async removeVariable(envId: string, key: string): Promise<GetEnvironmentResponse> {
    return fetchApi<GetEnvironmentResponse>(`/environments/${envId}/variables/${key}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Sessions API
 */
export const sessionsApi = {
  /**
   * Create a new terminal session
   */
  async createSession(data: CreateSessionRequest): Promise<GetSessionResponse> {
    return fetchApi<GetSessionResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<GetSessionResponse> {
    return fetchApi<GetSessionResponse>(`/sessions/${sessionId}`);
  },

  /**
   * Terminate session
   */
  async deleteSession(sessionId: string): Promise<void> {
    return fetchApi<void>(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * List sessions for an environment
   */
  async listSessions(envId: string): Promise<ListSessionsResponse> {
    return fetchApi<ListSessionsResponse>(`/environments/${envId}/sessions`);
  },
};

/**
 * Extensions API
 */
export const extensionsApi = {
  /**
   * Search extensions
   */
  async searchExtensions(params: SearchExtensionsRequest): Promise<SearchExtensionsResponse> {
    const query = new URLSearchParams({
      q: params.query,
      ...(params.page && { page: params.page.toString() }),
      ...(params.pageSize && { pageSize: params.pageSize.toString() }),
    });
    return fetchApi<SearchExtensionsResponse>(`/extensions/search?${query}`);
  },

  /**
   * Install extension
   */
  async installExtension(data: InstallExtensionRequest): Promise<void> {
    return fetchApi<void>('/extensions/install', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Uninstall extension
   */
  async uninstallExtension(extensionId: string): Promise<void> {
    return fetchApi<void>(`/extensions/${extensionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * List installed extensions
   */
  async listExtensions(envId: string): Promise<ListExtensionsResponse> {
    return fetchApi<ListExtensionsResponse>(`/environments/${envId}/extensions`);
  },
};

/**
 * Logs API
 */
export const logsApi = {
  /**
   * Get logs for an environment
   */
  async getLogs(params: GetLogsRequest): Promise<GetLogsResponse> {
    const query = new URLSearchParams({
      environmentId: params.environmentId,
      ...(params.stream && { stream: params.stream }),
      ...(params.since && { since: params.since }),
      ...(params.until && { until: params.until }),
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.follow && { follow: params.follow.toString() }),
    });
    return fetchApi<GetLogsResponse>(`/logs?${query}`);
  },
};

/**
 * Health check API
 */
export const healthApi = {
  /**
   * Check API health
   */
  async check(): Promise<HealthCheckResponse> {
    return fetchApi<HealthCheckResponse>('/health');
  },
};
