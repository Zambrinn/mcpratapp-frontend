import { FormEvent, useEffect, useMemo, useState } from 'react';
import apiService from '@services/api';
import { Alert, AppLayout, Button, Card, Input } from '@components/index';
import { useAuth } from '../context/AuthContext';
import {
  PageResponse,
  User,
  UserCreateRequest,
  UserRole,
  UserStats,
  UserStatus,
  UserUpdateRequest,
} from '../types/index';

type UserForm = UserCreateRequest & { id?: string };

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: UserRole.VENDOR,
};

const emptyPage: PageResponse<User> = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 10,
  number: 0,
  first: true,
  last: true,
};

function formatDate(date?: string): string {
  if (!date) return '-';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-BR');
}

function getStats(users: User[]): UserStats {
  return users.reduce(
    (stats, user) => ({
      total: stats.total + 1,
      active: stats.active + (user.status === UserStatus.ACTIVE ? 1 : 0),
      inactive: stats.inactive + (user.status === UserStatus.INACTIVE ? 1 : 0),
      deleted: stats.deleted + (user.status === UserStatus.DELETED ? 1 : 0),
    }),
    { total: 0, active: 0, inactive: 0, deleted: 0 },
  );
}

function statusLabel(status: UserStatus): string {
  return {
    [UserStatus.ACTIVE]: 'Ativo',
    [UserStatus.INACTIVE]: 'Inativo',
    [UserStatus.DELETED]: 'Excluído',
  }[status];
}

function validateForm(form: UserForm, isEditing: boolean): string | null {
  if (!form.name.trim()) return 'Nome é obrigatório.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email inválido.';
  if (!isEditing && form.password.length < 6) return 'Senha deve ter pelo menos 6 caracteres.';
  if (isEditing && form.password && form.password.length < 6) {
    return 'Se informar uma nova senha, ela deve ter pelo menos 6 caracteres.';
  }
  return null;
}

export function UsersPage() {
  const { user: authenticatedUser } = useAuth();
  const [page, setPage] = useState<PageResponse<User>>(emptyPage);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [pageNumber, setPageNumber] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmingUser, setConfirmingUser] = useState<User | null>(null);

  const stats = useMemo(() => getStats(users), [users]);
  const isEditing = Boolean(form.id);

  const loadUsers = async (nextPage = pageNumber) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getUsers({
        search: search.trim() || undefined,
        role,
        status,
        page: nextPage,
        size: 10,
      });
      setPage(response);
      setUsers(response.content);
      setPageNumber(response.number);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível carregar usuários.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers(0);
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setIsModalOpen(true);
    setError(null);
  };

  const openEdit = (user: User) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validation = validateForm(form, isEditing);
    if (validation) {
      setError(validation);
      return;
    }

    setIsSaving(true);
    try {
      if (form.id) {
        const payload: UserUpdateRequest = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          ...(form.password.trim() ? { password: form.password } : {}),
        };
        await apiService.updateUser(form.id, payload);
        setMessage('Usuário atualizado.');
      } else {
        await apiService.createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
        setMessage('Usuário criado.');
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      await loadUsers(pageNumber);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível salvar o usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const deactivateUser = async (user: User) => {
    if (user.id === authenticatedUser?.id) {
      setError('Você não pode desativar o próprio usuário logado.');
      return;
    }

    setError(null);
    setMessage(null);
    try {
      await apiService.deactivateUser(user.id);
      setMessage('Usuário desativado.');
      await loadUsers(pageNumber);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível desativar o usuário.');
    }
  };

  const restoreUser = async (user: User) => {
    setError(null);
    setMessage(null);
    try {
      await apiService.restoreUser(user.id);
      setMessage('Usuário restaurado.');
      await loadUsers(pageNumber);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível restaurar o usuário.');
    }
  };

  const deleteUser = async () => {
    if (!confirmingUser) return;
    if (confirmingUser.id === authenticatedUser?.id) {
      setError('Você não pode deletar o próprio usuário logado.');
      setConfirmingUser(null);
      return;
    }

    setError(null);
    setMessage(null);
    try {
      await apiService.deleteUser(confirmingUser.id);
      setConfirmingUser(null);
      setMessage('Usuário deletado.');
      await loadUsers(pageNumber);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível deletar o usuário.');
    }
  };

  const applyFilters = () => {
    setPageNumber(0);
    void loadUsers(0);
  };

  return (
    <AppLayout>
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Gerenciar Usuários</h1>
            <p className="mt-1 text-slate-500">
              Criação, edição, bloqueio, restauração e exclusão de acessos do ERP.
            </p>
          </div>
          <Button onClick={openCreate}>Novo usuário</Button>
        </div>

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border border-slate-200 shadow-sm">
            <p className="text-3xl font-bold text-primary-700">{stats.total}</p>
            <p className="text-sm text-slate-500">Na página</p>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
            <p className="text-sm text-slate-500">Ativos</p>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <p className="text-3xl font-bold text-amber-600">{stats.inactive}</p>
            <p className="text-sm text-slate-500">Inativos</p>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <p className="text-3xl font-bold text-slate-600">{stats.deleted}</p>
            <p className="text-sm text-slate-500">Excluídos</p>
          </Card>
        </div>

        <Card className="border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou email"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole | '')}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">Todos os perfis</option>
              <option value={UserRole.ADMIN}>ADMIN</option>
              <option value={UserRole.VENDOR}>VENDOR</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as UserStatus | '')}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">Todos os status</option>
              <option value={UserStatus.ACTIVE}>Ativo</option>
              <option value={UserStatus.INACTIVE}>Inativo</option>
              <option value={UserStatus.DELETED}>Excluído</option>
            </select>
            <Button onClick={applyFilters} isLoading={isLoading}>
              Filtrar
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Perfil</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Criado em</th>
                  <th className="px-4 py-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Carregando usuários...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  users.map((currentUser) => (
                    <tr key={currentUser.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{currentUser.name}</td>
                      <td className="px-4 py-3 text-slate-600">{currentUser.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {currentUser.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'rounded-full px-2 py-1 text-xs font-semibold',
                            currentUser.status === UserStatus.ACTIVE
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-700',
                          ].join(' ')}
                        >
                          {statusLabel(currentUser.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(currentUser.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(currentUser)}>
                            Editar
                          </Button>
                          {currentUser.status === UserStatus.ACTIVE ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={currentUser.id === authenticatedUser?.id}
                              onClick={() => void deactivateUser(currentUser)}
                            >
                              Desativar
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => void restoreUser(currentUser)}>
                              Restaurar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={currentUser.id === authenticatedUser?.id}
                            onClick={() => setConfirmingUser(currentUser)}
                          >
                            Deletar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Página {page.totalPages === 0 ? 0 : page.number + 1} de {page.totalPages} ·{' '}
              {page.totalElements} registros
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page.first || isLoading}
                onClick={() => void loadUsers(page.number - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page.last || isLoading}
                onClick={() => void loadUsers(page.number + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
          <form
            onSubmit={saveUser}
            className="w-full max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2 className="text-xl font-semibold text-slate-800">
              {isEditing ? 'Editar usuário' : 'Novo usuário'}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                label="Nome"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Perfil</label>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, role: event.target.value as UserRole }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value={UserRole.VENDOR}>Vendedor</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>
              <Input
                label={isEditing ? 'Nova senha (opcional)' : 'Senha inicial'}
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Salvar
              </Button>
            </div>
          </form>
        </div>
      )}

      {confirmingUser && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800">Deletar usuário?</h2>
            <p className="text-sm text-slate-600">
              Esta ação remove permanentemente <strong>{confirmingUser.name}</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmingUser(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => void deleteUser()}>
                Deletar
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
