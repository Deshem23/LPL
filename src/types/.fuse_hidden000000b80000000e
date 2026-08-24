export type UserRole = 'admin' | 'editor' | 'writer' | 'contributor';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  bio?: string;
  role_title?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  two_factor_enabled: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: User | null;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  } | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
}
