import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input, Button, Card, Alert } from '@components/index';
import { RegisterRequest, UserRole } from '../types/index';

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
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
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
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-2xl mb-3 shadow-xl shadow-teal-500/20 ring-1 ring-white/20">
            <span className="text-white font-black text-xl tracking-tight">MC</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            MCPRATA
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mt-1">
            Cadastro de Novo Vendedor
          </p>
        </div>

        <Card className="mb-6 shadow-xl dark:border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Criar Conta</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Preencha os dados para acessar o catálogo
              </p>
            </div>

            {error && (
              <Alert
                type="error"
                message={error}
                onClose={clearError}
              />
            )}

            <div>
              <Input
                label="Nome Completo"
                type="text"
                name="name"
                placeholder="Seu nome"
                value={formData.name}
                onChange={handleChange}
                error={validationErrors.name}
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                label="Email Comercial"
                type="email"
                name="email"
                placeholder="seu_email@exemplo.com"
                value={formData.email}
                onChange={handleChange}
                error={validationErrors.email}
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                label="Senha"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={validationErrors.password}
                disabled={isLoading}
                helperText="Mínimo de 6 caracteres"
              />
            </div>

            <div>
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
              className="mt-2"
            >
              Criar Conta de Vendedor
            </Button>

            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              Já possui uma conta?{' '}
              <Link
                to="/login"
                className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
              >
                Acesse aqui
              </Link>
            </div>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600">
          © 2026 MCPRATA. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
