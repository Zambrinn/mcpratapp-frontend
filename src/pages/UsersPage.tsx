import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '@services/api';
import { useAuth } from '../context/AuthContext';
import { User, UserRole, UserStats, UserUpdateRequest } from '../types/index';
import { Button, Alert } from '@components/index';

type RoleFilter = 'ALL' | UserRole;

function formatDate(date?: string): string {
  if (!date) {
    return '-';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('pt-BR');
}

function getUserStats(users: User[]): UserStats {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let active = 0;
  let inactive = 0;
  let newThisMonth = 0;

  users.forEach((user) => {
    const isActive = user.isActive !== false;
    if (isActive) {
      active += 1;
    } else {
      inactive += 1;
    }

    if (user.createdAt) {
      const createdAt = new Date(user.createdAt);
      if (
        !Number.isNaN(createdAt.getTime()) &&
        createdAt.getMonth() === currentMonth &&
        createdAt.getFullYear() === currentYear
      ) {
        newThisMonth += 1;
      }
    }
  });

  return {
    total: users.length,
    active,
    inactive,
    newThisMonth,
  };
}

export function UsersPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserUpdateRequest>({
    name: '',
    email: '',
    password: '',
    role: UserRole.VENDOR,
  });

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getUsers();
      setUsers(response);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar usuários.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const stats = useMemo(() => getUserStats(users), [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((currentUser) => {
      const matchesSearch =
        query.length === 0 ||
        currentUser.name.toLowerCase().includes(query) ||
        currentUser.email.toLowerCase().includes(query) ||
        currentUser.role.toLowerCase().includes(query);

      const matchesRole = roleFilter === 'ALL' || currentUser.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const startEdit = (selectedUser: User) => {
    setEditingUser(selectedUser);
    setEditError(null);
    setEditForm({
      name: selectedUser.name,
      email: selectedUser.email,
      password: '',
      role: selectedUser.role,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditError(null);
    setEditForm({
      name: '',
      email: '',
      password: '',
      role: UserRole.VENDOR,
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) {
      return;
    }

    // Validar antes de enviar
    const isValidEmail = (email: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    if (!editForm.name.trim()) {
      setEditError('Nome é obrigatório e não pode estar vazio.');
      return;
    }

    if (!editForm.email.trim()) {
      setEditError('Email é obrigatório e não pode estar vazio.');
      return;
    }

    if (!isValidEmail(editForm.email)) {
      setEditError('Email inválido. Use o formato: exemplo@email.com');
      return;
    }

    if (editForm.password && editForm.password.length < 6) {
      setEditError('Se informar senha, ela precisa ter pelo menos 6 caracteres.');
      return;
    }

    const payload: UserUpdateRequest = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      ...(editForm.password?.trim() ? { password: editForm.password } : {}),
    };

    setIsSaving(true);
    setEditError(null);
    try {
      const updatedUser = await apiService.updateUser(editingUser.id, payload);
      setUsers((current) =>
        current.map((item) => (item.id === updatedUser.id ? updatedUser : item))
      );
      cancelEdit();
    } catch (err: any) {
      setEditError(err.message || 'Não foi possível atualizar o usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (selectedUser: User) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o usuário ${selectedUser.name}?`
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await apiService.deleteUser(selectedUser.id);
      setUsers((current) => current.filter((item) => item.id !== selectedUser.id));
    } catch (err: any) {
      setError(err.message || 'Não foi possível deletar o usuário.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#eef3f2] text-slate-700">
      <div className="flex min-h-screen">
        <aside className="w-[220px] bg-primary-400 text-white flex flex-col justify-between">
          <div>
            <div className="px-5 py-6 border-b border-primary-500">
              <p className="font-bold text-xl tracking-wide">MCPRATA</p>
              <p className="text-xs text-primary-100">Sistema ERP</p>
            </div>

            <nav className="p-3 space-y-2 text-sm">                
              {/* <button type="button" className="w-full text-left px-4 py-3 rounded-lg hover:bg-primary-500/70 transition">
                Dashboard
              </button>
              <button type="button" className="w-full text-left px-4 py-3 rounded-lg hover:bg-primary-500/70 transition">
                Clientes
              </button> */} 
              { // Depois que for feita a logica de dashboard e clientes, apenas descomente isso aqui 
              }
              <button
                type="button"
                className="w-full text-left px-4 py-3 rounded-lg bg-white text-primary-700 font-semibold"
              >
                Usuários
              </button>
            </nav>
          </div>

          <div className="p-3 border-t border-primary-500">
            <Button variant="secondary" fullWidth onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="h-[74px] bg-white border-b border-slate-200 px-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-200 text-primary-800 font-bold flex items-center justify-center">
                {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
            </div>
          </header>

          <section className="p-6 space-y-5">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-4xl font-semibold text-slate-800">Usuários</h1>
                <p className="text-slate-500 mt-1">Gerencie os usuários cadastrados no sistema</p>
              </div>
              <Button onClick={() => void loadUsers()}>Atualizar Lista</Button>
            </div>

            {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <p className="text-3xl font-bold text-primary-700">{stats.total}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                <p className="text-sm text-slate-500">Ativos</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <p className="text-3xl font-bold text-slate-600">{stats.inactive}</p>
                <p className="text-sm text-slate-500">Inativos</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <p className="text-3xl font-bold text-primary-600">{stats.newThisMonth}</p>
                <p className="text-sm text-slate-500">Novos este mês</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, email ou role..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="ALL">Todos os perfis</option>
                  <option value={UserRole.ADMIN}>ADMIN</option>
                  <option value={UserRole.VENDOR}>VENDOR</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-3">Usuário</th>
                      <th className="text-left px-4 py-3">Email</th>
                      <th className="text-left px-4 py-3">Role</th>
                      <th className="text-left px-4 py-3">Criado em</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Carregando usuários...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((currentUser) => (
                        <tr key={currentUser.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                                {currentUser.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-700">{currentUser.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{currentUser.email}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {currentUser.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(currentUser.createdAt)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                currentUser.isActive !== false
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {currentUser.isActive !== false ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="text-primary-700 hover:text-primary-900"
                                onClick={() => startEdit(currentUser)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => handleDeleteUser(currentUser)}
                              >
                                Deletar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/35 flex items-center justify-center p-4 z-20">
          <div className="bg-white w-full max-w-xl rounded-xl p-6 border border-slate-200 shadow-lg space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Editar Usuário</h2>

            {editError && (
              <Alert 
                type="error" 
                message={editError} 
                onClose={() => setEditError(null)} 
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      role: event.target.value as UserRole,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value={UserRole.ADMIN}>ADMIN</option>
                  <option value={UserRole.VENDOR}>VENDOR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Nova senha (opcional)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, password: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Deixe em branco para manter"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={cancelEdit} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateUser} isLoading={isSaving}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
