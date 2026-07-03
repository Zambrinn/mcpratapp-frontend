import { FormEvent, useMemo, useState } from 'react';
import { Alert, AppLayout, Button, Card, Icon, Input, Modal, PageHeader, StatCard, StatusBadge } from '@components/index';
import apiService from '@services/api';
import { useCommercialData } from '../hooks/useCommercialData';
import { Client, UserRole } from '../types/index';
import { clientCity, clientInitial, formatWhatsApp, isCurrentMonth, onlyDigits } from '../utils/erp';

const emptyClientForm = {
  name: '',
  whatsappNumber: '',
  email: '',
  address: '',
  companyName: '',
};

export function ClientsPage() {
  const {
    user,
    clients,
    isLoading,
    isWorking,
    message,
    error,
    setMessage,
    setError,
    loadReferenceData,
    runAction,
  } = useCommercialData();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const isAdmin = user?.role === UserRole.ADMIN;

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) =>
      [client.name, client.email, client.address, client.whatsappNumber, client.companyName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [clients, search]);

  const activeCount = clients.filter((client) => client.isActive).length;
  const inactiveCount = clients.length - activeCount;
  const newThisMonth = clients.filter((client) => isCurrentMonth(client.createdAt)).length;

  const openCreate = () => {
    setEditingClient(null);
    setClientForm(emptyClientForm);
    setIsModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      whatsappNumber: formatWhatsApp(client.whatsappNumber),
      email: client.email,
      address: client.address,
      companyName: client.companyName ?? '',
    });
    setIsModalOpen(true);
  };

  const saveClient = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      const payload = {
        ...clientForm,
        whatsappNumber: onlyDigits(clientForm.whatsappNumber),
        companyName: clientForm.companyName || null,
      };

      if (editingClient) {
        await apiService.updateClient(editingClient.id, payload);
      } else {
        await apiService.createClient(payload);
      }

      setClientForm(emptyClientForm);
      setEditingClient(null);
      setIsModalOpen(false);
      await loadReferenceData();
      setMessage(editingClient ? 'Cliente atualizado.' : 'Cliente criado.');
    });
  };

  const deleteClient = () => {
    if (!deletingClient) return;

    void runAction(async () => {
      await apiService.deleteClient(deletingClient.id);
      setDeletingClient(null);
      await loadReferenceData();
      setMessage('Cliente desativado.');
    });
  };

  const restoreClient = (client: Client) => {
    void runAction(async () => {
      await apiService.restoreClient(client.id);
      await loadReferenceData();
      setMessage('Cliente reativado.');
    });
  };

  return (
    <AppLayout>
      <section className="space-y-5">
        <PageHeader
          title="Clientes"
          subtitle="Gerencie sua base de clientes MCPRATA"
          actions={
            <Button onClick={openCreate}>
              <Icon name="plus" className="h-4 w-4" />
              Novo Cliente
            </Button>
          }
        />

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total" value={clients.length} />
          <StatCard label="Ativos" value={activeCount} tone="green" />
          <StatCard label="Inativos" value={inactiveCount} tone="slate" />
          <StatCard label="Novos este mês" value={newThisMonth} />
        </div>

        <Card className="border border-slate-100">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar clientes por nome, email ou cidade..."
              className="pl-10"
            />
          </div>
        </Card>

        <Card className="overflow-hidden border border-slate-100 p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-[#f5faf8] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left">Cliente</th>
                  <th className="px-5 py-4 text-left">Cidade</th>
                  <th className="px-5 py-4 text-left">Contato</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      Carregando clientes...
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="border-t border-slate-100 hover:bg-[#f8fbfa]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-600">
                            {clientInitial(client.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{client.name}</p>
                            {client.companyName && <p className="text-xs text-slate-400">{client.companyName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{clientCity(client.address)}</td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-slate-600">
                          <p className="flex items-center gap-2">
                            <Icon name="mail" className="h-4 w-4 text-primary-400" />
                            {client.email}
                          </p>
                          <p className="flex items-center gap-2">
                            <Icon name="phone" className="h-4 w-4 text-primary-400" />
                            {formatWhatsApp(client.whatsappNumber)}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={client.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(client)}
                            className="text-primary-500 transition hover:text-primary-700"
                            title="Editar cliente"
                            aria-label="Editar cliente"
                          >
                            <Icon name="edit" className="h-5 w-5" />
                          </button>
                          {isAdmin && client.isActive && (
                            <button
                              type="button"
                              onClick={() => setDeletingClient(client)}
                              className="text-rose-500 transition hover:text-rose-700"
                              title="Desativar cliente"
                              aria-label="Desativar cliente"
                            >
                              <Icon name="trash" className="h-5 w-5" />
                            </button>
                          )}
                          {isAdmin && !client.isActive && (
                            <button
                              type="button"
                              onClick={() => restoreClient(client)}
                              className="text-emerald-600 transition hover:text-emerald-700"
                              title="Reativar cliente"
                              aria-label="Reativar cliente"
                            >
                              <Icon name="check" className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {isModalOpen && (
        <Modal title={editingClient ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setIsModalOpen(false)}>
          <form className="space-y-4" onSubmit={saveClient}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Nome"
                required
                value={clientForm.name}
                onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                label="WhatsApp"
                required
                placeholder="(__) _____-____"
                value={clientForm.whatsappNumber}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    whatsappNumber: formatWhatsApp(event.target.value),
                  }))
                }
              />
              <Input
                label="Email"
                required
                type="email"
                value={clientForm.email}
                onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))}
              />
              <Input
                label="Empresa"
                value={clientForm.companyName}
                onChange={(event) => setClientForm((current) => ({ ...current, companyName: event.target.value }))}
              />
              <div className="md:col-span-2">
                <Input
                  label="Endereço"
                  required
                  value={clientForm.address}
                  onChange={(event) => setClientForm((current) => ({ ...current, address: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isWorking}>
                {editingClient ? 'Salvar cliente' : 'Criar cliente'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deletingClient && (
        <Modal title="Desativar Cliente" onClose={() => setDeletingClient(null)} widthClass="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja desativar <strong>{deletingClient.name}</strong>? O cliente poderá ser reativado depois.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeletingClient(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={deleteClient} isLoading={isWorking}>
                Desativar cliente
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
