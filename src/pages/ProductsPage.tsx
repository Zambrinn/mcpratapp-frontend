import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, AppLayout, Button, Card, Icon, Input, Modal, PageHeader } from '@components/index';
import apiService from '@services/api';
import { useCommercialData } from '../hooks/useCommercialData';
import { Product, UserRole } from '../types/index';
import {
  availableStock,
  categoryTone,
  displayProductDescription,
  inferProductCategory,
  formatSku,
  generateNextSku,
  isValidSku,
  money,
  PRODUCT_CATEGORIES,
  productFormDescription,
  productDescriptionWithCategory,
  productPrice,
  shortId,
} from '../utils/erp';

const emptyProductForm = {
  sku: '',
  name: '',
  category: 'Anéis',
  description: '',
  totalQuantity: 0,
};

interface FormErrors {
  sku?: string;
  name?: string;
  totalQuantity?: string;
  price?: string;
  productId?: string;
  vendorId?: string;
}

export function ProductsPage() {
  const {
    user,
    products,
    activeProducts,
    vendors,
    productVendors,
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
  const [category, setCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [linkForm, setLinkForm] = useState({
    productId: '',
    vendorId: '',
    price: 0,
  });

  const isAdmin = user?.role === UserRole.ADMIN;

  // Inicializa vendor padrão no linkForm
  useEffect(() => {
    if (!linkForm.vendorId) {
      const defaultVendorId = user?.role === UserRole.VENDOR ? user.id : vendors[0]?.id || '';
      setLinkForm((current) => ({
        ...current,
        vendorId: current.vendorId || defaultVendorId,
        productId: current.productId || activeProducts[0]?.id || '',
      }));
    }
  }, [user, vendors, activeProducts, linkForm.vendorId]);

  const categories = useMemo(
    () => Array.from(new Set([...PRODUCT_CATEGORIES, ...products.map((product) => inferProductCategory(product))])).sort(),
    [products],
  );

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.isActive && availableStock(product) <= 5),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const productCategory = inferProductCategory(product);
      const matchesCategory = !category || productCategory === category;
      const matchesSearch =
        !term ||
        [product.name, product.sku, product.description ?? '', productCategory]
          .join(' ')
          .toLowerCase()
          .includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);

  const openCreate = () => {
    if (!isAdmin) return;
    setEditingProduct(null);
    const initialCategory = 'Anéis';
    const suggestedSku = generateNextSku(initialCategory, products);
    setProductForm({
      ...emptyProductForm,
      category: initialCategory,
      sku: suggestedSku,
    });
    setFormErrors({});
    const defaultVendorId = vendors[0]?.id || '';
    setLinkForm({
      productId: '',
      vendorId: defaultVendorId,
      price: 0,
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (newCategory: string) => {
    setProductForm((current) => {
      // Se estiver criando uma nova peça e o SKU estiver vazio ou seguindo o padrão, sugere o novo
      const isNew = !editingProduct;
      const shouldUpdateSku = isNew && (!current.sku || /^MC-[A-Z]{3,4}-\d+$/i.test(current.sku));
      return {
        ...current,
        category: newCategory,
        sku: shouldUpdateSku ? generateNextSku(newCategory, products) : current.sku,
      };
    });
  };

  const handleSuggestSku = () => {
    const next = generateNextSku(productForm.category, products);
    setProductForm((current) => ({ ...current, sku: next }));
    if (formErrors.sku) setFormErrors((e) => ({ ...e, sku: undefined }));
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormErrors({});
    setProductForm({
      sku: product.sku,
      name: product.name,
      category: inferProductCategory(product),
      description: productFormDescription(product.description),
      totalQuantity: product.totalQuantity,
    });

    // Procura se já existe vínculo ativo
    const targetVendorId = user?.role === UserRole.VENDOR ? user.id : vendors[0]?.id || '';
    const existingLink = productVendors.find(
      (pv) => pv.productId === product.id && pv.vendorId === targetVendorId && pv.isActive,
    );

    setLinkForm({
      productId: product.id,
      vendorId: targetVendorId,
      price: existingLink ? existingLink.price : 0,
    });
    setIsModalOpen(true);
  };

  const openVendorPriceModal = (product?: Product) => {
    setFormErrors({});
    const targetProductId = product ? product.id : activeProducts[0]?.id || '';
    const targetVendorId = user?.role === UserRole.VENDOR ? user.id : vendors[0]?.id || '';

    const existingLink = productVendors.find(
      (pv) => pv.productId === targetProductId && pv.vendorId === targetVendorId && pv.isActive,
    );

    setLinkForm({
      productId: targetProductId,
      vendorId: targetVendorId,
      price: existingLink ? existingLink.price : 0,
    });
    setIsLinkModalOpen(true);
  };

  // Atualiza o preço exibido no formulário quando altera o vendedor selecionado
  const handleVendorChangeInProductModal = (selectedVendorId: string) => {
    const targetProductId = editingProduct ? editingProduct.id : '';
    const existingLink = targetProductId
      ? productVendors.find(
          (pv) => pv.productId === targetProductId && pv.vendorId === selectedVendorId && pv.isActive,
        )
      : null;

    setLinkForm((current) => ({
      ...current,
      vendorId: selectedVendorId,
      price: existingLink ? existingLink.price : 0,
    }));
  };

  const validateProductForm = (): boolean => {
    const errors: FormErrors = {};
    const cleanSku = productForm.sku.trim();
    if (!cleanSku) {
      errors.sku = 'SKU é obrigatório.';
    } else if (!isValidSku(cleanSku)) {
      errors.sku = 'Padrão inválido. Exemplo recomendado: MC-ANE-001';
    }
    if (!productForm.name.trim()) {
      errors.name = 'Nome da peça é obrigatório.';
    } else if (productForm.name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres.';
    }
    if (productForm.totalQuantity === undefined || productForm.totalQuantity === null || isNaN(productForm.totalQuantity)) {
      errors.totalQuantity = 'Quantidade é obrigatória.';
    } else if (productForm.totalQuantity < 0) {
      errors.totalQuantity = 'Quantidade não pode ser negativa.';
    }
    if (linkForm.price < 0) {
      errors.price = 'Preço não pode ser negativo.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!validateProductForm()) return;

    void runAction(async () => {
      const payload = {
        sku: productForm.sku.trim(),
        name: productForm.name.trim(),
        description: productDescriptionWithCategory(productForm.category, productForm.description),
        totalQuantity: Number(productForm.totalQuantity),
      };

      const product = editingProduct
        ? await apiService.updateProduct(editingProduct.id, payload)
        : await apiService.createProduct(payload);

      // Gerencia o vínculo do produto com o vendedor selecionado (se informado preço > 0)
      if (linkForm.vendorId && Number(linkForm.price) > 0) {
        const existingLink = productVendors.find(
          (pv) => pv.productId === product.id && pv.vendorId === linkForm.vendorId,
        );

        if (existingLink) {
          await apiService.updateProductVendor(existingLink.id, {
            price: Number(linkForm.price),
          });
        } else {
          await apiService.createProductVendor({
            productId: product.id,
            vendorId: linkForm.vendorId,
            price: Number(linkForm.price),
          });
        }
      }

      setProductForm(emptyProductForm);
      setEditingProduct(null);
      setLinkForm({ productId: '', vendorId: '', price: 0 });
      setIsModalOpen(false);
      await loadReferenceData();
      setMessage(editingProduct ? 'Produto e vínculo atualizados.' : 'Produto cadastrado com sucesso.');
    });
  };

  const saveVendorLinkOnly = (event: FormEvent) => {
    event.preventDefault();
    const errors: FormErrors = {};
    if (!linkForm.productId) {
      errors.productId = 'Selecione uma peça.';
    }
    if (!linkForm.vendorId) {
      errors.vendorId = 'Selecione um vendedor.';
    }
    if (linkForm.price <= 0) {
      errors.price = 'Informe um preço válido maior que zero.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    void runAction(async () => {
      const existingLink = productVendors.find(
        (pv) => pv.productId === linkForm.productId && pv.vendorId === linkForm.vendorId,
      );

      if (existingLink) {
        await apiService.updateProductVendor(existingLink.id, {
          price: Number(linkForm.price),
        });
      } else {
        await apiService.createProductVendor({
          productId: linkForm.productId,
          vendorId: linkForm.vendorId,
          price: Number(linkForm.price),
        });
      }

      setIsLinkModalOpen(false);
      await loadReferenceData();
      setMessage('Vínculo de preço salvo com sucesso.');
    });
  };

  const deleteProduct = () => {
    if (!deletingProduct) return;

    void runAction(async () => {
      await apiService.deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      await loadReferenceData();
      setMessage('Produto desativado.');
    });
  };

  const restoreProduct = (product: Product) => {
    void runAction(async () => {
      await apiService.restoreProduct(product.id);
      await loadReferenceData();
      setMessage('Produto reativado.');
    });
  };

  return (
    <AppLayout>
      <section className="space-y-6">
        <PageHeader
          title="Catálogo de Peças"
          subtitle="Gerencie as peças de prata 925 e preços praticados"
          actions={
            <div className="flex items-center gap-2.5">
              {isAdmin ? (
                <>
                  <Button onClick={openCreate} className="shadow-sm">
                    <Icon name="plus" className="h-4 w-4" />
                    Nova Peça
                  </Button>
                  <Button variant="secondary" onClick={() => openVendorPriceModal()}>
                    <Icon name="wallet" className="h-4 w-4 text-primary-500" />
                    Vincular Preço
                  </Button>
                </>
              ) : (
                <Button onClick={() => openVendorPriceModal()} className="shadow-sm">
                  <Icon name="wallet" className="h-4 w-4" />
                  Vincular Preço
                </Button>
              )}
            </div>
          }
        />

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {lowStockProducts.length > 0 && (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-amber-900 shadow-sm backdrop-blur dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex gap-3">
              <Icon name="warning" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold text-sm">Atenção: Peças com estoque baixo</p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                  {lowStockProducts.length} peça(s) estão abaixo ou no estoque mínimo (5 un.)
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {lowStockProducts.slice(0, 5).map((product) => (
                    <span
                      key={product.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300/60 bg-amber-100/70 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      {product.name} ({availableStock(product)} un.)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, SKU ou categoria..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-xs transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filtrar por categoria"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-xs transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-200"
            >
              <option value="">Todas Categorias</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 text-left">Peça</th>
                  <th className="px-5 py-4 text-left">SKU</th>
                  <th className="px-5 py-4 text-left">Categoria</th>
                  <th className="px-5 py-4 text-left">Material</th>
                  <th className="px-5 py-4 text-left">Preço Praticado</th>
                  <th className="px-5 py-4 text-left">Estoque</th>
                  <th className="px-5 py-4 text-left">{isAdmin ? 'Ações' : 'Ação'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                        Carregando peças...
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      Nenhuma peça encontrada no catálogo.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const productCategory = inferProductCategory(product);
                    const stock = availableStock(product);
                    const price = productPrice(product.id, productVendors);

                    return (
                      <tr key={product.id} className="transition hover:bg-teal-50/20 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 shadow-xs dark:bg-teal-950/50 dark:text-teal-300 ring-1 ring-teal-500/20">
                              <Icon name="box" className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</p>
                                {!product.isActive && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    Inativo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {displayProductDescription(product.description) || shortId(product.id)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">{product.sku}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryTone(productCategory)}`}>
                            {productCategory}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">Prata 925</td>
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          {price === null ? (
                            <span className="text-xs font-normal text-slate-400">Não vinculado</span>
                          ) : (
                            money(price)
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                'rounded-full px-2.5 py-1 text-xs font-semibold',
                                stock <= 5
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300',
                              ].join(' ')}
                            >
                              {stock} un.
                            </span>
                            {stock <= 5 && <Icon name="warning" className="h-4 w-4 text-rose-500" />}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            {isAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(product)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-slate-800 dark:hover:text-primary-400"
                                  title="Editar peça e vínculo"
                                  aria-label="Editar produto"
                                >
                                  <Icon name="edit" className="h-4 w-4" />
                                </button>
                                {product.isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingProduct(product)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                                    title="Desativar peça"
                                    aria-label="Desativar produto"
                                  >
                                    <Icon name="trash" className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => restoreProduct(product)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                                    title="Reativar peça"
                                    aria-label="Reativar produto"
                                  >
                                    <Icon name="check" className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            ) : (
                              /* Vendedor só tem a ação de vincular/ajustar seu preço */
                              <button
                                type="button"
                                onClick={() => openVendorPriceModal(product)}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-slate-800"
                                title="Definir ou editar meu preço"
                              >
                                <Icon name="wallet" className="h-4 w-4" />
                                <span>Definir Preço</span>
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

      {/* Modal Principal (Admin): Cadastro e Edição de Peça + Vínculo */}
      {isModalOpen && isAdmin && (
        <Modal
          title={editingProduct ? 'Editar Peça e Vínculo' : 'Cadastrar Nova Peça'}
          onClose={() => setIsModalOpen(false)}
          widthClass="max-w-2xl"
        >
          <form className="space-y-4" onSubmit={saveProduct}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Categoria <span className="text-teal-600">*</span>
                </label>
                <select
                  value={productForm.category}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  aria-label="Categoria da peça"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100"
                >
                  {PRODUCT_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    SKU <span className="text-teal-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestSku}
                    className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition"
                  >
                    ✨ Sugerir SKU
                  </button>
                </div>
                <Input
                  required
                  value={productForm.sku}
                  error={formErrors.sku}
                  helperText="Exemplo: MC-ANE-001 (Caixa alta automática)"
                  placeholder="MC-ANE-001"
                  onChange={(event) => {
                    const formatted = formatSku(event.target.value);
                    setProductForm((current) => ({ ...current, sku: formatted }));
                    if (formErrors.sku) setFormErrors((e) => ({ ...e, sku: undefined }));
                  }}
                />
              </div>

              <Input
                label="Nome da Peça"
                required
                value={productForm.name}
                error={formErrors.name}
                placeholder="Ex: Anel Solitário Prata 925"
                onChange={(event) => {
                  setProductForm((current) => ({ ...current, name: event.target.value }));
                  if (formErrors.name) setFormErrors((e) => ({ ...e, name: undefined }));
                }}
              />
              <Input
                label="Quantidade em Estoque"
                required
                type="number"
                min={0}
                value={productForm.totalQuantity || ''}
                error={formErrors.totalQuantity}
                onChange={(event) => {
                  setProductForm((current) => ({ ...current, totalQuantity: Number(event.target.value) }));
                  if (formErrors.totalQuantity) setFormErrors((e) => ({ ...e, totalQuantity: undefined }));
                }}
              />
              <div className="md:col-span-2">
                <Input
                  label="Descrição (Opcional)"
                  value={productForm.description}
                  placeholder="Detalhes sobre design, acabamento ou pedraria..."
                  onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
            </div>

            {/* Seção de Vínculo: Vendedor e Preço Praticado */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Preço e Vínculo de Vendedor
                </span>
                <span className="text-xs text-slate-400">Pode vincular agora ou depois</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Vendedor
                  </label>
                  <select
                    value={linkForm.vendorId}
                    onChange={(event) => handleVendorChangeInProductModal(event.target.value)}
                    aria-label="Selecionar vendedor"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Selecione um vendedor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.role})
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Preço Praticado (R$)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={linkForm.price || ''}
                  error={formErrors.price}
                  placeholder="0,00"
                  onChange={(event) => {
                    setLinkForm((current) => ({ ...current, price: Number(event.target.value) }));
                    if (formErrors.price) setFormErrors((e) => ({ ...e, price: undefined }));
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isWorking}>
                {editingProduct ? 'Salvar Alterações' : 'Cadastrar Peça'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Dedicado de Vínculo de Preço (Para Vendor ou Admin avulso) */}
      {isLinkModalOpen && (
        <Modal
          title={isAdmin ? 'Vincular Preço ao Vendedor' : 'Definir Meu Preço de Venda'}
          onClose={() => setIsLinkModalOpen(false)}
          widthClass="max-w-xl"
        >
          <form className="space-y-5" onSubmit={saveVendorLinkOnly}>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-50/60 p-4.5 dark:border-teal-500/20 dark:bg-teal-950/30">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-600/20">
                  <Icon name="wallet" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isAdmin ? 'Tabela de Preço por Vendedor' : 'Preço de Venda Praticado'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Defina o valor em reais (R$) pelo qual esta peça será comercializada.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Peça do Catálogo <span className="text-teal-600 dark:text-teal-400">*</span>
                </label>
                <select
                  value={linkForm.productId}
                  onChange={(event) => {
                    const newProdId = event.target.value;
                    const currentLink = productVendors.find(
                      (pv) => pv.productId === newProdId && pv.vendorId === linkForm.vendorId && pv.isActive,
                    );
                    setLinkForm((current) => ({
                      ...current,
                      productId: newProdId,
                      price: currentLink ? currentLink.price : current.price,
                    }));
                    if (formErrors.productId) setFormErrors((e) => ({ ...e, productId: undefined }));
                  }}
                  aria-label="Selecionar peça do catálogo"
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-100 ${
                    formErrors.productId
                      ? 'border-rose-400 focus:ring-rose-400/30'
                      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/30 dark:border-slate-700/80'
                  }`}
                >
                  <option value="">Selecione uma peça</option>
                  {activeProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} · {product.name}
                    </option>
                  ))}
                </select>
                {formErrors.productId && (
                  <p className="mt-1.5 text-xs font-medium text-rose-500">{formErrors.productId}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Vendedor Responsável <span className="text-teal-600 dark:text-teal-400">*</span>
                </label>
                <select
                  value={linkForm.vendorId}
                  disabled={!isAdmin}
                  onChange={(event) => {
                    const newVendorId = event.target.value;
                    const currentLink = productVendors.find(
                      (pv) => pv.productId === linkForm.productId && pv.vendorId === newVendorId && pv.isActive,
                    );
                    setLinkForm((current) => ({
                      ...current,
                      vendorId: newVendorId,
                      price: currentLink ? currentLink.price : current.price,
                    }));
                  }}
                  aria-label="Selecionar vendedor"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800/60"
                >
                  {isAdmin ? (
                    <>
                      <option value="">Selecione o vendedor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.role})
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value={user?.id}>{user?.name || 'Eu mesmo (Vendedor)'}</option>
                  )}
                </select>
              </div>

              <Input
                label="Preço Praticado (R$)"
                required
                type="number"
                min={0}
                step="0.01"
                value={linkForm.price || ''}
                error={formErrors.price}
                placeholder="0,00"
                onChange={(event) => {
                  setLinkForm((current) => ({ ...current, price: Number(event.target.value) }));
                  if (formErrors.price) setFormErrors((e) => ({ ...e, price: undefined }));
                }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setIsLinkModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isWorking}>
                Salvar Preço
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Desativação de Produto (Apenas Admin) */}
      {deletingProduct && isAdmin && (
        <Modal title="Desativar Peça do Catálogo" onClose={() => setDeletingProduct(null)} widthClass="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tem certeza que deseja desativar a peça <strong>{deletingProduct.name}</strong>? Ela deixará de aparecer para novas vendas, mas poderá ser reativada a qualquer momento.
            </p>
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={() => setDeletingProduct(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={deleteProduct} isLoading={isWorking}>
                Desativar Peça
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
