import React, { useState } from 'react';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  FileText,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import { useConvora } from '../../context/ConvoraContext';
import { formatDzd, getOrderStatusLabel } from '../../lib/i18n/translations';
import type { OrderStatus } from '../../types/domain';

export function ProductsView() {
  const { locale, snapshot, createProduct } = useConvora();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Create Product Form
  const [sku, setSku] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [category, setCategory] = useState('Modest Fashion');
  const [priceDzd, setPriceDzd] = useState('5900');
  const [stockMode, setStockMode] = useState<'verified' | 'unverified'>(
    'verified'
  );
  const [stockQty, setStockQty] = useState('10');
  const [formError, setFormError] = useState('');

  if (!snapshot) return null;

  const filtered = snapshot.products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name_ar.toLowerCase().includes(q) ||
      p.name_fr.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    );
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!sku.trim() || !nameAr.trim() || !nameFr.trim()) {
      setFormError(
        locale === 'ar'
          ? 'يرجى تعبئة الرمز (SKU) واسم المنتج بالعربية والفرنسية.'
          : 'Veuillez renseigner le SKU et les noms en arabe et en français.'
      );
      return;
    }

    const ok = await createProduct({
      sku,
      name_ar: nameAr,
      name_fr: nameFr,
      description_ar: '',
      description_fr: '',
      category,
      price_dzd: Number(priceDzd) || 0,
      stock_quantity: stockMode === 'unverified' ? null : Number(stockQty) || 0,
      ai_visible: true,
      variants: [
        {
          id: `var_${Date.now()}`,
          size: 'Standard (38-42)',
          color: 'أساسي / Standard',
          stock: stockMode === 'unverified' ? null : Number(stockQty) || 0,
        },
      ],
    });

    if (ok) {
      setShowModal(false);
      setSku('');
      setNameAr('');
      setNameFr('');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'كتالوج المنتجات والمخزون الموثق'
              : 'Catalogue Produits & Inventaire Vérifié'}
          </h1>
          <p className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'الذكاء الاصطناعي يعتمد حصرياً على الأسعار وحالات التوفر المسجلة هنا.'
              : 'L’IA se base exclusivement sur les prix et stocks vérifiés ci-dessous.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="h-9 px-4 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>
            {locale === 'ar' ? 'إضافة منتج جديد' : 'Nouveau produit'}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#E5E8E2] rounded-xl p-3.5 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md flex items-center">
          <Search className="w-4 h-4 text-[#737A74] absolute start-3 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              locale === 'ar'
                ? 'بحث باسم المنتج أو الرمز (SKU)...'
                : 'Rechercher par nom ou référence SKU...'
            }
            className="w-full h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg ps-9 pe-3 text-xs"
          />
        </div>
        <span className="text-xs text-[#737A74] font-num">
          {filtered.length} {locale === 'ar' ? 'منتجات' : 'produits'}
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#E5E8E2] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#F8F7F2] text-[#737A74] border-b border-[#E5E8E2]">
              <tr>
                <th className="py-3 px-4 text-start font-medium">SKU</th>
                <th className="py-3 px-4 text-start font-medium">
                  {locale === 'ar' ? 'اسم المنتج' : 'Produit'}
                </th>
                <th className="py-3 px-4 text-start font-medium">
                  {locale === 'ar' ? 'التصنيف' : 'Catégorie'}
                </th>
                <th className="py-3 px-4 text-start font-medium">
                  {locale === 'ar' ? 'المقاسات والألوان' : 'Variantes'}
                </th>
                <th className="py-3 px-4 text-start font-medium">
                  {locale === 'ar'
                    ? 'حالة المخزون (توثيق AI)'
                    : 'État du stock (Vérification IA)'}
                </th>
                <th className="py-3 px-4 text-end font-medium">
                  {locale === 'ar' ? 'السعر المعتمد' : 'Prix vérifié'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E2]">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-[#F8F7F2]/60">
                  <td className="py-3 px-4 font-code font-semibold text-[#20231F]">
                    {prod.sku}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#20231F]">
                        {locale === 'ar' ? prod.name_ar : prod.name_fr}
                      </span>
                      <span className="text-[11px] text-[#737A74]">
                        {locale === 'ar' ? prod.name_fr : prod.name_ar}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#737A74]">{prod.category}</td>
                  <td className="py-3 px-4 text-[#737A74]">
                    {prod.variants
                      .map((v) => `${v.size} (${v.color})`)
                      .join(' · ') || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {prod.stock_quantity === null ? (
                      <span className="text-[#D97706] font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {locale === 'ar'
                            ? 'المخزون غير مؤكد (ينبه المساعد الذكي العميل)'
                            : 'Stock non vérifié (Avertissement IA actif)'}
                        </span>
                      </span>
                    ) : prod.stock_quantity > 0 ? (
                      <span className="text-[#2E7D32] font-medium font-num">
                        {locale === 'ar'
                          ? `متوفر ومؤكد (${prod.stock_quantity} قطعة)`
                          : `En stock vérifié (${prod.stock_quantity} unités)`}
                      </span>
                    ) : (
                      <span className="text-[#DC2626] font-medium">
                        {locale === 'ar' ? 'نفد المخزون (0)' : 'Rupture (0)'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-end font-num font-semibold text-[#20231F]">
                    {formatDzd(prod.price_dzd, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'ar' ? 'إضافة منتج جديد' : 'Nouveau produit'}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#E5E8E2] rounded-xl max-w-lg w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-3">
              <h2 className="text-base font-semibold text-[#20231F]">
                {locale === 'ar'
                  ? 'إضافة منتج جديد للكتالوج'
                  : 'Ajouter un produit au catalogue'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-[#737A74] hover:text-[#20231F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] p-2.5 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="prod-sku"
                    className="text-xs font-semibold text-[#20231F]"
                  >
                    {locale === 'ar' ? 'رمز المنتج (SKU)' : 'Référence SKU'}
                  </label>
                  <input
                    id="prod-sku"
                    type="text"
                    dir="ltr"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="CSB-NEW-05"
                    className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="prod-price"
                    className="text-xs font-semibold text-[#20231F]"
                  >
                    {locale === 'ar' ? 'السعر بالدينار (DZD)' : 'Prix (DZD)'}
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    dir="ltr"
                    value={priceDzd}
                    onChange={(e) => setPriceDzd(e.target.value)}
                    className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs font-num"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="prod-name-ar"
                  className="text-xs font-semibold text-[#20231F]"
                >
                  {locale === 'ar' ? 'اسم المنتج بالعربية' : 'Nom en arabe'}
                </label>
                <input
                  id="prod-name-ar"
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="قفطان جزائري مطرز بالحرير"
                  className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="prod-name-fr"
                  className="text-xs font-semibold text-[#20231F]"
                >
                  {locale === 'ar'
                    ? 'اسم المنتج بالفرنسية'
                    : 'Nom du produit en français'}
                </label>
                <input
                  id="prod-name-fr"
                  type="text"
                  dir="ltr"
                  value={nameFr}
                  onChange={(e) => setNameFr(e.target.value)}
                  placeholder="Caftan Algérois Brodé Soie"
                  className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="prod-stock-mode"
                    className="text-xs font-semibold text-[#20231F]"
                  >
                    {locale === 'ar'
                      ? 'حالة التحقق من المخزون'
                      : 'Vérification du stock'}
                  </label>
                  <select
                    id="prod-stock-mode"
                    value={stockMode}
                    onChange={(e) =>
                      setStockMode(e.target.value as 'verified' | 'unverified')
                    }
                    className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs"
                  >
                    <option value="verified">
                      {locale === 'ar' ? 'مخزون مؤكد' : 'Stock vérifié'}
                    </option>
                    <option value="unverified">
                      {locale === 'ar'
                        ? 'غير مؤكد (تفعيل تحذير AI)'
                        : 'Non vérifié (Avertissement IA)'}
                    </option>
                  </select>
                </div>

                {stockMode === 'verified' && (
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="prod-stock-qty"
                      className="text-xs font-semibold text-[#20231F]"
                    >
                      {locale === 'ar' ? 'الكمية المتوفرة' : 'Quantité en stock'}
                    </label>
                    <input
                      id="prod-stock-qty"
                      type="number"
                      min="0"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs font-num"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E8E2]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 bg-white border border-[#E5E8E2] rounded-lg text-xs font-medium text-[#20231F]"
                >
                  {locale === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-[#202C28] text-white rounded-lg text-xs font-medium hover:bg-[#2C3D38]"
                >
                  {locale === 'ar' ? 'حفظ المنتج' : 'Enregistrer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrdersView() {
  const { locale, snapshot, transitionOrder } = useConvora();
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  if (!snapshot) return null;

  const filteredOrders = snapshot.orders.filter((o) =>
    statusFilter === 'all' ? true : o.status === statusFilter
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'إدارة الطلبيات ومسودات الشراء'
              : 'Gestion des Commandes & Brouillons'}
          </h1>
          <p className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'التمييز الصارم بين مسودات الذكاء الاصطناعي غير المؤكدة والطلبيات المؤكدة الجاهزة للشحن.'
              : 'Distinction stricte entre les brouillons préparés par l’IA et les commandes confirmées.'}
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div
          role="group"
          aria-label="Order status filter"
          className="flex flex-wrap items-center gap-1 bg-white border border-[#E5E8E2] p-1 rounded-lg text-xs"
        >
          {(
            [
              { id: 'all', ar: 'الكل', fr: 'Toutes' },
              { id: 'draft', ar: 'مسودات للمراجعة', fr: 'Brouillons' },
              { id: 'confirmed', ar: 'مؤكدة', fr: 'Confirmées' },
              { id: 'shipped', ar: 'مشحونة', fr: 'Expédiées' },
              { id: 'delivered', ar: 'تم التسليم', fr: 'Livrées' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#202C28] text-white'
                  : 'text-[#737A74] hover:text-[#20231F]'
              }`}
            >
              {locale === 'ar' ? tab.ar : tab.fr}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-4">
        {filteredOrders.map((ord) => (
          <div
            key={ord.id}
            className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E8E2] pb-3">
              <div className="flex items-center gap-3">
                <span className="font-code text-sm font-semibold text-[#20231F]">
                  {ord.order_number}
                </span>
                <span className="text-[#737A74]">·</span>
                <span
                  className={`text-xs font-semibold ${
                    ord.status === 'draft'
                      ? 'text-[#D97706]'
                      : ord.status === 'confirmed' ||
                        ord.status === 'delivered'
                      ? 'text-[#2E7D32]'
                      : 'text-[#737A74]'
                  }`}
                >
                  {getOrderStatusLabel(ord.status, locale)}
                </span>
                {ord.is_ai_draft && (
                  <>
                    <span className="text-[#737A74]">·</span>
                    <span className="text-xs text-[#B8A27A] font-medium">
                      {locale === 'ar'
                        ? 'مسودة أعدها المساعد الذكي — تتطلب تأكيد التاجر'
                        : 'Brouillon IA — Requiert confirmation marchande'}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                {ord.status === 'draft' && (
                  <>
                    <button
                      type="button"
                      onClick={() => transitionOrder(ord.id, 'confirmed')}
                      className="h-8 px-3 bg-[#202C28] hover:bg-[#2C3D38] text-white rounded-lg font-medium flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {locale === 'ar'
                          ? 'تأكيد الطلب رسمياً'
                          : 'Confirmer la commande'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => transitionOrder(ord.id, 'cancelled')}
                      className="h-8 px-3 bg-white border border-[#E5E8E2] text-[#DC2626] rounded-lg font-medium hover:bg-[#F8F7F2]"
                    >
                      {locale === 'ar' ? 'إلغاء المسودة' : 'Annuler'}
                    </button>
                  </>
                )}

                {ord.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => transitionOrder(ord.id, 'shipped')}
                    className="h-8 px-3 bg-[#202C28] hover:bg-[#2C3D38] text-white rounded-lg font-medium flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'ar'
                        ? 'تحديث إلى: تم الشحن'
                        : 'Marquer comme expédiée'}
                    </span>
                  </button>
                )}

                {ord.status === 'shipped' && (
                  <button
                    type="button"
                    onClick={() => transitionOrder(ord.id, 'delivered')}
                    className="h-8 px-3 bg-[#2E7D32] text-white rounded-lg font-medium flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'ar'
                        ? 'تحديث إلى: تم التسليم'
                        : 'Marquer comme livrée'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[#737A74]">
                  {locale === 'ar'
                    ? 'العميل وعنوان التوصيل'
                    : 'Client & Adresse de livraison'}
                </span>
                <span className="font-semibold text-[#20231F]">
                  {ord.customer_name}
                </span>
                <span className="font-num text-[#737A74]" dir="ltr">
                  {ord.customer_phone}
                </span>
                <span className="text-[#20231F]">
                  {ord.wilaya} — {ord.commune} (
                  {ord.delivery_type === 'home'
                    ? locale === 'ar'
                      ? 'توصيل للمنزل'
                      : 'À domicile'
                    : 'Stop Desk'}
                  )
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[#737A74]">
                  {locale === 'ar' ? 'المنتجات المطلوبة' : 'Articles commandés'}
                </span>
                {ord.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-[#20231F]"
                  >
                    <span>
                      {item.quantity}x {item.product_name} ({item.variant_label})
                    </span>
                    <span className="font-num font-medium">
                      {formatDzd(item.line_total_dzd, locale)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between text-[#737A74]">
                  <span>
                    {locale === 'ar' ? 'المجموع الفرعي:' : 'Sous-total :'}
                  </span>
                  <span className="font-num">
                    {formatDzd(ord.subtotal_dzd, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#737A74]">
                  <span>
                    {locale === 'ar' ? 'رسوم التوصيل:' : 'Frais de livraison :'}
                  </span>
                  <span className="font-num">
                    {formatDzd(ord.shipping_fee_dzd, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#E5E8E2] font-semibold text-sm text-[#20231F]">
                  <span>
                    {locale === 'ar' ? 'الإجمالي المعتمد:' : 'Total vérifié :'}
                  </span>
                  <span className="font-num">
                    {formatDzd(ord.total_dzd, locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
