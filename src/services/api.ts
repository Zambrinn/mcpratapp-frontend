import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, ApiError } from '../types/index';

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
          message: 
            error.response?.status == 401
                ? "Email ou senha incorretos"
                : error.message,
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
      console.log('/POST - Enviando para /auth/register:', data);
      const response = await this.api.post<AuthResponse>('/auth/register', data);
      console.log('Resposta recebida:', response)

    
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
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
