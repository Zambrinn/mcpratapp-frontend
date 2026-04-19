import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Button, Card, Alert } from '@components/index';
import { LoginRequest } from '../types/index';


export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'O email é obrigatório';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      console.error('Erro ao fazer login:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-400 rounded-full mb-4">
            <span className="text-white font-bold text-xl">MC</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MCPRATA</h1>
          <p className="text-gray-600 mt-2">Sistema ERP</p>
        </div>

        <Card className="mb-6">
          <form onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Entrar</h2>

            {error && (            
              <Alert
                type="error"
                message={error}
                onClose={clearError}
              />
            )}

            <div className="mb-4">
              <Input
                label="Usuário ou Email"
                type="text"
                name="email"
                placeholder="seu_usuario ou seu_email@example.com"
                value={formData.email}
                onChange={handleChange}
                error={validationErrors.email}
                disabled={isLoading}
              />
            </div>

            <div className="mb-6">
              <Input
                label="Senha"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={validationErrors.password}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              className="mb-4"
            >
              Entrar
            </Button>

            <div className="text-center text-sm text-gray-600">
              Não tem uma conta?{' '}
              <Link
                to="/register"
                className="text-primary-400 hover:text-primary-500 font-medium"
              >
                Registre-se aqui
              </Link>
            </div>
          </form>
        </Card>

        <p className="text-center text-xs text-gray-500">
          © 2026 MCPRATA. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
