import React from 'react';
import {
  AlertTriangle,
  ArrowUpLeft,
  ArrowUpRight,
  CheckCircle2,
  Inbox,
  Radio,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { useConvora } from '../../context/ConvoraContext';
import {
  formatDzd,
  getChannelLabel,
  getIntentLabel,
  getOrderStatusLabel,
} from '../../lib/i18n/translations';

export function DashboardView() {
  const { locale, dir, snapshot, navigate, setSelectedConversationId } =
    useConvora();

  if (!snapshot) {
    return (
      <div className="p-6 text-sm text-[#737A74]">
        {locale === 'ar' ? 'جارٍ تحميل بيانات المتجر...' : 'Chargement...'}
      </div>
    );
  }

  const unreadConversations = snapshot.conversations.filter(
    (c) => c.unread_count > 0
  );
  const waitingResponse = snapshot.conversations.filter(
    (c) => c.status === 'open' || c.status === 'pending_review'
  );
  const aiAssistedCount = snapshot.aiUsage.length;
  const qualifiedLeads = snapshot.leads.filter(
    (l) => l.stage === 'qualified' || l.stage === 'high_intent'
  );
  const draftOrders = snapshot.orders.filter((o) => o.status === 'draft');
  const confirmedOrders = snapshot.orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'delivered'
  );

  const OpenIcon = dir === 'rtl' ? ArrowUpLeft : ArrowUpRight;

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'لوحة التحكم التشغيلية للمتجر'
              : 'Tableau de bord opérationnel'}
          </h1>
          <p className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? `${snapshot.store.name} · ${snapshot.store.wilaya} · بيانات المتجر الحالية`
              : `${snapshot.store.name} · ${snapshot.store.wilaya} · Données actives`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/app/inbox')}
            className="h-9 px-4 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>
              {locale === 'ar'
                ? 'الانتقال إلى صندوق الوارد'
                : 'Ouvrir la boîte de réception'}
            </span>
          </button>
        </div>
      </div>

      {/* Primary Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs text-[#737A74]">
            <span>
              {locale === 'ar'
                ? 'محادثات غير مقروءة / بانتظار الرد'
                : 'Messages non lus / En attente'}
            </span>
            <Inbox className="w-4 h-4 text-[#202C28]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[28px] leading-[34px] font-semibold text-[#20231F] font-num">
              {unreadConversations.length} / {waitingResponse.length}
            </span>
            <button
              type="button"
              onClick={() => navigate('/app/inbox')}
              className="text-xs font-medium text-[#202C28] hover:underline"
            >
              {locale === 'ar' ? 'الرد الآن' : 'Répondre'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs text-[#737A74]">
            <span>
              {locale === 'ar'
                ? 'مسودات ردود الذكاء الاصطناعي'
                : 'Brouillons IA préparés'}
            </span>
            <Sparkles className="w-4 h-4 text-[#B8A27A]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[28px] leading-[34px] font-semibold text-[#20231F] font-num">
              {aiAssistedCount}
            </span>
            <span className="text-xs text-[#737A74]">
              {locale === 'ar'
                ? '100% مستندة للكتالوج'
                : '100% basés sur le catalogue'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs text-[#737A74]">
            <span>
              {locale === 'ar'
                ? 'فرص بيع مؤهلة وعالية النية'
                : 'Prospects qualifiés (Haute intention)'}
            </span>
            <Users className="w-4 h-4 text-[#202C28]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[28px] leading-[34px] font-semibold text-[#20231F] font-num">
              {qualifiedLeads.length}
            </span>
            <button
              type="button"
              onClick={() => navigate('/app/leads')}
              className="text-xs font-medium text-[#202C28] hover:underline"
            >
              {locale === 'ar' ? 'متابعة الفرص' : 'Voir les prospects'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs text-[#737A74]">
            <span>
              {locale === 'ar'
                ? 'طلبيات مؤكدة مقابل مسودات'
                : 'Commandes confirmées vs Brouillons'}
            </span>
            <ShoppingBag className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[28px] leading-[34px] font-semibold text-[#20231F] font-num">
              {confirmedOrders.length} / {draftOrders.length}
            </span>
            <button
              type="button"
              onClick={() => navigate('/app/orders')}
              className="text-xs font-medium text-[#D97706] hover:underline"
            >
              {locale === 'ar'
                ? `${draftOrders.length} مسودة للمراجعة`
                : `${draftOrders.length} brouillon(s)`}
            </button>
          </div>
        </div>
      </div>

      {/* High-Priority Actions & Recent Conversations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8E2] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#E5E8E2] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#20231F]">
              {locale === 'ar'
                ? 'أحدث محادثات الزبائن'
                : 'Conversations récentes'}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/app/inbox')}
              className="text-xs text-[#202C28] font-medium hover:underline flex items-center gap-1"
            >
              <span>
                {locale === 'ar' ? 'فتح صندوق الوارد' : 'Tout voir'}
              </span>
              <OpenIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E8E2]">
            {snapshot.conversations.map((conv) => (
              <div
                key={conv.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F8F7F2] transition-colors"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#20231F]">
                      {conv.customer_name}
                    </span>
                    <span className="text-xs text-[#737A74]">·</span>
                    <span className="text-xs text-[#737A74]">
                      {conv.customer_wilaya}
                    </span>
                  </div>
                  <p className="text-xs text-[#737A74] truncate">
                    {conv.last_message_preview}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-[#737A74]">
                    <span className="text-[#202C28] font-medium">
                      {getChannelLabel(conv.channel, locale)}
                    </span>
                    <span>·</span>
                    <span>{getIntentLabel(conv.intent, locale)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedConversationId(conv.id);
                    navigate('/app/inbox');
                  }}
                  className="px-3 py-1.5 bg-[#F8F7F2] hover:bg-[#D9E5D4] text-[#202C28] text-xs font-medium rounded-lg border border-[#E5E8E2] shrink-0 transition-colors"
                >
                  {locale === 'ar' ? 'معاينة والرد' : 'Ouvrir'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* High Priority Actions & Channel Status */}
        <div className="flex flex-col gap-6">
          {/* High-Priority Actions */}
          <div className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col gap-3.5">
            <h2 className="text-sm font-semibold text-[#20231F] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              <span>
                {locale === 'ar'
                  ? 'إجراءات ذات أولوية عالية'
                  : 'Actions prioritaires'}
              </span>
            </h2>

            <div className="flex flex-col gap-2.5 text-xs">
              {draftOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#20231F]">
                      {locale === 'ar'
                        ? `تأكيد مسودة الطلب ${ord.order_number}`
                        : `Confirmer le brouillon ${ord.order_number}`}
                    </span>
                    <span className="font-num font-semibold text-[#D97706]">
                      {formatDzd(ord.total_dzd, locale)}
                    </span>
                  </div>
                  <span className="text-[#737A74]">
                    {ord.customer_name} ({ord.wilaya})
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/app/orders')}
                    className="mt-1 py-1.5 px-2.5 bg-[#202C28] text-white rounded font-medium text-center"
                  >
                    {locale === 'ar'
                      ? 'مراجعة وتأكيد الطلب'
                      : 'Vérifier la commande'}
                  </button>
                </div>
              ))}

              {snapshot.products
                .filter((p) => p.stock_quantity === null)
                .map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 flex flex-col gap-1.5"
                  >
                    <span className="font-semibold text-[#20231F]">
                      {locale === 'ar'
                        ? `تحديث مخزون غير مؤكد: ${prod.name_ar}`
                        : `Vérifier le stock : ${prod.name_fr}`}
                    </span>
                    <span className="text-[#737A74]">
                      {locale === 'ar'
                        ? 'الذكاء الاصطناعي ينبه الزبائن حالياً بأن الكمية قيد الجرد.'
                        : 'L’IA signale actuellement que ce stock est en cours de vérification.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/app/products')}
                      className="mt-1 py-1.5 px-2.5 bg-white border border-[#E5E8E2] text-[#20231F] rounded font-medium text-center hover:bg-[#D9E5D4]/40"
                    >
                      {locale === 'ar'
                        ? 'فتح كتالوج المنتجات'
                        : 'Ouvrir le catalogue'}
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Channel Connection Summary */}
          <div className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#20231F] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#202C28]" />
                <span>
                  {locale === 'ar'
                    ? 'حالة قنوات الرسائل'
                    : 'État des canaux'}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => navigate('/app/channels')}
                className="text-xs text-[#202C28] hover:underline"
              >
                {locale === 'ar' ? 'الإعدادات' : 'Configurer'}
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              {snapshot.channels.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between py-2 border-b border-[#E5E8E2] last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-[#20231F]">
                      {getChannelLabel(ch.provider, locale)}
                    </span>
                    <span className="text-[11px] text-[#737A74]" dir="ltr">
                      {ch.account_name}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      ch.status === 'connected'
                        ? 'text-[#2E7D32]'
                        : ch.status === 'simulated_demo'
                        ? 'text-[#B8A27A]'
                        : 'text-[#D97706]'
                    }`}
                  >
                    {ch.status === 'connected'
                      ? locale === 'ar'
                        ? 'متصل'
                        : 'Connecté'
                      : ch.status === 'simulated_demo'
                      ? locale === 'ar'
                        ? 'وضع المحاكاة المحلي'
                        : 'Mode démo simulé'
                      : locale === 'ar'
                      ? 'يتطلب إعداد Meta API'
                      : 'Configuration requise'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Orders by Status Overview */}
      <div className="bg-white border border-[#E5E8E2] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E8E2] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'ملخص الطلبيات حسب الحالة'
              : 'Commandes récentes par statut'}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/app/orders')}
            className="text-xs font-medium text-[#202C28] hover:underline"
          >
            {locale === 'ar' ? 'إدارة الطلبيات' : 'Gérer les commandes'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#F8F7F2] text-[#737A74] border-b border-[#E5E8E2]">
              <tr>
                <th className="py-2.5 px-4 text-start font-medium">
                  {locale === 'ar' ? 'رقم الطلب' : 'N° Commande'}
                </th>
                <th className="py-2.5 px-4 text-start font-medium">
                  {locale === 'ar' ? 'العميل' : 'Client'}
                </th>
                <th className="py-2.5 px-4 text-start font-medium">
                  {locale === 'ar' ? 'الولاية' : 'Wilaya'}
                </th>
                <th className="py-2.5 px-4 text-start font-medium">
                  {locale === 'ar' ? 'الحالة' : 'Statut'}
                </th>
                <th className="py-2.5 px-4 text-end font-medium">
                  {locale === 'ar' ? 'الإجمالي' : 'Total'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E2]">
              {snapshot.orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#F8F7F2]/60">
                  <td className="py-2.5 px-4 font-code font-semibold text-[#20231F]">
                    {ord.order_number}
                  </td>
                  <td className="py-2.5 px-4 text-[#20231F]">
                    {ord.customer_name}
                  </td>
                  <td className="py-2.5 px-4 text-[#737A74]">{ord.wilaya}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`font-medium ${
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
                  </td>
                  <td className="py-2.5 px-4 text-end font-num font-semibold text-[#20231F]">
                    {formatDzd(ord.total_dzd, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
