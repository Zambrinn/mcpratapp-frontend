import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ApiError,
  User,
  UserUpdateRequest,
} from '../types/index';

function handleErrors(error: AxiosError): string {
    const status = error.response?.status ?? 500
    const data = error.response?.data as any

    const backendMessage =
      typeof data?.message === 'string' ? data.message.toLowerCase() : ''

    const raw =
      typeof data === 'string' ? data.toLowerCase() : JSON.stringify(data ?? {}).toLowerCase()

    if (status === 401) return 'Email ou senha incorretos'
    if (status === 403) return 'Você não tem permissão para esta ação'
    if (status === 404) return 'Registro não encontrado'
    if (status === 409) return 'Já existe um usuário com esse nome ou email'
    if (status === 400) return 'Dados inválidos. Revise os campos e tente novamente'

    if (/unique|duplicate|constraint|ja cadastrado|já cadastrado|already exists/.test(raw + ' ' + backendMessage)) {
      return 'Já existe um usuário com esse nome ou email'
    }

    return 'Não foi possível concluir a operação. Tente novamente'
  }

class ApiService {
  private api: AxiosInstance;
  private baseURL = 'http://localhost:8080/api/v1';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('Erro na requisição:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
        const apiError: ApiError = {
          status: error.response?.status || 500,
          message: handleErrors(error),
          errors : (error.response?.data as any)
        };
        return Promise.reject(apiError);
      }
    );
  }

  
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', credentials);
    
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
      const response = await this.api.post<AuthResponse>('/auth/register', data);

    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  }

  async getUsers(): Promise<User[]> {
    const response = await this.api.get<User[]>('/users');
    return response.data.map((user) => ({
      ...user,
      isActive: user.isActive ?? true,
    }));
  }

  async updateUser(userId: string, data: UserUpdateRequest): Promise<User> {
    const response = await this.api.put<User>(`/users/${userId}`, data);
    return {
      ...response.data,
      isActive: response.data.isActive ?? true,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    await this.api.delete(`/users/${userId}`);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  getStoredUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }


  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }
}

export default new ApiService();
