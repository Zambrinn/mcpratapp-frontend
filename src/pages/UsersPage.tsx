import { FormEvent, useEffect, useMemo, useState } from 'react';
import apiService from '@services/api';
import { Alert, AppLayout, Button, Card, Icon, Input, Modal, PageHeader, StatCard } from '@components/index';
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
      <section className="space-y-6">
        <PageHeader
          title="Gerenciar Usuários"
          subtitle="Controle de acessos, administradores e vendedores da rede MCPRATA"
          actions={
            <Button onClick={openCreate}>
              <Icon name="plus" className="h-4 w-4" />
              Novo Usuário
            </Button>
          }
        />

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="users" label="Total na Página" value={stats.total} tone="primary" />
          <StatCard icon="check" label="Usuários Ativos" value={stats.active} tone="green" />
          <StatCard icon="clock" label="Inativos" value={stats.inactive} tone="yellow" />
          <StatCard icon="trash" label="Excluídos" value={stats.deleted} tone="slate" />
        </div>

        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-xs transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole | '')}
              aria-label="Filtrar por perfil"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-xs transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-200"
            >
              <option value="">Todos os perfis</option>
              <option value={UserRole.ADMIN}>ADMIN</option>
              <option value={UserRole.VENDOR}>VENDOR</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as UserStatus | '')}
              aria-label="Filtrar por status"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-xs transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-200"
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
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 text-left">Usuário</th>
                  <th className="px-5 py-4 text-left">Email</th>
                  <th className="px-5 py-4 text-left">Perfil</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Criado em</th>
                  <th className="px-5 py-4 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                        Carregando usuários...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  users.map((currentUser) => (
                    <tr key={currentUser.id} className="transition hover:bg-teal-50/20 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-700 shadow-xs dark:bg-teal-950/50 dark:text-teal-300 ring-1 ring-teal-500/20">
                            {currentUser.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{currentUser.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{currentUser.email}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {currentUser.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            currentUser.status === UserStatus.ACTIVE
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60'
                          }`}
                        >
                          {statusLabel(currentUser.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{formatDate(currentUser.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
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
        <Modal
          title={isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          onClose={() => setIsModalOpen(false)}
          widthClass="max-w-xl"
        >
          <form onSubmit={saveUser} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                label="Nome"
                required
                value={form.name}
                placeholder="Nome do usuário"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                label="Email"
                required
                type="email"
                value={form.email}
                placeholder="usuario@mcprata.com.br"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Perfil de Acesso
                </label>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, role: event.target.value as UserRole }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value={UserRole.VENDOR}>Vendedor</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>
              <Input
                label={isEditing ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                type="password"
                placeholder={isEditing ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSaving}>
                {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirmingUser && (
        <Modal
          title="Deletar Usuário"
          onClose={() => setConfirmingUser(null)}
          widthClass="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Esta ação remove permanentemente o usuário <strong>{confirmingUser.name}</strong> ({confirmingUser.email}).
            </p>
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setConfirmingUser(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => void deleteUser()}>
                Deletar Permanentemente
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
