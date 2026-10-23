import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useConvora } from '../../context/ConvoraContext';
import type { AITone, ReplyLanguage } from '../../types/domain';
import { getIntentLabel } from '../../lib/i18n/translations';

export function AIAssistantView() {
  const {
    locale,
    snapshot,
    selectedConversationId,
    setSelectedConversationId,
    aiDraftByConv,
    generateAIDraft,
    setComposerDraftForConv,
    navigate,
    systemStatus,
  } = useConvora();

  const [language, setLanguage] = useState<ReplyLanguage>('darja');
  const [tone, setTone] = useState<AITone>('friendly');
  const [customNotes, setCustomNotes] = useState('');
  const [editableDraft, setEditableDraft] = useState('');
  const [loading, setLoading] = useState(false);

  if (!snapshot) return null;

  const activeConv =
    snapshot.conversations.find((c) => c.id === selectedConversationId) ||
    snapshot.conversations[0];

  const currentDraft = activeConv ? aiDraftByConv[activeConv.id] : undefined;

  const handleGenerate = async () => {
    if (!activeConv) return;
    setLoading(true);
    try {
      const generated = await generateAIDraft({
        conversationId: activeConv.id,
        language,
        tone,
        customInstructions: customNotes,
      });
      if (generated) {
        setEditableDraft(generated.draft_text);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndInsertToInbox = () => {
    if (!activeConv) return;
    const textToUse = editableDraft.trim() || currentDraft?.draft_text || '';
    if (!textToUse) return;
    setComposerDraftForConv(activeConv.id, textToUse);
    navigate('/app/inbox');
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#20231F] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#B8A27A]" />
            <span>
              {locale === 'ar'
                ? 'مساعد الرد الذكي المستند لبيانات المتجر'
                : 'Assistant de réponse IA basé sur les données vérifiées'}
            </span>
          </h1>
          <p className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'توليد مسودات ردود بالدارجة الجزائرية، العربية، والفرنسية مع التحقق الصارم من الأسعار والمخزون.'
              : 'Préparation de brouillons en Darja algérienne, arabe et français sans invention de stock ou de prix.'}
          </p>
        </div>

        <div className="text-xs bg-white border border-[#E5E8E2] rounded-lg px-3 py-1.5 text-[#737A74]">
          {systemStatus.geminiConfigured
            ? locale === 'ar'
              ? `النموذج النشط على الخادم: ${systemStatus.runtimeModel}`
              : `Modèle serveur actif : ${systemStatus.runtimeModel}`
            : locale === 'ar'
            ? 'الوضع النشط: محرك التوثيق المحلي الصارم (أضف GEMINI_API_KEY لتفعيل Gemini)'
            : 'Mode actif : Moteur déterministe vérifié (GEMINI_API_KEY non configuré)'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ai-conv-select"
              className="text-xs font-semibold text-[#20231F]"
            >
              {locale === 'ar'
                ? 'اختر محادثة العميل'
                : 'Sélectionner la conversation client'}
            </label>
            <select
              id="ai-conv-select"
              value={activeConv?.id || ''}
              onChange={(e) => {
                setSelectedConversationId(e.target.value);
                setEditableDraft('');
              }}
              className="h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg px-3 text-xs text-[#20231F]"
            >
              {snapshot.conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_name} — {c.customer_wilaya}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ai-lang-select"
              className="text-xs font-semibold text-[#20231F]"
            >
              {locale === 'ar' ? 'لغة الرد المقترح' : 'Langue de réponse'}
            </label>
            <select
              id="ai-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as ReplyLanguage)}
              className="h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg px-3 text-xs text-[#20231F]"
            >
              <option value="darja">الدارجة الجزائرية (Darja Algérienne)</option>
              <option value="ar">العربية الفصحى (Arabe Standard)</option>
              <option value="fr">Français (FR)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ai-tone-select"
              className="text-xs font-semibold text-[#20231F]"
            >
              {locale === 'ar' ? 'نبرة الأسلوب' : 'Ton de la réponse'}
            </label>
            <select
              id="ai-tone-select"
              value={tone}
              onChange={(e) => setTone(e.target.value as AITone)}
              className="h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg px-3 text-xs text-[#20231F]"
            >
              <option value="friendly">
                {locale === 'ar' ? 'ودود ومرحب' : 'Chaleureux & accueillant'}
              </option>
              <option value="professional">
                {locale === 'ar' ? 'احترافي ورسمي' : 'Professionnel'}
              </option>
              <option value="concise">
                {locale === 'ar' ? 'مختصر ومباشر' : 'Concis & direct'}
              </option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ai-custom-notes"
              className="text-xs font-semibold text-[#20231F]"
            >
              {locale === 'ar'
                ? 'توجيهات إضافية للمسودة (اختياري)'
                : 'Instructions complémentaires (optionnel)'}
            </label>
            <textarea
              id="ai-custom-notes"
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={
                locale === 'ar'
                  ? 'مثال: ذكّر العميل بأن التوصيل لمكتب ياليدين وهران يستغرق 24 ساعة...'
                  : 'Ex: préciser que la livraison Stop Desk Yalidine Oran prend 24h...'
              }
              className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-2.5 text-xs text-[#20231F]"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="h-10 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>
              {locale === 'ar'
                ? 'توليد مسودة رد مستندة للكتالوج'
                : 'Générer le brouillon vérifié'}
            </span>
          </button>
        </div>

        {/* Output & Grounding Inspector */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col gap-4">
          {activeConv && (
            <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3.5 flex flex-col gap-1 text-xs">
              <span className="font-semibold text-[#20231F]">
                {locale === 'ar'
                  ? `رسالة العميل (${activeConv.customer_name}):`
                  : `Message du client (${activeConv.customer_name}) :`}
              </span>
              <p className="text-[#20231F] leading-relaxed">
                {activeConv.last_message_preview}
              </p>
            </div>
          )}

          {currentDraft ? (
            <>
              {currentDraft.missing_info_warnings.length > 0 && (
                <div
                  role="alert"
                  className="bg-[#D97706]/10 border border-[#D97706]/30 p-3.5 rounded-lg text-xs flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-[#D97706]">
                      {locale === 'ar'
                        ? 'تنبيه معلومات غير مؤكدة في المخزون/النظام:'
                        : 'Avertissement d’information manquante ou non vérifiée :'}
                    </span>
                    {currentDraft.missing_info_warnings.map((w, i) => (
                      <span key={i} className="text-[#20231F]">
                        • {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="editable-ai-draft"
                  className="text-xs font-semibold text-[#20231F] flex items-center justify-between"
                >
                  <span>
                    {locale === 'ar'
                      ? 'تحرير ومراجعة المسودة قبل الإدراج'
                      : 'Vérifier et modifier le brouillon avant insertion'}
                  </span>
                  <span className="text-[11px] font-normal text-[#737A74]">
                    {getIntentLabel(currentDraft.intent, locale)} ·{' '}
                    {Math.round(currentDraft.confidence * 100)}%
                  </span>
                </label>
                <textarea
                  id="editable-ai-draft"
                  rows={4}
                  value={editableDraft || currentDraft.draft_text}
                  onChange={(e) => setEditableDraft(e.target.value)}
                  className="w-full bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 text-sm text-[#20231F] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#202C28]"
                />
              </div>

              <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3.5 flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-[#20231F] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                  <span>
                    {locale === 'ar'
                      ? 'الحقائق الموثقة المستخدمة في بناء هذا الرد:'
                      : 'Données vérifiées utilisées pour ce brouillon :'}
                  </span>
                </span>
                <ul className="space-y-1 text-[#737A74]">
                  {currentDraft.grounded_facts.map((fact, idx) => (
                    <li key={idx}>• {fact}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleApproveAndInsertToInbox}
                  className="h-10 px-4 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {locale === 'ar'
                      ? 'اعتماد المسودة وإدراجها في صندوق الوارد'
                      : 'Approuver et insérer dans la boîte de réception'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-2 text-xs text-[#737A74]">
              <Bot className="w-8 h-8 text-[#737A74]" />
              <span>
                {locale === 'ar'
                  ? 'اضغط على "توليد مسودة رد مستندة للكتالوج" لعرض الاقتراح والحقائق الموثقة.'
                  : 'Cliquez sur "Générer le brouillon vérifié" pour préparer une réponse.'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AISettingsView() {
  const { locale, snapshot, updateAISettings } = useConvora();

  const store = snapshot?.store;
  const [aiEnabled, setAiEnabled] = useState(store?.ai_enabled ?? true);
  const [defaultLanguage, setDefaultLanguage] = useState<ReplyLanguage>(
    store?.default_language ?? 'ar'
  );
  const [aiTone, setAiTone] = useState<AITone>(store?.ai_tone ?? 'friendly');
  const [requireApproval, setRequireApproval] = useState(
    store?.require_human_approval ?? true
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    store?.confidence_threshold ?? 0.82
  );
  const [returnPolicy, setReturnPolicy] = useState(store?.return_policy ?? '');
  const [shippingPolicy, setShippingPolicy] = useState(
    store?.shipping_policy ?? ''
  );
  const [saving, setSaving] = useState(false);

  if (!store) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAISettings({
        ai_enabled: aiEnabled,
        default_language: defaultLanguage,
        ai_tone: aiTone,
        require_human_approval: requireApproval,
        confidence_threshold: Number(confidenceThreshold),
        return_policy: returnPolicy,
        shipping_policy: shippingPolicy,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-[#20231F]">
          {locale === 'ar'
            ? 'إعدادات الذكاء الاصطناعي ومعرفة المتجر'
            : 'Paramètres IA & Base de connaissances'}
        </h1>
        <p className="text-xs text-[#737A74]">
          {locale === 'ar'
            ? 'ضبط قواعد التوثيق، نبرة الرد، سياسات التوصيل والاستبدال، وشروط التحويل البشري.'
            : 'Configurez les règles de sécurité IA, le ton, les politiques de livraison et d’escalade.'}
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-[#E5E8E2] rounded-xl p-6 flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3.5 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[#20231F]">
                {locale === 'ar'
                  ? 'تفعيل مساعد المسودات الذكي'
                  : 'Activer la préparation de brouillons IA'}
              </span>
              <span className="text-[11px] text-[#737A74]">
                {locale === 'ar'
                  ? 'تحليل النية وتجهيز مسودة رد لكل رسالة واردة'
                  : 'Analyser l’intention et préparer un brouillon'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#202C28]"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[#20231F]">
                {locale === 'ar'
                  ? 'إلزامية موافقة التاجر قبل الإرسال'
                  : 'Validation humaine obligatoire'}
              </span>
              <span className="text-[11px] text-[#737A74]">
                {locale === 'ar'
                  ? 'منع الإرسال التلقائي المباشر للعميل'
                  : 'Ne jamais envoyer un message sans revue'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="w-4 h-4 accent-[#202C28]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="default-lang"
              className="text-xs font-semibold text-[#20231F]"
            >
              {locale === 'ar' ? 'اللغة الافتراضية للردود' : 'Langue par défaut'}
            </label>
            <select
              id="default-lang"
              value={defaultLanguage}
              onChange={(e) =>
                setDefaultLanguage(e.target.value as ReplyLanguage)
              }
              className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs"
            >
              <option value="ar">العربية (Arabe)</option>
              <option value="darja">الدارجة الجزائرية (Darja)</option>
              <option value="fr">Français (FR)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="default-tone"
              className="text-xs font-semibold text-[#20231F]"
            >
              {locale === 'ar' ? 'النبرة الافتراضية' : 'Ton par défaut'}
            </label>
            <select
              id="default-tone"
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value as AITone)}
              className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs"
            >
              <option value="friendly">
                {locale === 'ar' ? 'ودود' : 'Chaleureux'}
              </option>
              <option value="professional">
                {locale === 'ar' ? 'احترافي' : 'Professionnel'}
              </option>
              <option value="concise">
                {locale === 'ar' ? 'مختصر' : 'Concis'}
              </option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="conf-threshold"
              className="text-xs font-semibold text-[#20231F]"
            >
              {locale === 'ar'
                ? `حد الثقة للتحويل البشري (${Math.round(
                    confidenceThreshold * 100
                  )}%)`
                : `Seuil de confiance (${Math.round(
                    confidenceThreshold * 100
                  )}%)`}
            </label>
            <input
              id="conf-threshold"
              type="number"
              step="0.01"
              min="0.50"
              max="0.99"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-xs font-num"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="shipping-policy-input"
            className="text-xs font-semibold text-[#20231F]"
          >
            {locale === 'ar'
              ? 'سياسة التوصيل والولايات المعتمدة (مصدر الحقيقة للمساعد الذكي)'
              : 'Politique de livraison vérifiée (Source de vérité IA)'}
          </label>
          <textarea
            id="shipping-policy-input"
            rows={3}
            value={shippingPolicy}
            onChange={(e) => setShippingPolicy(e.target.value)}
            className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 text-xs text-[#20231F] leading-relaxed"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="return-policy-input"
            className="text-xs font-semibold text-[#20231F]"
          >
            {locale === 'ar'
              ? 'سياسة الاستبدال والاسترجاع المعتمدة'
              : 'Politique d’échange et de retour vérifiée'}
          </label>
          <textarea
            id="return-policy-input"
            rows={2}
            value={returnPolicy}
            onChange={(e) => setReturnPolicy(e.target.value)}
            className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 text-xs text-[#20231F] leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>
              {locale === 'ar'
                ? 'حفظ إعدادات الذكاء الاصطناعي'
                : 'Enregistrer les paramètres IA'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
