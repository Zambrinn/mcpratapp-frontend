export enum UserRole {
  ADMIN = "ADMIN",
  VENDOR = "VENDOR"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User,
  expiresIn: number
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string>;
}
