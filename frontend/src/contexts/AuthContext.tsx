/**
 * Authentication Context - VibeBox Frontend
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, RegisterRequest, LoginRequest } from '@/types';
import {
  authApi,
  setToken,
  setRefreshToken,
  removeToken,
  removeRefreshToken,
  getToken,
} from '@/services/api';
import { connectWebSocket, disconnectWebSocket } from '@/services/websocket';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Authentication provider component
 */
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load current user from API
   */
  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApi.me();
      setUser(userData);
      connectWebSocket();
    } catch (error) {
      console.error('Failed to load user:', error);
      removeToken();
      removeRefreshToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const response = await authApi.login(credentials);
    setToken(response.tokens.accessToken);
    setRefreshToken(response.tokens.refreshToken);
    setUser(response.user);
    connectWebSocket();
  }, []);

  /**
   * Register a new user
   */
  const register = useCallback(async (data: RegisterRequest): Promise<void> => {
    const response = await authApi.register(data);
    setToken(response.tokens.accessToken);
    setRefreshToken(response.tokens.refreshToken);
    setUser(response.user);
    connectWebSocket();
  }, []);

  /**
   * Logout and clear session
   */
  const logout = useCallback(() => {
    removeToken();
    removeRefreshToken();
    setUser(null);
    disconnectWebSocket();
  }, []);

  /**
   * Refresh user data from API
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!getToken()) {
      return;
    }

    try {
      const userData = await authApi.me();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
