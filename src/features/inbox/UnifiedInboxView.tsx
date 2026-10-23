import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Inbox,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  StickyNote,
  UserCheck,
} from 'lucide-react';
import { useConvora } from '../../context/ConvoraContext';
import type {
  AITone,
  ChannelProvider,
  ReplyLanguage,
} from '../../types/domain';
import {
  formatDzd,
  getChannelLabel,
  getConversationStatusLabel,
  getIntentLabel,
  getOrderStatusLabel,
} from '../../lib/i18n/translations';

type SmartFolder =
  | 'all'
  | 'unread'
  | 'unanswered'
  | 'high_intent'
  | 'ai_review'
  | 'resolved';

export function UnifiedInboxView() {
  const {
    locale,
    dir,
    snapshot,
    selectedConversationId,
    setSelectedConversationId,
    composerDraftByConv,
    setComposerDraftForConv,
    aiDraftByConv,
    sendMessage,
    updateConversationStatus,
    generateAIDraft,
    createOrderDraft,
    navigate,
  } = useConvora();

  const [folder, setFolder] = useState<SmartFolder>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | ChannelProvider>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [composerMode, setComposerMode] = useState<'merchant' | 'internal_note'>(
    'merchant'
  );
  const [sending, setSending] = useState(false);

  // AI Draft controls
  const [draftLanguage, setDraftLanguage] = useState<ReplyLanguage>('darja');
  const [draftTone, setDraftTone] = useState<AITone>('friendly');
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Mobile single-pane view switcher ('list' | 'thread' | 'context')
  const [mobilePane, setMobilePane] = useState<'list' | 'thread' | 'context'>(
    'list'
  );

  const conversations = snapshot?.conversations ?? [];

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
      if (folder === 'unread' && c.unread_count === 0) return false;
      if (
        folder === 'unanswered' &&
        (c.status === 'resolved' || c.unread_count === 0)
      )
        return false;
      if (folder === 'high_intent' && !c.is_high_intent) return false;
      if (folder === 'ai_review' && !c.ai_needs_review) return false;
      if (folder === 'resolved' && c.status !== 'resolved') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.customer_name.toLowerCase().includes(q);
        const matchMsg = c.last_message_preview.toLowerCase().includes(q);
        const matchWilaya = c.customer_wilaya.toLowerCase().includes(q);
        if (!matchName && !matchMsg && !matchWilaya) return false;
      }
      return true;
    });
  }, [conversations, channelFilter, folder, searchQuery]);

  const activeConversation = useMemo(() => {
    return (
      conversations.find((c) => c.id === selectedConversationId) ||
      filteredConversations[0] ||
      null
    );
  }, [conversations, filteredConversations, selectedConversationId]);

  const activeMessages = useMemo(() => {
    if (!activeConversation || !snapshot) return [];
    return snapshot.messages.filter(
      (m) => m.conversation_id === activeConversation.id
    );
  }, [activeConversation, snapshot]);

  const activeCustomer = useMemo(() => {
    if (!activeConversation || !snapshot) return null;
    return (
      snapshot.customers.find((c) => c.id === activeConversation.customer_id) ||
      null
    );
  }, [activeConversation, snapshot]);

  const relatedProducts = useMemo(() => {
    if (!activeConversation || !snapshot) return [];
    return snapshot.products.filter((p) =>
      activeConversation.related_product_ids.includes(p.id)
    );
  }, [activeConversation, snapshot]);

  const relatedOrders = useMemo(() => {
    if (!activeConversation || !snapshot) return [];
    return snapshot.orders.filter(
      (o) =>
        o.conversation_id === activeConversation.id ||
        o.customer_id === activeConversation.customer_id
    );
  }, [activeConversation, snapshot]);

  const activeAIDraft = activeConversation
    ? aiDraftByConv[activeConversation.id]
    : undefined;

  const composerText = activeConversation
    ? composerDraftByConv[activeConversation.id] ?? ''
    : '';

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobilePane('thread');
  };

  React.useEffect(() => {
    if (
      activeConversation &&
      !aiDraftByConv[activeConversation.id] &&
      !generatingDraft
    ) {
      generateAIDraft({
        conversationId: activeConversation.id,
        language: draftLanguage,
        tone: draftTone,
      });
    }
  }, [activeConversation?.id]);

  const handleGenerateDraft = async () => {
    if (!activeConversation) return;
    setGeneratingDraft(true);
    try {
      await generateAIDraft({
        conversationId: activeConversation.id,
        language: draftLanguage,
        tone: draftTone,
      });
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleInsertDraftIntoComposer = () => {
    if (!activeConversation || !activeAIDraft) return;
    setComposerMode('merchant');
    setComposerDraftForConv(activeConversation.id, activeAIDraft.draft_text);
  };

  const handleSendComposer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !composerText.trim()) return;
    setSending(true);
    try {
      const ok = await sendMessage({
        conversationId: activeConversation.id,
        body: composerText,
        senderType: composerMode,
        aiGenerated: Boolean(
          activeAIDraft &&
            composerText.trim() === activeAIDraft.draft_text.trim()
        ),
      });
      if (ok) {
        setComposerDraftForConv(activeConversation.id, '');
      }
    } finally {
      setSending(false);
    }
  };

  const handleQuickCreateDraftOrder = async () => {
    if (!activeConversation) return;
    const prod = relatedProducts[0] || snapshot?.products[0];
    if (!prod) return;
    await createOrderDraft({
      conversationId: activeConversation.id,
      customerId: activeConversation.customer_id,
      customerName: activeConversation.customer_name,
      customerPhone: activeConversation.customer_phone,
      wilaya: activeConversation.customer_wilaya,
      commune: 'Centre',
      deliveryType: 'home',
      isAiDraft: true,
      shippingFeeDzd: 600,
      notes:
        locale === 'ar'
          ? 'مسودة طلب أُنشئت من صندوق الوارد للمراجعة والتأكيد'
          : 'Brouillon créé depuis la boîte de réception pour validation',
      items: [
        {
          productId: prod.id,
          variantLabel: prod.variants[0]
            ? `${prod.variants[0].size} — ${prod.variants[0].color}`
            : 'Standard',
          quantity: 1,
        },
      ],
    });
  };

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const folders: Array<{ id: SmartFolder; ar: string; fr: string; count: number }> = [
    {
      id: 'all',
      ar: 'كل المحادثات',
      fr: 'Toutes',
      count: conversations.length,
    },
    {
      id: 'unread',
      ar: 'غير مقروءة',
      fr: 'Non lues',
      count: conversations.filter((c) => c.unread_count > 0).length,
    },
    {
      id: 'unanswered',
      ar: 'بانتظار الرد',
      fr: 'En attente',
      count: conversations.filter(
        (c) => c.status !== 'resolved' && c.unread_count > 0
      ).length,
    },
    {
      id: 'high_intent',
      ar: 'نية شراء عالية',
      fr: 'Haute intention',
      count: conversations.filter((c) => c.is_high_intent).length,
    },
    {
      id: 'ai_review',
      ar: 'تحتاج مراجعة التاجر',
      fr: 'À vérifier (IA)',
      count: conversations.filter((c) => c.ai_needs_review).length,
    },
    {
      id: 'resolved',
      ar: 'المحادثات المغلقة',
      fr: 'Résolues',
      count: conversations.filter((c) => c.status === 'resolved').length,
    },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)] bg-[#F8F7F2]">
      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden bg-white border-b border-[#E5E8E2] px-4 py-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-[#F8F7F2] p-0.5 rounded-lg border border-[#E5E8E2] w-full">
          <button
            type="button"
            onClick={() => setMobilePane('list')}
            className={`flex-1 py-1.5 rounded font-medium ${
              mobilePane === 'list'
                ? 'bg-[#202C28] text-white'
                : 'text-[#737A74]'
            }`}
          >
            {locale === 'ar'
              ? `المحادثات (${filteredConversations.length})`
              : `Conversations (${filteredConversations.length})`}
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('thread')}
            className={`flex-1 py-1.5 rounded font-medium ${
              mobilePane === 'thread'
                ? 'bg-[#202C28] text-white'
                : 'text-[#737A74]'
            }`}
          >
            {locale === 'ar' ? 'المحادثة النشطة' : 'Discussion'}
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('context')}
            className={`flex-1 py-1.5 rounded font-medium ${
              mobilePane === 'context'
                ? 'bg-[#202C28] text-white'
                : 'text-[#737A74]'
            }`}
          >
            {locale === 'ar' ? 'ملف العميل والمنتج' : 'Contexte client'}
          </button>
        </div>
      </div>

      {/* ================= PANE 1: CONVERSATION LIST & SMART FOLDERS ================= */}
      <section
        aria-label={locale === 'ar' ? 'قائمة المحادثات' : 'Liste des conversations'}
        className={`w-full lg:w-[350px] xl:w-[370px] shrink-0 bg-white border-e border-[#E5E8E2] flex flex-col ${
          mobilePane === 'list' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Top Search & Smart Folders */}
        <div className="p-3.5 border-b border-[#E5E8E2] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-[#20231F]">
              {locale === 'ar' ? 'صندوق الوارد الموحد' : 'Boîte de réception unifiée'}
            </h1>
            <span className="text-xs text-[#737A74] font-num">
              {filteredConversations.length}{' '}
              {locale === 'ar' ? 'محادثة' : 'conversations'}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#737A74] absolute start-3 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                locale === 'ar'
                  ? 'بحث باسم الزبون، الولاية، أو الرسالة...'
                  : 'Rechercher un client, wilaya ou message...'
              }
              aria-label={
                locale === 'ar' ? 'بحث في المحادثات' : 'Rechercher dans les conversations'
              }
              className="w-full h-9 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg ps-9 pe-3 text-xs text-[#20231F] placeholder:text-[#737A74] focus:outline-none focus:ring-1 focus:ring-[#202C28]"
            />
          </div>

          {/* Channel Segmented Filter */}
          <div
            role="group"
            aria-label="Channel filter"
            className="flex items-center gap-1 bg-[#F8F7F2] p-1 rounded-lg border border-[#E5E8E2] text-[11px]"
          >
            {(
              [
                { id: 'all', ar: 'كل القنوات', fr: 'Tous' },
                { id: 'whatsapp_business', ar: 'واتساب', fr: 'WhatsApp' },
                { id: 'instagram_direct', ar: 'إنستغرام', fr: 'Instagram' },
              ] as const
            ).map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannelFilter(ch.id)}
                className={`flex-1 py-1 px-2 rounded font-medium transition-colors whitespace-nowrap ${
                  channelFilter === ch.id
                    ? 'bg-white text-[#20231F] shadow-2xs'
                    : 'text-[#737A74] hover:text-[#20231F]'
                }`}
              >
                {locale === 'ar' ? ch.ar : ch.fr}
              </button>
            ))}
          </div>

          {/* Smart Folders */}
          <div className="flex flex-wrap gap-1">
            {folders.map((f) => {
              const active = folder === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFolder(f.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    active
                      ? 'bg-[#D9E5D4] text-[#202C28] font-semibold'
                      : 'bg-[#F8F7F2] text-[#737A74] hover:text-[#20231F]'
                  }`}
                >
                  <span>{locale === 'ar' ? f.ar : f.fr}</span>
                  <span className="font-num opacity-80">({f.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E8E2]">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-2 text-xs text-[#737A74]">
              <Inbox className="w-6 h-6 text-[#737A74]" />
              <span>
                {locale === 'ar'
                  ? 'لا توجد محادثات مطابقة لمعايير التصفية الحالية.'
                  : 'Aucune conversation ne correspond aux filtres sélectionnés.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFolder('all');
                  setChannelFilter('all');
                  setSearchQuery('');
                }}
                className="mt-1 px-3 py-1.5 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg text-[#20231F] font-medium hover:bg-[#D9E5D4]/40"
              >
                {locale === 'ar' ? 'إعادة ضبط الفلاتر' : 'Réinitialiser les filtres'}
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full text-start p-3.5 transition-colors flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#D9E5D4]/45'
                      : 'bg-white hover:bg-[#F8F7F2]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {conv.unread_count > 0 && (
                        <span
                          aria-label="Unread"
                          className="w-2 h-2 rounded-full bg-[#202C28] shrink-0"
                        />
                      )}
                      <span className="text-sm font-semibold text-[#20231F] truncate">
                        {conv.customer_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#737A74] font-num shrink-0">
                      {new Date(conv.last_message_at).toLocaleTimeString(
                        'en-GB',
                        { hour: '2-digit', minute: '2-digit', hour12: false }
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-[#20231F]/90 line-clamp-2 leading-relaxed">
                    {conv.last_message_preview}
                  </p>

                  {/* Quiet unboxed metadata line */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#737A74] pt-0.5">
                    <span className="font-medium text-[#202C28]">
                      {getChannelLabel(conv.channel, locale)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{getIntentLabel(conv.intent, locale)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-num">
                      {Math.round(conv.intent_confidence * 100)}%
                    </span>
                    {conv.is_high_intent && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#B8A27A] font-semibold">
                          {locale === 'ar' ? 'نية شراء عالية' : 'Haute intention'}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ================= PANE 2: ACTIVE CONVERSATION THREAD & AI COPILOT ================= */}
      <section
        aria-label={locale === 'ar' ? 'سجل المحادثة والرد' : 'Fil de discussion'}
        className={`flex-1 flex flex-col bg-[#F8F7F2] min-w-0 ${
          mobilePane === 'thread' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#737A74]">
            {locale === 'ar'
              ? 'اختر محادثة من القائمة لعرض التفاصيل والرد.'
              : 'Sélectionnez une conversation pour afficher les messages.'}
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="bg-white border-b border-[#E5E8E2] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobilePane('list')}
                  className="lg:hidden p-1.5 rounded border border-[#E5E8E2] text-[#20231F]"
                  aria-label="Back to list"
                >
                  <BackArrow className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#202C28] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {activeConversation.customer_name.slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[#20231F] truncate">
                      {activeConversation.customer_name}
                    </h2>
                    <span className="text-xs text-[#737A74]">·</span>
                    <span className="text-xs text-[#737A74] truncate">
                      {activeConversation.customer_wilaya}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#737A74]">
                    <span>{getChannelLabel(activeConversation.channel, locale)}</span>
                    <span>·</span>
                    <span>
                      {getConversationStatusLabel(
                        activeConversation.status,
                        locale
                      )}
                    </span>
                    <span>·</span>
                    <span>
                      {locale === 'ar' ? 'المسؤول:' : 'Assigné :'}{' '}
                      {activeConversation.assigned_to}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment & Resolution Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateConversationStatus(
                      activeConversation.id,
                      'human_active'
                    )
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    activeConversation.status === 'human_active'
                      ? 'bg-[#D9E5D4] border-[#202C28]/30 text-[#202C28]'
                      : 'bg-white border-[#E5E8E2] text-[#20231F] hover:bg-[#F8F7F2]'
                  }`}
                >
                  {locale === 'ar' ? 'استلام بشري' : 'Suivi humain'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateConversationStatus(
                      activeConversation.id,
                      activeConversation.status === 'resolved'
                        ? 'open'
                        : 'resolved'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#E5E8E2] text-[#20231F] hover:bg-[#F8F7F2] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>
                    {activeConversation.status === 'resolved'
                      ? locale === 'ar'
                        ? 'إعادة فتح المحادثة'
                        : 'Rouvrir'
                      : locale === 'ar'
                      ? 'إغلاق كمحلولة'
                      : 'Marquer résolue'}
                  </span>
                </button>
              </div>
            </div>

            {/* Message History Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeMessages.map((msg) => {
                if (msg.sender_type === 'internal_note') {
                  return (
                    <div
                      key={msg.id}
                      className="max-w-xl mx-auto bg-white border border-[#B8A27A]/50 rounded-lg p-3 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#737A74]">
                        <span className="font-semibold text-[#20231F] flex items-center gap-1.5">
                          <StickyNote className="w-3.5 h-3.5 text-[#B8A27A]" />
                          {locale === 'ar'
                            ? `ملاحظة داخلية للفريق (غير مرئية للعميل) — ${msg.sender_name}`
                            : `Note interne d’équipe (invisible au client) — ${msg.sender_name}`}
                        </span>
                        <span className="font-num">
                          {new Date(msg.created_at).toLocaleTimeString(
                            'en-GB',
                            { hour: '2-digit', minute: '2-digit', hour12: false }
                          )}
                        </span>
                      </div>
                      <p className="text-[#20231F] leading-relaxed">{msg.body}</p>
                    </div>
                  );
                }

                const isMerchant = msg.sender_type === 'merchant';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMerchant ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[82%] sm:max-w-[72%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMerchant
                          ? 'bg-[#202C28] text-white'
                          : 'bg-white border border-[#E5E8E2] text-[#20231F]'
                      }`}
                    >
                      <p>{msg.body}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-[#737A74]">
                      <span>{msg.sender_name}</span>
                      <span>·</span>
                      <span className="font-num">
                        {new Date(msg.created_at).toLocaleTimeString(
                          'en-GB',
                          { hour: '2-digit', minute: '2-digit', hour12: false }
                        )}
                      </span>
                      {isMerchant && (
                        <>
                          <span>·</span>
                          <span>
                            {msg.ai_generated
                              ? locale === 'ar'
                                ? 'مسودة ذكية معتمدة من التاجر'
                                : 'Brouillon IA validé'
                              : locale === 'ar'
                              ? 'تم الإرسال'
                              : 'Envoyé'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ================= AI SUGGESTION CARD (Warm Ivory Surface) ================= */}
            <div className="px-4 pt-2">
              <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-xl p-3.5 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="w-4 h-4 text-[#B8A27A]" />
                    <span className="font-semibold text-[#20231F]">
                      {locale === 'ar'
                        ? 'اقتراح الرد الذكي المستند لبيانات المتجر'
                        : 'Suggestion de réponse IA basée sur les données vérifiées'}
                    </span>
                    <span className="text-[#737A74]">·</span>
                    <span className="text-[11px] text-[#737A74]">
                      {locale === 'ar'
                        ? 'لا يتم الإرسال تلقائياً دون مراجعتك'
                        : 'Envoi manuel après votre validation'}
                    </span>
                  </div>

                  {/* Language & Tone Selectors */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <select
                      aria-label={locale === 'ar' ? 'لغة الرد الذكي' : 'Langue du brouillon'}
                      value={draftLanguage}
                      onChange={(e) =>
                        setDraftLanguage(e.target.value as ReplyLanguage)
                      }
                      className="h-7 bg-white border border-[#E5E8E2] rounded px-2 text-xs text-[#20231F]"
                    >
                      <option value="darja">الدارجة الجزائرية (Darja)</option>
                      <option value="ar">العربية الفصحى (Arabe)</option>
                      <option value="fr">Français (FR)</option>
                    </select>

                    <select
                      aria-label={locale === 'ar' ? 'نبرة الرد الذكي' : 'Ton du brouillon'}
                      value={draftTone}
                      onChange={(e) => setDraftTone(e.target.value as AITone)}
                      className="h-7 bg-white border border-[#E5E8E2] rounded px-2 text-xs text-[#20231F]"
                    >
                      <option value="friendly">
                        {locale === 'ar' ? 'نبرة ودودة' : 'Ton chaleureux'}
                      </option>
                      <option value="professional">
                        {locale === 'ar' ? 'نبرة احترافية' : 'Ton professionnel'}
                      </option>
                      <option value="concise">
                        {locale === 'ar' ? 'مختصر ومباشر' : 'Ton concis'}
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={handleGenerateDraft}
                      disabled={generatingDraft}
                      className="h-7 px-2.5 bg-[#202C28] hover:bg-[#2C3D38] text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      {generatingDraft ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {activeAIDraft
                          ? locale === 'ar'
                            ? 'إعادة توليد المسودة'
                            : 'Régénérer le brouillon'
                          : locale === 'ar'
                          ? 'توليد مسودة رد ذكي'
                          : 'Générer un brouillon IA'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Display Generated Draft & Missing Info Warnings */}
                {activeAIDraft ? (
                  <div className="bg-white border border-[#E5E8E2] rounded-lg p-3 flex flex-col gap-2.5">
                    {activeAIDraft.missing_info_warnings.length > 0 && (
                      <div
                        role="alert"
                        className="bg-[#D97706]/10 border border-[#D97706]/30 text-[#20231F] p-2.5 rounded-lg text-xs flex items-start gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#D97706]">
                            {locale === 'ar'
                              ? 'تنبيه نقص البيانات (حماية ضد اختلاق المعلومات):'
                              : 'Avertissement données manquantes (Anti-hallucination) :'}
                          </span>
                          {activeAIDraft.missing_info_warnings.map((w, idx) => (
                            <span key={idx}>{w}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs sm:text-sm text-[#20231F] leading-relaxed">
                      {activeAIDraft.draft_text}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E5E8E2]">
                      <span className="text-[11px] text-[#737A74]">
                        {locale === 'ar'
                          ? `النية المكتشفة: ${getIntentLabel(
                              activeAIDraft.intent,
                              locale
                            )} (${Math.round(activeAIDraft.confidence * 100)}%)`
                          : `Intention : ${getIntentLabel(
                              activeAIDraft.intent,
                              locale
                            )} (${Math.round(activeAIDraft.confidence * 100)}%)`}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleInsertDraftIntoComposer}
                          className="px-3 py-1.5 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          {locale === 'ar'
                            ? 'إدراج الرد المقترح'
                            : 'Insérer le brouillon'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#737A74] flex items-center justify-between">
                    <span>
                      {locale === 'ar'
                        ? 'اضغط على "توليد مسودة رد ذكي" لتحضير جواب مستند إلى أسعار ومخزون الكتالوج الفعلي.'
                        : 'Cliquez sur "Générer un brouillon IA" pour préparer une réponse basée sur votre catalogue.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ================= REPLY COMPOSER ================= */}
            <form
              onSubmit={handleSendComposer}
              className="p-4 bg-white border-t border-[#E5E8E2] mt-2 flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  role="group"
                  aria-label="Composer mode"
                  className="flex items-center gap-1 bg-[#F8F7F2] p-0.5 rounded-lg border border-[#E5E8E2] text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setComposerMode('merchant')}
                    className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 ${
                      composerMode === 'merchant'
                        ? 'bg-[#202C28] text-white'
                        : 'text-[#737A74] hover:text-[#20231F]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'ar' ? 'رد للعميل' : 'Réponse client'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerMode('internal_note')}
                    className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 ${
                      composerMode === 'internal_note'
                        ? 'bg-[#B8A27A] text-white'
                        : 'text-[#737A74] hover:text-[#20231F]'
                    }`}
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'ar'
                        ? 'ملاحظة داخلية للفريق'
                        : 'Note interne'}
                    </span>
                  </button>
                </div>

                <span className="text-[11px] text-[#737A74]">
                  {composerMode === 'internal_note'
                    ? locale === 'ar'
                      ? 'الملاحظات الداخلية يراها أعضاء الفريق فقط'
                      : 'Visible uniquement par votre équipe'
                    : locale === 'ar'
                    ? `سيتم الإرسال عبر ${getChannelLabel(
                        activeConversation.channel,
                        locale
                      )}`
                    : `Envoi via ${getChannelLabel(
                        activeConversation.channel,
                        locale
                      )}`}
                </span>
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={composerText}
                  onChange={(e) =>
                    setComposerDraftForConv(
                      activeConversation.id,
                      e.target.value
                    )
                  }
                  placeholder={
                    composerMode === 'internal_note'
                      ? locale === 'ar'
                        ? 'اكتب ملاحظة داخلية لزملائك حول هذه الطلبية أو العميل...'
                        : 'Rédigez une note interne pour votre équipe...'
                      : locale === 'ar'
                      ? 'اكتب ردك هنا أو أدرج المسودة الذكية لمراجعتها...'
                      : 'Rédigez votre réponse ou insérez un brouillon IA...'
                  }
                  aria-label={
                    locale === 'ar' ? 'مربع كتابة الرسالة' : 'Zone de saisie du message'
                  }
                  className="flex-1 bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-2.5 text-sm text-[#20231F] placeholder:text-[#737A74] focus:outline-none focus:ring-2 focus:ring-[#202C28] resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || !composerText.trim()}
                  className="h-10 px-4 bg-[#202C28] hover:bg-[#2C3D38] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {composerMode === 'internal_note'
                      ? locale === 'ar'
                        ? 'حفظ الملاحظة'
                        : 'Ajouter la note'
                      : locale === 'ar'
                      ? 'إرسال الرد'
                      : 'Envoyer'}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      {/* ================= PANE 3: MERCHANT / CUSTOMER / ORDER CONTEXT PANEL ================= */}
      <aside
        aria-label={
          locale === 'ar' ? 'سياق العميل والطلبيات' : 'Contexte client et commandes'
        }
        className={`w-full lg:w-[310px] xl:w-[330px] shrink-0 bg-white border-s border-[#E5E8E2] p-4 flex flex-col gap-5 overflow-y-auto ${
          mobilePane === 'context' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {activeConversation ? (
          <>
            {/* Customer Profile Summary */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-[#E5E8E2]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#737A74]">
                  {locale === 'ar' ? 'بيانات الزبون' : 'Profil Client'}
                </h3>
                {activeCustomer?.is_vip && (
                  <span className="text-[11px] font-semibold text-[#B8A27A]">
                    VIP
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <span className="text-sm font-semibold text-[#20231F]">
                  {activeConversation.customer_name}
                </span>
                <div className="flex items-center gap-2 text-[#737A74]">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-num" dir="ltr">
                    {activeConversation.customer_phone}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#737A74]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{activeConversation.customer_wilaya}</span>
                </div>
              </div>

              {activeCustomer && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-2 flex flex-col">
                    <span className="text-[11px] text-[#737A74]">
                      {locale === 'ar' ? 'إجمالي المشتريات' : 'Total dépensé'}
                    </span>
                    <span className="text-xs font-semibold text-[#20231F] font-num mt-0.5">
                      {formatDzd(activeCustomer.lifetime_spend_dzd, locale)}
                    </span>
                  </div>
                  <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-2 flex flex-col">
                    <span className="text-[11px] text-[#737A74]">
                      {locale === 'ar' ? 'عدد الطلبيات' : 'Commandes'}
                    </span>
                    <span className="text-xs font-semibold text-[#20231F] font-num mt-0.5">
                      {activeCustomer.total_orders}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Grounded Catalog Products Linked to Conversation */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-[#E5E8E2]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#737A74] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>
                    {locale === 'ar'
                      ? 'المنتجات المرتبطة بالاستفسار'
                      : 'Produits associés'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/app/products')}
                  className="text-[11px] text-[#202C28] hover:underline"
                >
                  {locale === 'ar' ? 'الكتالوج' : 'Catalogue'}
                </button>
              </div>

              {relatedProducts.length === 0 ? (
                <span className="text-xs text-[#737A74]">
                  {locale === 'ar'
                    ? 'لا يوجد منتج محدد مرتبط بهذه المحادثة.'
                    : 'Aucun produit associé.'}
                </span>
              ) : (
                relatedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-[#20231F]">
                        {locale === 'ar' ? prod.name_ar : prod.name_fr}
                      </span>
                      <span className="font-code text-[11px] text-[#737A74] shrink-0">
                        {prod.sku}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-semibold text-[#202C28] font-num">
                        {formatDzd(prod.price_dzd, locale)}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          prod.stock_quantity === null
                            ? 'text-[#D97706]'
                            : prod.stock_quantity > 0
                            ? 'text-[#2E7D32]'
                            : 'text-[#DC2626]'
                        }`}
                      >
                        {prod.stock_quantity === null
                          ? locale === 'ar'
                            ? 'المخزون غير مؤكد'
                            : 'Stock non vérifié'
                          : prod.stock_quantity > 0
                          ? locale === 'ar'
                            ? `متوفر (${prod.stock_quantity} قطعة)`
                            : `En stock (${prod.stock_quantity})`
                          : locale === 'ar'
                          ? 'نفد المخزون'
                          : 'Rupture'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Related Orders & Draft Preparation */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#737A74] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>
                    {locale === 'ar'
                      ? 'الطلبيات ومسودات الشراء'
                      : 'Commandes & Brouillons'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/app/orders')}
                  className="text-[11px] text-[#202C28] hover:underline"
                >
                  {locale === 'ar' ? 'كل الطلبيات' : 'Voir tout'}
                </button>
              </div>

              {relatedOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 flex flex-col gap-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-code font-semibold text-[#20231F]">
                      {ord.order_number}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
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
                  </div>
                  <div className="flex items-center justify-between text-[#737A74]">
                    <span>{ord.wilaya}</span>
                    <span className="font-semibold text-[#20231F] font-num">
                      {formatDzd(ord.total_dzd, locale)}
                    </span>
                  </div>
                  {ord.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => navigate('/app/orders')}
                      className="mt-1 w-full py-1.5 bg-white border border-[#E5E8E2] rounded text-[11px] font-medium text-[#202C28] hover:bg-[#D9E5D4]/40"
                    >
                      {locale === 'ar'
                        ? 'مراجعة وتأكيد المسودة'
                        : 'Vérifier et confirmer le brouillon'}
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleQuickCreateDraftOrder}
                className="w-full h-9 px-3 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {locale === 'ar'
                    ? 'إعداد مسودة طلب للمراجعة'
                    : 'Préparer un brouillon de commande'}
                </span>
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
