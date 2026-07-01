import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input, Button, Card, Alert } from '@components/index';
import { RegisterRequest, UserRole } from '../types/index';

/**
 * 
 * Validações:
 * - Todos os campos obrigatórios
 * - Email válido
 * - Senhas iguais
 * - Senha com mínimo de caracteres
 */

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<RegisterRequest>({
    name: '',
    email: '',
    password: '',
    role: UserRole.VENDOR,
  });
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome de usuário é obrigatório';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome de usuário deve ter pelo menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!passwordConfirm) {
      newErrors.passwordConfirm = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== passwordConfirm) {
      newErrors.passwordConfirm = 'Senhas não coincidem';
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'passwordConfirm') {
      setPasswordConfirm(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await register({ ...formData, role: UserRole.VENDOR });
      showToast('Conta de vendedor criada com sucesso.');
      navigate('/login');
    } catch (err) {
      console.error('Erro ao registrar:', err);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar Conta</h2>

            {error && (
              <Alert
                type="error"
                message={error}
                onClose={clearError}
              />
            )}

            <div className="mb-4">
              <Input
                label="Nome de Usuário"
                type="text"
                name="name"
                placeholder="seu_usuario"
                value={formData.name}
                onChange={handleChange}
                error={validationErrors.name}
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="seu_email@example.com"
                value={formData.email}
                onChange={handleChange}
                error={validationErrors.email}
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <Input
                label="Senha"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={validationErrors.password}
                disabled={isLoading}
                helperText="Mínimo 6 caracteres"
              />
            </div>

            <div className="mb-4">
              <Input
                label="Confirmar Senha"
                type="password"
                name="passwordConfirm"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={handleChange}
                error={validationErrors.passwordConfirm}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              className="mb-4"
            >
              Criar Conta
            </Button>

            <div className="text-center text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link
                to="/login"
                className="text-primary-400 hover:text-primary-500 font-medium"
              >
                Acesse aqui
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
