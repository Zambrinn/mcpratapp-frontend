import { FormEvent, useMemo, useState } from 'react';
import { Alert, AppLayout, Button, Card, Icon, Input, Modal, PageHeader, StatCard, StatusBadge } from '@components/index';
import apiService from '@services/api';
import { useCommercialData } from '../hooks/useCommercialData';
import { Client, UserRole } from '../types/index';
import {
  clientCity,
  clientInitial,
  formatCpf,
  formatCnpj,
  formatWhatsApp,
  isCurrentMonth,
  isValidCpf,
  isValidCnpj,
  onlyDigits,
} from '../utils/erp';

type PersonType = 'PF' | 'PJ';

interface ClientFormData {
  name: string;
  whatsappNumber: string;
  email: string;
  address: string;
  companyName: string;
  personType: PersonType;
  cpf: string;
  cnpj: string;
}

const emptyClientForm: ClientFormData = {
  name: '',
  whatsappNumber: '',
  email: '',
  address: '',
  companyName: '',
  personType: 'PF',
  cpf: '',
  cnpj: '',
};

interface ClientErrors {
  name?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  document?: string;
}

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
  const [clientForm, setClientForm] = useState<ClientFormData>(emptyClientForm);
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const isAdmin = user?.role === UserRole.ADMIN;

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) =>
      [
        client.name,
        client.email,
        client.address,
        client.whatsappNumber,
        client.companyName ?? '',
        client.cpf ?? '',
        client.cnpj ?? '',
      ]
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
    setClientErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setClientErrors({});
    const isPj = Boolean(client.cnpj && !client.cpf);
    setClientForm({
      name: client.name,
      whatsappNumber: formatWhatsApp(client.whatsappNumber),
      email: client.email,
      address: client.address,
      companyName: client.companyName ?? '',
      personType: isPj ? 'PJ' : 'PF',
      cpf: client.cpf ? formatCpf(client.cpf) : '',
      cnpj: client.cnpj ? formatCnpj(client.cnpj) : '',
    });
    setIsModalOpen(true);
  };

  const validateClient = (): boolean => {
    const errors: ClientErrors = {};

    if (!clientForm.name.trim()) {
      errors.name = 'Nome é obrigatório.';
    } else if (clientForm.name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres.';
    }

    const cleanWhats = onlyDigits(clientForm.whatsappNumber);
    if (!cleanWhats) {
      errors.whatsappNumber = 'WhatsApp é obrigatório.';
    } else if (cleanWhats.length < 10 || cleanWhats.length > 11) {
      errors.whatsappNumber = 'Número deve ter 10 ou 11 dígitos (com DDD).';
    }

    if (!clientForm.email.trim()) {
      errors.email = 'E-mail é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email.trim())) {
      errors.email = 'Informe um e-mail válido contendo @ e domínio.';
    }

    if (!clientForm.address.trim()) {
      errors.address = 'Endereço é obrigatório.';
    }

    if (clientForm.personType === 'PF') {
      const cleanCpf = onlyDigits(clientForm.cpf);
      if (!cleanCpf) {
        errors.document = 'CPF é obrigatório para Pessoa Física.';
      } else if (!isValidCpf(cleanCpf)) {
        errors.document = 'CPF inválido. Verifique os dígitos.';
      }
    } else {
      const cleanCnpj = onlyDigits(clientForm.cnpj);
      if (!cleanCnpj) {
        errors.document = 'CNPJ é obrigatório para Pessoa Jurídica.';
      } else if (!isValidCnpj(cleanCnpj)) {
        errors.document = 'CNPJ inválido. Verifique os dígitos.';
      }
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveClient = (event: FormEvent) => {
    event.preventDefault();
    if (!validateClient()) return;

    void runAction(async () => {
      const cleanCpf = clientForm.personType === 'PF' ? onlyDigits(clientForm.cpf) : null;
      const cleanCnpj = clientForm.personType === 'PJ' ? onlyDigits(clientForm.cnpj) : null;

      const payload = {
        name: clientForm.name.trim(),
        whatsappNumber: onlyDigits(clientForm.whatsappNumber),
        email: clientForm.email.trim().toLowerCase(),
        address: clientForm.address.trim(),
        companyName: clientForm.companyName.trim() || null,
        cpf: cleanCpf || null,
        cnpj: cleanCnpj || null,
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
      setMessage(editingClient ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.');
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
      <section className="space-y-6">
        <PageHeader
          title="Clientes"
          subtitle="Gerencie sua carteira de clientes MCPRATA"
          actions={
            <Button onClick={openCreate} className="shadow-sm">
              <Icon name="plus" className="h-4 w-4" />
              Novo Cliente
            </Button>
          }
        />

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="users" label="Total de Clientes" value={clients.length} tone="primary" />
          <StatCard icon="check" label="Clientes Ativos" value={activeCount} tone="green" />
          <StatCard icon="x" label="Clientes Inativos" value={inactiveCount} tone="slate" />
          <StatCard icon="calendar" label="Novos este mês" value={newThisMonth} tone="yellow" />
        </div>

        <Card>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar clientes por nome, CPF/CNPJ, email ou cidade..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-xs transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 text-left">Cliente</th>
                  <th className="px-5 py-4 text-left">Documento</th>
                  <th className="px-5 py-4 text-left">Cidade</th>
                  <th className="px-5 py-4 text-left">Contato</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">{isAdmin ? 'Ações' : 'Ação'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                        Carregando clientes...
                      </div>
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const docFormatted = client.cpf
                      ? formatCpf(client.cpf)
                      : client.cnpj
                      ? formatCnpj(client.cnpj)
                      : '-';

                    return (
                      <tr key={client.id} className="transition hover:bg-teal-50/20 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-700 shadow-xs dark:bg-teal-950/50 dark:text-teal-300 ring-1 ring-teal-500/20">
                              {clientInitial(client.name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{client.name}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {client.companyName ? `${client.companyName} · ` : ''}
                                {client.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {docFormatted}
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{clientCity(client.address)}</td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {formatWhatsApp(client.whatsappNumber)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={client.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(client)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-slate-800 dark:hover:text-primary-400"
                              title="Editar cliente"
                              aria-label="Editar cliente"
                            >
                              <Icon name="edit" className="h-4 w-4" />
                            </button>
                            {isAdmin && client.isActive && (
                              <button
                                type="button"
                                onClick={() => setDeletingClient(client)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                                title="Desativar cliente"
                                aria-label="Desativar cliente"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </button>
                            )}
                            {isAdmin && !client.isActive && (
                              <button
                                type="button"
                                onClick={() => restoreClient(client)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                                title="Reativar cliente"
                                aria-label="Reativar cliente"
                              >
                                <Icon name="check" className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Modal de Criação / Edição de Cliente com Validação */}
      {isModalOpen && (
        <Modal
          title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
          onClose={() => setIsModalOpen(false)}
          widthClass="max-w-2xl"
        >
          <form className="space-y-4" onSubmit={saveClient}>
            {/* Toggle Tipo de Pessoa (PF vs PJ) */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/90 p-1 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setClientForm((c) => ({ ...c, personType: 'PF' }));
                  if (clientErrors.document) setClientErrors((e) => ({ ...e, document: undefined }));
                }}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  clientForm.personType === 'PF'
                    ? 'bg-white text-teal-700 dark:bg-slate-700 dark:text-teal-300 ring-1 ring-slate-200/80 dark:ring-slate-600'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Pessoa Física (CPF)
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientForm((c) => ({ ...c, personType: 'PJ' }));
                  if (clientErrors.document) setClientErrors((e) => ({ ...e, document: undefined }));
                }}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  clientForm.personType === 'PJ'
                    ? 'bg-white text-teal-700 dark:bg-slate-700 dark:text-teal-300 ring-1 ring-slate-200/80 dark:ring-slate-600'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Pessoa Jurídica (CNPJ)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={clientForm.personType === 'PF' ? 'Nome Completo' : 'Nome / Razão Social'}
                required
                value={clientForm.name}
                error={clientErrors.name}
                placeholder="Ex: Maria da Silva"
                onChange={(event) => {
                  setClientForm((current) => ({ ...current, name: event.target.value }));
                  if (clientErrors.name) setClientErrors((e) => ({ ...e, name: undefined }));
                }}
              />

              {clientForm.personType === 'PF' ? (
                <Input
                  label="CPF"
                  required
                  placeholder="000.000.000-00"
                  value={clientForm.cpf}
                  error={clientErrors.document}
                  onChange={(event) => {
                    setClientForm((current) => ({
                      ...current,
                      cpf: formatCpf(event.target.value),
                    }));
                    if (clientErrors.document) setClientErrors((e) => ({ ...e, document: undefined }));
                  }}
                />
              ) : (
                <Input
                  label="CNPJ"
                  required
                  placeholder="00.000.000/0000-00"
                  value={clientForm.cnpj}
                  error={clientErrors.document}
                  onChange={(event) => {
                    setClientForm((current) => ({
                      ...current,
                      cnpj: formatCnpj(event.target.value),
                    }));
                    if (clientErrors.document) setClientErrors((e) => ({ ...e, document: undefined }));
                  }}
                />
              )}

              <Input
                label="WhatsApp"
                required
                placeholder="(11) 99999-9999"
                value={clientForm.whatsappNumber}
                error={clientErrors.whatsappNumber}
                onChange={(event) => {
                  setClientForm((current) => ({
                    ...current,
                    whatsappNumber: formatWhatsApp(event.target.value),
                  }));
                  if (clientErrors.whatsappNumber) setClientErrors((e) => ({ ...e, whatsappNumber: undefined }));
                }}
              />

              <Input
                label="E-mail"
                required
                type="email"
                placeholder="cliente@email.com"
                value={clientForm.email}
                error={clientErrors.email}
                onChange={(event) => {
                  setClientForm((current) => ({ ...current, email: event.target.value }));
                  if (clientErrors.email) setClientErrors((e) => ({ ...e, email: undefined }));
                }}
              />

              <div className="md:col-span-2">
                <Input
                  label="Nome Fantasia / Empresa (Opcional)"
                  placeholder="Ex: Joalheria Brilho Pratas"
                  value={clientForm.companyName}
                  onChange={(event) => setClientForm((current) => ({ ...current, companyName: event.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Endereço Completo"
                  required
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  value={clientForm.address}
                  error={clientErrors.address}
                  onChange={(event) => {
                    setClientForm((current) => ({ ...current, address: event.target.value }));
                    if (clientErrors.address) setClientErrors((e) => ({ ...e, address: undefined }));
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isWorking}>
                {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deletingClient && (
        <Modal title="Desativar Cliente" onClose={() => setDeletingClient(null)} widthClass="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tem certeza que deseja desativar <strong>{deletingClient.name}</strong>? O cliente poderá ser reativado a qualquer momento.
            </p>
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={() => setDeletingClient(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={deleteClient} isLoading={isWorking}>
                Desativar Cliente
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
