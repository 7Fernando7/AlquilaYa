/**
 * Authentication and User types
 */

export type UserType = 'seeker' | 'owner';

export interface User {
  id: string;
  email: string;
  name: string;
  user_type: UserType;
  created_at: string;
  phone?: string;
  bio?: string;
  profile_photo_url?: string;
  is_verified?: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  user_type: UserType;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}
