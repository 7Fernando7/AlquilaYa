/**
 * Authentication API endpoints
 */

import apiClient from './client';
import type { LoginCredentials, RegisterData, TokenData, User } from '@/types/auth';

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data as User;
  },

  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
      user: User;
    };
  },

  /**
   * Verify email with token from verification link
   */
  verifyEmail: async (verificationToken: string) => {
    const response = await apiClient.post('/auth/verify-email', {
      verification_token: verificationToken,
    });
    return response.data;
  },

  /**
   * Resend email verification link
   */
  resendVerification: async (email: string) => {
    const response = await apiClient.post('/auth/resend-verification', { email });
    return response.data;
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email: string) => {
    const response = await apiClient.post('/auth/password/reset-request', { email });
    return response.data;
  },

  /**
   * Confirm password reset with new password
   */
  confirmPasswordReset: async (resetToken: string, newPassword: string) => {
    const response = await apiClient.post('/auth/password/confirm-reset', {
      reset_token: resetToken,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Logout current session
   */
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data as TokenData;
  },

  /**
   * Get user profile (requires authentication)
   */
  getProfile: async (userId: string) => {
    const response = await apiClient.get(`/users/${userId}/profile`);
    return response.data as User;
  },

  /**
   * Update user profile (requires authentication)
   */
  updateProfile: async (userId: string, data: Partial<User>) => {
    const response = await apiClient.put(`/users/${userId}/profile`, data);
    return response.data as User;
  },
};

export default authApi;
