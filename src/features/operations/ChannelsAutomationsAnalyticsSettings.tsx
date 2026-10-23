import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Database,
  Play,
  Radio,
  ShieldCheck,
  Users,
  Webhook,
  Workflow,
} from 'lucide-react';
import { useConvora } from '../../context/ConvoraContext';
import { formatDzd, getChannelLabel } from '../../lib/i18n/translations';
import type { ChannelProvider } from '../../types/domain';

export function AutomationsView() {
  const { locale, snapshot, toggleAutomation } = useConvora();

  if (!snapshot) return null;

  return (
    <div className="p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#20231F] flex items-center gap-2">
          <Workflow className="w-5 h-5 text-[#202C28]" />
          <span>
            {locale === 'ar'
              ? 'الأتمتة وقواعد سير العمل'
              : 'Automatisations & Règles métier'}
          </span>
        </h1>
        <p className="text-xs text-[#737A74]">
          {locale === 'ar'
            ? 'إدارة المشغلات والشروط مع التمييز الصريح بين القواعد النشطة على الخادم والإعدادات المحفوظة فقط.'
            : 'Distinction claire entre les règles exécutées côté serveur et les configurations enregistrées.'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {snapshot.automations.map((rule) => (
          <div
            key={rule.id}
            className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col gap-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[#20231F]">
                  {locale === 'ar' ? rule.name_ar : rule.name_fr}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-[#737A74]">
                  <span
                    className={
                      rule.execution_mode === 'active_server_rule'
                        ? 'text-[#2E7D32] font-medium'
                        : 'text-[#D97706] font-medium'
                    }
                  >
                    {rule.execution_mode === 'active_server_rule'
                      ? locale === 'ar'
                        ? 'منفذة على الخادم المحلي'
                        : 'Règle serveur active'
                      : locale === 'ar'
                      ? 'إعداد محفوظ فقط (يتطلب عامل خلفية Cron للتنفيذ الفعلي)'
                      : 'Configuration enregistrée uniquement (Worker Cron requis)'}
                  </span>
                  <span>·</span>
                  <span className="font-num">
                    {locale === 'ar'
                      ? `مرات التنفيذ: ${rule.total_triggered}`
                      : `Exécutions : ${rule.total_triggered}`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleAutomation(rule.id)}
                className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors ${
                  rule.enabled
                    ? 'bg-[#202C28] text-white'
                    : 'bg-[#F8F7F2] border border-[#E5E8E2] text-[#737A74]'
                }`}
              >
                {rule.enabled
                  ? locale === 'ar'
                    ? 'مفعّلة (إيقاف)'
                    : 'Activée (Désactiver)'
                  : locale === 'ar'
                  ? 'معطّلة (تفعيل)'
                  : 'Désactivée (Activer)'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3.5">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[#20231F]">
                  {locale === 'ar' ? 'الشرط (Condition):' : 'Condition :'}
                </span>
                <span className="text-[#737A74]">
                  {locale === 'ar'
                    ? rule.condition_summary_ar
                    : rule.condition_summary_fr}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[#20231F]">
                  {locale === 'ar' ? 'الإجراء (Action):' : 'Action :'}
                </span>
                <span className="text-[#737A74]">
                  {locale === 'ar'
                    ? rule.action_summary_ar
                    : rule.action_summary_fr}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChannelsView() {
  const { locale, snapshot, systemStatus, simulateWebhook } = useConvora();

  const [provider, setProvider] =
    useState<ChannelProvider>('whatsapp_business');
  const [eventId, setEventId] = useState('wamid.DZ_ALGER_2026_091');
  const [customerName, setCustomerName] = useState('كريم بن عيسى');
  const [customerWilaya, setCustomerWilaya] = useState('09 - البليدة (Blida)');
  const [messageBody, setMessageBody] = useState(
    'سلام، بشحال عباية حرير المدينة الزيتوني وتوصلو للبليدة؟'
  );
  const [validSignature, setValidSignature] = useState(true);

  if (!snapshot) return null;

  const handleTestWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    await simulateWebhook({
      provider,
      externalEventId: eventId,
      customerName,
      customerHandle: '+213 559 10 20 30',
      customerWilaya,
      messageBody,
      validSignature,
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#20231F] flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#202C28]" />
            <span>
              {locale === 'ar'
                ? 'تكامل قنوات التواصل (Meta & WhatsApp)'
                : 'Intégrations des Canaux (Meta & WhatsApp)'}
            </span>
          </h1>
          <p className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'حالة الربط الفعلية لقنوات واتساب للأعمال، إنستغرام دايركت، وفيسبوك مسنجر مع سجل التحقق من الـ Webhooks.'
              : 'État réel des connexions Instagram Direct, WhatsApp Business et Messenger.'}
          </p>
        </div>

        <span className="text-xs bg-white border border-[#E5E8E2] rounded-lg px-3 py-1.5 text-[#737A74]">
          {systemStatus.metaConfigured
            ? locale === 'ar'
              ? 'Meta API: مهيأ'
              : 'Meta API : Configuré'
            : locale === 'ar'
            ? 'Meta OAuth: يتطلب مفاتيح META_APP_ID و META_APP_SECRET للربط الحي'
            : 'Meta OAuth : META_APP_ID & META_APP_SECRET requis pour la production'}
        </span>
      </div>

      {/* Channels Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {snapshot.channels.map((ch) => (
          <div
            key={ch.id}
            className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#20231F]">
                  {getChannelLabel(ch.provider, locale)}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
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
                      ? 'محاكاة محلية (Simulated Demo)'
                      : 'Démo simulée'
                    : locale === 'ar'
                    ? 'يتطلب إعداد (Configuration Required)'
                    : 'Configuration requise'}
                </span>
              </div>
              <span className="text-xs text-[#737A74]" dir="ltr">
                {ch.account_name}
              </span>
            </div>

            <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 text-xs flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[#737A74]">
                  {locale === 'ar' ? 'رسائل اليوم:' : 'Messages aujourd’hui :'}
                </span>
                <span className="font-num font-semibold text-[#20231F]">
                  {ch.messages_today}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#737A74]">
                  {locale === 'ar' ? 'توقيع Webhook:' : 'Signature Webhook :'}
                </span>
                <span className="text-[#20231F]">
                  {ch.webhook_verified
                    ? 'HMAC Verified'
                    : locale === 'ar'
                    ? 'رموز التحقق المحلية'
                    : 'Jeton local'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Idempotency & Signature Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleTestWebhook}
          className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#20231F] flex items-center gap-2">
              <Webhook className="w-4 h-4 text-[#202C28]" />
              <span>
                {locale === 'ar'
                  ? 'اختبار استقبال Webhook والتحقق من عدم التكرار (Idempotency)'
                  : 'Simulateur Webhook & Test d’Idempotence'}
              </span>
            </h2>
            <p className="text-xs text-[#737A74]">
              {locale === 'ar'
                ? 'إرسال نفس معرف الحدث (External Event ID) مرتين يختبر منع تكرار المحادثات في جدول webhook_events.'
                : 'Envoyer deux fois le même External Event ID teste la déduplication automatique.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="wh-provider"
                className="font-semibold text-[#20231F]"
              >
                {locale === 'ar' ? 'القناة' : 'Canal'}
              </label>
              <select
                id="wh-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as ChannelProvider)}
                className="h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg px-2.5"
              >
                <option value="whatsapp_business">WhatsApp Business</option>
                <option value="instagram_direct">Instagram Direct</option>
                <option value="facebook_messenger">Facebook Messenger</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="wh-event-id"
                className="font-semibold text-[#20231F]"
              >
                External Event ID
              </label>
              <input
                id="wh-event-id"
                type="text"
                dir="ltr"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg px-2.5 font-code"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="wh-cust-name"
                className="font-semibold text-[#20231F]"
              >
                {locale === 'ar' ? 'اسم المرسل' : 'Nom du client'}
              </label>
              <input
                id="wh-cust-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg px-2.5"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="wh-cust-wilaya"
                className="font-semibold text-[#20231F]"
              >
                {locale === 'ar' ? 'الولاية' : 'Wilaya'}
              </label>
              <input
                id="wh-cust-wilaya"
                type="text"
                value={customerWilaya}
                onChange={(e) => setCustomerWilaya(e.target.value)}
                className="h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg px-2.5"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <label htmlFor="wh-msg" className="font-semibold text-[#20231F]">
              {locale === 'ar' ? 'نص الرسالة الواردة' : 'Message entrant'}
            </label>
            <input
              id="wh-msg"
              type="text"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg px-2.5"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#20231F] cursor-pointer">
            <input
              type="checkbox"
              checked={validSignature}
              onChange={(e) => setValidSignature(e.target.checked)}
              className="w-4 h-4 accent-[#202C28]"
            />
            <span>
              {locale === 'ar'
                ? 'إرفاق توقيع X-Hub-Signature-256 صالح (إلغاء التحديد يختبر رفض التوقيع المزور 401)'
                : 'Inclure une signature X-Hub-Signature-256 valide'}
            </span>
          </label>

          <button
            type="submit"
            className="h-9 px-4 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {locale === 'ar'
                ? 'إرسال حدث Webhook إلى الخادم'
                : 'Envoyer l’événement Webhook'}
            </span>
          </button>
        </form>

        {/* Webhook Events Log */}
        <div className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'سجل أحداث الـ Webhook (جدول webhook_events)'
              : 'Journal des événements Webhook (webhook_events)'}
          </h2>
          <div className="divide-y divide-[#E5E8E2] text-xs overflow-y-auto max-h-80">
            {snapshot.webhookEvents.map((ev) => (
              <div
                key={ev.id}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-code text-[#20231F] truncate">
                    {ev.external_event_id}
                  </span>
                  <span className="text-[11px] text-[#737A74]">
                    {getChannelLabel(ev.provider, locale)}
                  </span>
                </div>
                <span
                  className={`font-semibold shrink-0 ${
                    ev.status === 'processed'
                      ? 'text-[#2E7D32]'
                      : ev.status === 'duplicate_ignored'
                      ? 'text-[#D97706]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {ev.status === 'processed'
                    ? locale === 'ar'
                      ? 'تمت المعالجة'
                      : 'Traité'
                    : ev.status === 'duplicate_ignored'
                    ? locale === 'ar'
                      ? 'مكرر (تم التجاهل)'
                      : 'Dupliqué ignoré'
                    : locale === 'ar'
                    ? 'توقيع مرفوض (401)'
                    : 'Signature rejetée'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsView() {
  const { locale, snapshot } = useConvora();

  if (!snapshot) return null;

  const totalConvs = snapshot.conversations.length;
  const resolvedConvs = snapshot.conversations.filter(
    (c) => c.status === 'resolved'
  ).length;
  const totalLeads = snapshot.leads.length;
  const confirmedOrders = snapshot.orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'delivered'
  );
  const confirmedRevenueDzd = confirmedOrders.reduce(
    (sum, o) => sum + o.total_dzd,
    0
  );
  const totalTokens = snapshot.aiUsage.reduce(
    (sum, u) => sum + u.prompt_tokens + u.completion_tokens,
    0
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#20231F] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#202C28]" />
          <span>
            {locale === 'ar'
              ? 'التحليلات ومؤشرات الأداء الفعلية'
              : 'Analytique & Indicateurs de performance'}
          </span>
        </h1>
        <p className="text-xs text-[#737A74]">
          {locale === 'ar'
            ? 'جميع الأرقام محسوبة مباشرة من سجلات المحادثات، استخدام الذكاء الاصطناعي، والطلبيات المؤكدة للمتجر.'
            : 'Indicateurs calculés directement à partir des enregistrements de votre boutique.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'إجمالي المحادثات النشطة'
              : 'Volume de conversations'}
          </span>
          <span className="text-[28px] leading-[34px] font-semibold font-num text-[#20231F]">
            {totalConvs}
          </span>
          <span className="text-[11px] text-[#737A74]">
            {locale === 'ar'
              ? `${resolvedConvs} محادثة مغلقة`
              : `${resolvedConvs} résolue(s)`}
          </span>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'قمع التحويل (الفرص البيعية)'
              : 'Prospects dans le pipeline'}
          </span>
          <span className="text-[28px] leading-[34px] font-semibold font-num text-[#20231F]">
            {totalLeads}
          </span>
          <span className="text-[11px] text-[#737A74]">
            {locale === 'ar'
              ? 'محسوبة من جدول leads'
              : 'Calculé depuis la table leads'}
          </span>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'مبيعات الطلبيات المؤكدة فقط'
              : 'Chiffre d’affaires confirmé'}
          </span>
          <span className="text-[28px] leading-[34px] font-semibold font-num text-[#2E7D32]">
            {formatDzd(confirmedRevenueDzd, locale)}
          </span>
          <span className="text-[11px] text-[#737A74]">
            {locale === 'ar'
              ? 'لا يشمل المسودات غير المؤكدة'
              : 'Exclut les brouillons non confirmés'}
          </span>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'استهلاك رموز الذكاء الاصطناعي (ai_usage)'
              : 'Tokens IA consommés (ai_usage)'}
          </span>
          <span className="text-[28px] leading-[34px] font-semibold font-num text-[#20231F]">
            {totalTokens.toLocaleString('en-US')}
          </span>
          <span className="text-[11px] text-[#737A74]">
            {locale === 'ar'
              ? `${snapshot.aiUsage.length} عمليات توليد مسودة`
              : `${snapshot.aiUsage.length} générations de brouillons`}
          </span>
        </div>
      </div>

      {/* AI Usage Audit Table */}
      <div className="bg-white border border-[#E5E8E2] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E8E2]">
          <h2 className="text-sm font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'سجل استخدام الذكاء الاصطناعي والتوثيق (ai_usage)'
              : 'Journal d’utilisation IA (ai_usage)'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#F8F7F2] text-[#737A74] border-b border-[#E5E8E2]">
              <tr>
                <th className="py-2.5 px-4 text-start font-medium">Model</th>
                <th className="py-2.5 px-4 text-start font-medium">
                  {locale === 'ar' ? 'اللغة والنبرة' : 'Langue & Ton'}
                </th>
                <th className="py-2.5 px-4 text-start font-medium">
                  {locale === 'ar'
                    ? 'حالة التوثيق بالكتالوج'
                    : 'Vérification catalogue'}
                </th>
                <th className="py-2.5 px-4 text-end font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E2]">
              {snapshot.aiUsage.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 px-4 font-code text-[#20231F]">
                    {u.model}
                  </td>
                  <td className="py-2.5 px-4 text-[#737A74]">
                    {u.language.toUpperCase()} · {u.tone}
                  </td>
                  <td className="py-2.5 px-4">
                    {u.missing_info_flagged ? (
                      <span className="text-[#D97706] font-medium">
                        {locale === 'ar'
                          ? 'تم تنبيه العميل بنقص معلومة في المخزون'
                          : 'Avertissement stock non vérifié déclenché'}
                      </span>
                    ) : (
                      <span className="text-[#2E7D32] font-medium">
                        {locale === 'ar'
                          ? 'موثق بالكامل من الكتالوج'
                          : '100% vérifié au catalogue'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-end font-num text-[#20231F]">
                    {u.prompt_tokens + u.completion_tokens}
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

export function SettingsView() {
  const {
    locale,
    snapshot,
    activeUserId,
    setActiveUserId,
    systemStatus,
  } = useConvora();

  if (!snapshot) return null;

  return (
    <div className="p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#20231F]">
          {locale === 'ar'
            ? 'إعدادات المتجر، الفريق، وسجل التدقيق الأمني'
            : 'Paramètres de la boutique, Équipe & Journal d’audit'}
        </h1>
        <p className="text-xs text-[#737A74]">
          {locale === 'ar'
            ? 'إدارة صلاحيات الفريق (RBAC)، حالة البنية التحتية، وسجل العمليات الحساسة.'
            : 'Contrôle d’accès basé sur les rôles (RBAC), état de l’infrastructure et audit.'}
        </p>
      </div>

      {/* Infrastructure & Security Boundaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-semibold text-[#20231F]">
            <span>Supabase PostgreSQL & RLS</span>
            <Database className="w-4 h-4 text-[#202C28]" />
          </div>
          <span className="text-[#737A74]">
            {systemStatus.supabaseConfigured
              ? locale === 'ar'
                ? 'متصل بقاعدة بيانات Supabase الحية'
                : 'Connecté à Supabase PostgreSQL'
              : locale === 'ar'
              ? 'يعمل على مستودع الخادم المعزول (أضف VITE_SUPABASE_URL للربط الخارجي)'
              : 'Dépôt serveur multi-locataire actif (VITE_SUPABASE_URL requis pour le cloud)'}
          </span>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-semibold text-[#20231F]">
            <span>Gemini Runtime Server Proxy</span>
            <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <span className="text-[#737A74]">
            {systemStatus.geminiConfigured
              ? locale === 'ar'
                ? `مفتاح الخادم مفعّل (${systemStatus.runtimeModel})`
                : `Clé serveur active (${systemStatus.runtimeModel})`
              : locale === 'ar'
              ? 'مفتاح GEMINI_API_KEY محمي على الخادم فقط (وضع التوثيق الحتمي نشط)'
              : 'Clé GEMINI_API_KEY strictement côté serveur'}
          </span>
        </div>

        <div className="bg-white border border-[#E5E8E2] rounded-xl p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-semibold text-[#20231F]">
            <span>Store Members & RBAC</span>
            <Users className="w-4 h-4 text-[#202C28]" />
          </div>
          <span className="text-[#737A74]">
            {locale === 'ar'
              ? `الدور النشط حالياً: ${snapshot.currentMember.role.toUpperCase()}`
              : `Rôle actif : ${snapshot.currentMember.role.toUpperCase()}`}
          </span>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-white border border-[#E5E8E2] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E8E2] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'أعضاء المتجر وصلاحيات الوصول (store_members)'
              : 'Membres de la boutique & Rôles (store_members)'}
          </h2>
          <span className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'يمكنك التبديل بين الأعضاء لاختبار صلاحيات الخادم'
              : 'Changez de membre pour tester les permissions serveur'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#F8F7F2] text-[#737A74] border-b border-[#E5E8E2]">
              <tr>
                <th className="py-2.5 px-4 text-start font-medium">
                  {locale === 'ar' ? 'العضو' : 'Membre'}
                </th>
                <th className="py-2.5 px-4 text-start font-medium">Email</th>
                <th className="py-2.5 px-4 text-start font-medium">
                  {locale === 'ar' ? 'الدور (Role)' : 'Rôle'}
                </th>
                <th className="py-2.5 px-4 text-end font-medium">
                  {locale === 'ar' ? 'جلسة الاختبار' : 'Session active'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E2]">
              {snapshot.members.map((mem) => (
                <tr key={mem.id}>
                  <td className="py-2.5 px-4 font-semibold text-[#20231F]">
                    {mem.full_name}
                  </td>
                  <td className="py-2.5 px-4 text-[#737A74]" dir="ltr">
                    {mem.email}
                  </td>
                  <td className="py-2.5 px-4 font-code uppercase text-[#202C28]">
                    {mem.role}
                  </td>
                  <td className="py-2.5 px-4 text-end">
                    {activeUserId === mem.user_id ? (
                      <span className="inline-flex items-center gap-1 text-[#2E7D32] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{locale === 'ar' ? 'نشط حالياً' : 'Actif'}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveUserId(mem.user_id)}
                        className="px-2.5 py-1 bg-[#F8F7F2] border border-[#E5E8E2] rounded font-medium text-[#20231F] hover:bg-[#D9E5D4]"
                      >
                        {locale === 'ar'
                          ? 'تفعيل هذا الدور'
                          : 'Tester ce rôle'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white border border-[#E5E8E2] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E8E2]">
          <h2 className="text-sm font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'سجل التدقيق الأمني للعمليات (Audit Log)'
              : 'Journal d’audit de sécurité'}
          </h2>
        </div>
        <div className="divide-y divide-[#E5E8E2] text-xs">
          {snapshot.auditLogs.map((log) => (
            <div
              key={log.id}
              className="px-5 py-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-code text-[11px] text-[#202C28] font-semibold">
                  {log.action}
                </span>
                <span className="text-[#737A74]">·</span>
                <span className="text-[#20231F]">{log.summary}</span>
              </div>
              <div className="text-[11px] text-[#737A74] font-num">
                {log.actor_name} ({log.actor_role}) ·{' '}
                {new Date(log.created_at).toLocaleTimeString(
                  locale === 'ar' ? 'ar-DZ' : 'fr-FR',
                  { hour: '2-digit', minute: '2-digit' }
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
