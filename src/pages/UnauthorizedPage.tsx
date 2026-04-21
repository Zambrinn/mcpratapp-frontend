import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@components/index';
import { useAuth } from '../context/AuthContext';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const goToLogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Acesso não autorizado</h1>
        <p className="text-slate-600">
          Esta área é restrita para administradores.
        </p>
        <Button onClick={goToLogin}>Voltar para login</Button>
      </Card>
    </div>
  );
}
