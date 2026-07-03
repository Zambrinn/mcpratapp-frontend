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
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [linkForm, setLinkForm] = useState({
    productId: '',
    vendorId: user?.role === UserRole.VENDOR ? user.id : '',
    price: 0,
  });
  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    setLinkForm((current) => ({
      ...current,
      productId: current.productId || activeProducts[0]?.id || '',
      vendorId: current.vendorId || vendors[0]?.id || '',
    }));
  }, [activeProducts, vendors]);

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
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setIsModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      sku: product.sku,
      name: product.name,
      category: inferProductCategory(product),
      description: productFormDescription(product.description),
      totalQuantity: product.totalQuantity,
    });
    setIsModalOpen(true);
  };

  const saveProduct = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      const payload = {
        sku: productForm.sku,
        name: productForm.name,
        description: productDescriptionWithCategory(productForm.category, productForm.description),
        totalQuantity: Number(productForm.totalQuantity),
      };

      const product = editingProduct
        ? await apiService.updateProduct(editingProduct.id, payload)
        : await apiService.createProduct(payload);

      if (!editingProduct && linkForm.vendorId && Number(linkForm.price) > 0) {
        await apiService.createProductVendor({
          productId: product.id,
          vendorId: linkForm.vendorId,
          price: Number(linkForm.price),
        });
      }

      setProductForm(emptyProductForm);
      setEditingProduct(null);
      setLinkForm((current) => ({ ...current, productId: product.id, price: 0 }));
      setIsModalOpen(false);
      await loadReferenceData();
      setMessage(editingProduct ? 'Produto atualizado.' : 'Produto criado.');
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

  const createProductVendor = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      if (!linkForm.productId || !linkForm.vendorId) {
        throw new Error('Selecione produto e vendedor.');
      }

      await apiService.createProductVendor({
        productId: linkForm.productId,
        vendorId: linkForm.vendorId,
        price: Number(linkForm.price),
      });
      setLinkForm((current) => ({ ...current, price: 0 }));
      await loadReferenceData();
      setMessage('Vínculo produto-vendedor criado.');
    });
  };

  return (
    <AppLayout>
      <section className="space-y-5">
        <PageHeader
          title="Produtos"
          subtitle="Catálogo de bijuterias de prata MCPRATA"
          actions={
            <Button onClick={openCreate}>
              <Icon name="plus" className="h-4 w-4" />
              Nova Peça
            </Button>
          }
        />

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {lowStockProducts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <div className="flex gap-3">
              <Icon name="warning" className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Atenção: Produtos com estoque baixo</p>
                <p className="mt-1 text-sm">{lowStockProducts.length} peça(s) estão abaixo do estoque mínimo</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lowStockProducts.slice(0, 4).map((product) => (
                    <span key={product.id} className="rounded bg-amber-100 px-2 py-1 text-xs">
                      {product.name} ({availableStock(product)} un.)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <Card className="border border-slate-100">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_150px]">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, SKU ou categoria..."
                className="pl-10"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden border border-slate-100 p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-[#f5faf8] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left">Produto</th>
                  <th className="px-5 py-4 text-left">SKU</th>
                  <th className="px-5 py-4 text-left">Categoria</th>
                  <th className="px-5 py-4 text-left">Material</th>
                  <th className="px-5 py-4 text-left">Preço</th>
                  <th className="px-5 py-4 text-left">Estoque</th>
                  <th className="px-5 py-4 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      Carregando produtos...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const productCategory = inferProductCategory(product);
                    const stock = availableStock(product);
                    const price = productPrice(product.id, productVendors);

                    return (
                      <tr key={product.id} className="border-t border-slate-100 hover:bg-[#f8fbfa]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                              <Icon name="box" className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{product.name}</p>
                                {!product.isActive && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                    Inativo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                {displayProductDescription(product.description) || shortId(product.id)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{product.sku}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryTone(productCategory)}`}>
                            {productCategory}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">Prata 925</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{price === null ? '-' : money(price)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                'rounded-full px-2.5 py-1 text-xs font-semibold',
                                stock <= 5 ? 'bg-rose-50 text-rose-700' : 'bg-primary-50 text-primary-700',
                              ].join(' ')}
                            >
                              {stock} un.
                            </span>
                            {stock <= 5 && <Icon name="warning" className="h-4 w-4 text-rose-500" />}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(product)}
                              className="text-primary-500 transition hover:text-primary-700"
                              title="Editar produto"
                              aria-label="Editar produto"
                            >
                              <Icon name="edit" className="h-5 w-5" />
                            </button>
                            {isAdmin && product.isActive && (
                              <button
                                type="button"
                                onClick={() => setDeletingProduct(product)}
                                className="text-rose-500 transition hover:text-rose-700"
                                title="Desativar produto"
                                aria-label="Desativar produto"
                              >
                                <Icon name="trash" className="h-5 w-5" />
                              </button>
                            )}
                            {isAdmin && !product.isActive && (
                              <button
                                type="button"
                                onClick={() => restoreProduct(product)}
                                className="text-emerald-600 transition hover:text-emerald-700"
                                title="Reativar produto"
                                aria-label="Reativar produto"
                              >
                                <Icon name="check" className="h-5 w-5" />
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

      {isModalOpen && (
        <Modal title={editingProduct ? 'Editar Peça' : 'Nova Peça'} onClose={() => setIsModalOpen(false)} widthClass="max-w-3xl">
          <div className={editingProduct ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 gap-6 lg:grid-cols-2'}>
            <form className="space-y-4" onSubmit={saveProduct}>
              <h3 className="font-semibold text-slate-900">Dados da peça</h3>
              <Input
                label="SKU"
                required
                value={productForm.sku}
                onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))}
              />
              <Input
                label="Nome"
                required
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Categoria</label>
                <select
                  value={productForm.category}
                  onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  {PRODUCT_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Descrição"
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
              />
              <Input
                label="Quantidade"
                required
                type="number"
                min={0}
                value={productForm.totalQuantity}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, totalQuantity: Number(event.target.value) }))
                }
              />

              {!editingProduct && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Vendedor</label>
                    <select
                      value={linkForm.vendorId}
                      onChange={(event) => setLinkForm((current) => ({ ...current, vendorId: event.target.value }))}
                      disabled={user?.role === UserRole.VENDOR}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-100"
                    >
                      <option value="">Vendedor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Preço"
                    type="number"
                    min={0}
                    step="0.01"
                    value={linkForm.price}
                    onChange={(event) => setLinkForm((current) => ({ ...current, price: Number(event.target.value) }))}
                  />
                </div>
              )}

              <Button type="submit" fullWidth isLoading={isWorking}>
                {editingProduct ? 'Salvar produto' : 'Criar produto'}
              </Button>
            </form>

            {!editingProduct && (
              <form className="space-y-4 rounded-lg bg-slate-50 p-4" onSubmit={createProductVendor}>
                <h3 className="font-semibold text-slate-900">Preço de peça existente</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Produto</label>
                  <select
                    value={linkForm.productId}
                    onChange={(event) => setLinkForm((current) => ({ ...current, productId: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <option value="">Produto</option>
                    {activeProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} · {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Vendedor</label>
                  <select
                    value={linkForm.vendorId}
                    onChange={(event) => setLinkForm((current) => ({ ...current, vendorId: event.target.value }))}
                    disabled={user?.role === UserRole.VENDOR}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-100"
                  >
                    <option value="">Vendedor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Preço praticado"
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={linkForm.price}
                  onChange={(event) => setLinkForm((current) => ({ ...current, price: Number(event.target.value) }))}
                />
                <Button type="submit" variant="secondary" fullWidth isLoading={isWorking}>
                  Criar vínculo
                </Button>
              </form>
            )}
          </div>
        </Modal>
      )}

      {deletingProduct && (
        <Modal title="Desativar Produto" onClose={() => setDeletingProduct(null)} widthClass="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja desativar <strong>{deletingProduct.name}</strong>? O produto poderá ser reativado depois.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeletingProduct(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={deleteProduct} isLoading={isWorking}>
                Desativar produto
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
