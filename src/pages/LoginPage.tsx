import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input, Button, Card, Alert } from '@components/index';
import { LoginRequest } from '../types/index';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const { showToast } = useToast();

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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      showToast('Login realizado com sucesso.');
      navigate('/');
    } catch (err) {
      console.error('Erro ao fazer login:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Atelier Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-2xl mb-3 shadow-xl shadow-teal-500/20 ring-1 ring-white/20">
            <span className="text-white font-black text-xl tracking-tight">MC</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            MCPRATA
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mt-1">
            Jóias 925 • Gestão Comercial ERP
          </p>
        </div>

        <Card className="mb-6 shadow-xl dark:border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Acessar Sistema</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Informe suas credenciais de acesso
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
                label="Email"
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
              />
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              className="mt-2"
            >
              Entrar no ERP
            </Button>

            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              Não possui conta de vendedor?{' '}
              <Link
                to="/register"
                className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
              >
                Cadastre-se aqui
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
