/**
 * Authentication Context Provider
 * Manages auth state, login, logout, and token persistence
 */

import { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthState, LoginCredentials, RegisterData } from '@/types/auth';
import authApi from '@/api/auth';

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    loading: true,
    error: null,
  });

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const userId = localStorage.getItem('userId');

        if (accessToken && userId) {
          // Try to restore user profile
          try {
            const user = await authApi.getProfile(userId);
            setState({
              user,
              accessToken,
              refreshToken: refreshToken || null,
              loading: false,
              error: null,
            });
          } catch (error) {
            // If profile fetch fails, clear tokens
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userId');
            setState({
              user: null,
              accessToken: null,
              refreshToken: null,
              loading: false,
              error: null,
            });
          }
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await authApi.login(credentials);
      const { user, access_token, refresh_token } = response;

      // Store tokens in localStorage
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('userId', user.id);
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }

      setState({
        user,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        loading: false,
        error: null,
      });

      return user;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authApi.register(data);
      setState((prev) => ({ ...prev, loading: false }));
      return user;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      // Always clear local state and storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: null,
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
