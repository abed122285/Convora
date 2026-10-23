import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type {
  AIDraftSuggestion,
  AITone,
  AIUsageRecord,
  AuditLogEntry,
  AutomationRule,
  ChannelConnection,
  Conversation,
  CustomerProfile,
  Lead,
  MemberRole,
  Message,
  Order,
  Product,
  ReplyLanguage,
  Store,
  StoreMember,
  UILocale,
  WebhookEventRecord,
} from '../types/domain';
import { generateDeterministicGroundedDraft } from '../lib/ai/engine';

export type AppRoute =
  | '/login'
  | '/signup'
  | '/forgot-password'
  | '/verify-email'
  | '/app/dashboard'
  | '/app/inbox'
  | '/app/ai-assistant'
  | '/app/customers'
  | '/app/leads'
  | '/app/orders'
  | '/app/products'
  | '/app/ai-settings'
  | '/app/automations'
  | '/app/channels'
  | '/app/analytics'
  | '/app/settings';

const VALID_ROUTES: AppRoute[] = [
  '/login',
  '/signup',
  '/forgot-password',
  '/verify-email',
  '/app/dashboard',
  '/app/inbox',
  '/app/ai-assistant',
  '/app/customers',
  '/app/leads',
  '/app/orders',
  '/app/products',
  '/app/ai-settings',
  '/app/automations',
  '/app/channels',
  '/app/analytics',
  '/app/settings',
];

function resolveRouteFromLocation(): AppRoute {
  if (typeof window === 'undefined') return '/app/inbox';
  const path = window.location.pathname as AppRoute;
  if (VALID_ROUTES.includes(path)) {
    return path;
  }
  return '/app/inbox';
}

export interface SystemIntegrationStatus {
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
  metaConfigured: boolean;
  runtimeModel: string;
}

export interface StoreSnapshotData {
  store: Store;
  currentMember: StoreMember;
  members: StoreMember[];
  channels: ChannelConnection[];
  products: Product[];
  customers: CustomerProfile[];
  conversations: Conversation[];
  messages: Message[];
  leads: Lead[];
  orders: Order[];
  automations: AutomationRule[];
  aiUsage: AIUsageRecord[];
  webhookEvents: WebhookEventRecord[];
  auditLogs: AuditLogEntry[];
}

interface ConvoraContextValue {
  route: AppRoute;
  navigate: (nextRoute: AppRoute) => void;
  locale: UILocale;
  setLocale: (next: UILocale) => void;
  dir: 'rtl' | 'ltr';
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  activeUserId: string;
  setActiveUserId: (userId: string) => void;
  activeStoreId: string;
  setActiveStoreId: (storeId: string) => void;
  selectedConversationId: string;
  setSelectedConversationId: (id: string) => void;
  composerDraftByConv: Record<string, string>;
  setComposerDraftForConv: (convId: string, text: string) => void;
  aiDraftByConv: Record<string, AIDraftSuggestion | undefined>;
  snapshot: StoreSnapshotData | null;
  loading: boolean;
  accessDeniedError: string | null;
  actionFeedback: { type: 'success' | 'error'; message: string } | null;
  clearFeedback: () => void;
  systemStatus: SystemIntegrationStatus;
  refreshSnapshot: () => Promise<void>;
  sendMessage: (params: {
    conversationId: string;
    body: string;
    senderType: 'merchant' | 'internal_note';
    aiGenerated?: boolean;
  }) => Promise<boolean>;
  updateConversationStatus: (
    conversationId: string,
    nextStatus: Conversation['status']
  ) => Promise<boolean>;
  generateAIDraft: (params: {
    conversationId: string;
    language: ReplyLanguage;
    tone: AITone;
    customInstructions?: string;
  }) => Promise<AIDraftSuggestion | null>;
  createProduct: (input: {
    sku: string;
    name_ar: string;
    name_fr: string;
    description_ar: string;
    description_fr: string;
    category: string;
    price_dzd: number;
    stock_quantity: number | null;
    ai_visible: boolean;
    variants: Product['variants'];
  }) => Promise<boolean>;
  createOrderDraft: (input: {
    conversationId?: string | null;
    customerId: string;
    customerName: string;
    customerPhone: string;
    wilaya: string;
    commune: string;
    deliveryType: 'home' | 'stop_desk';
    isAiDraft: boolean;
    shippingFeeDzd: number;
    notes: string;
    items: Array<{ productId: string; variantLabel: string; quantity: number }>;
  }) => Promise<boolean>;
  transitionOrder: (
    orderId: string,
    nextStatus: Order['status']
  ) => Promise<boolean>;
  updateLeadStage: (
    leadId: string,
    stage: Lead['stage'],
    notes?: string
  ) => Promise<boolean>;
  updateAISettings: (input: {
    ai_enabled: boolean;
    default_language: ReplyLanguage;
    ai_tone: AITone;
    require_human_approval: boolean;
    confidence_threshold: number;
    return_policy: string;
    shipping_policy: string;
  }) => Promise<boolean>;
  toggleAutomation: (automationId: string) => Promise<boolean>;
  simulateWebhook: (input: {
    provider: ChannelConnection['provider'];
    externalEventId: string;
    customerName: string;
    customerHandle: string;
    customerWilaya: string;
    messageBody: string;
    validSignature: boolean;
  }) => Promise<{ ok: boolean; duplicate?: boolean; rejectedSignature?: boolean }>;
}

const ConvoraContext = createContext<ConvoraContextValue | null>(null);

export function ConvoraProvider({ children }: { children: React.ReactNode }) {
  const [route, setRouteState] = useState<AppRoute>(() =>
    resolveRouteFromLocation()
  );
  const [locale, setLocaleState] = useState<UILocale>('ar');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeUserId, setActiveUserId] = useState<string>('user_amel_owner');
  const [activeStoreId, setActiveStoreId] = useState<string>(
    'store_casbah_atelier'
  );
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>('conv_yasmine_1');
  const [composerDraftByConv, setComposerDraftByConv] = useState<
    Record<string, string>
  >({});
  const [aiDraftByConv, setAiDraftByConv] = useState<
    Record<string, AIDraftSuggestion | undefined>
  >({});

  const [snapshot, setSnapshot] = useState<StoreSnapshotData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(
    null
  );
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [systemStatus, setSystemStatus] = useState<SystemIntegrationStatus>({
    supabaseConfigured: false,
    geminiConfigured: false,
    metaConfigured: false,
    runtimeModel: 'gemini-3.8-flash',
  });

  const dir: 'rtl' | 'ltr' = locale === 'ar' ? 'rtl' : 'ltr';

  const setLocale = useCallback((next: UILocale) => {
    setLocaleState(next);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = next;
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  const navigate = useCallback((nextRoute: AppRoute) => {
    setRouteState(nextRoute);
    if (typeof window !== 'undefined' && window.location.pathname !== nextRoute) {
      window.history.pushState({}, '', nextRoute);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRouteState(resolveRouteFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const showFeedback = useCallback(
    (type: 'success' | 'error', message: string) => {
      setActionFeedback({ type, message });
      setTimeout(() => {
        setActionFeedback((prev) =>
          prev?.message === message ? null : prev
        );
      }, 4500);
    },
    []
  );

  const clearFeedback = useCallback(() => setActionFeedback(null), []);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-convora-user-id': activeUserId,
      'x-convora-store-id': activeStoreId,
    }),
    [activeUserId, activeStoreId]
  );

  const refreshSnapshot = useCallback(async () => {
    setLoading(true);
    setAccessDeniedError(null);
    try {
      const [snapRes, sysRes] = await Promise.all([
        fetch('/api/store/snapshot', {
          headers: authHeaders(),
        }),
        fetch('/api/system/status'),
      ]);

      if (sysRes.ok) {
        const sysJson = await sysRes.json();
        if (sysJson.integrations) {
          setSystemStatus(sysJson.integrations);
        }
      }

      const snapJson = await snapRes.json();
      if (!snapRes.ok || !snapJson.ok) {
        setAccessDeniedError(
          snapJson.message ||
            'تم رفض الوصول (Cross-Tenant / Authorization Protection)'
        );
        setSnapshot(null);
      } else {
        setSnapshot(snapJson.data);
        if (
          snapJson.data.conversations.length > 0 &&
          !snapJson.data.conversations.some(
            (c: Conversation) => c.id === selectedConversationId
          )
        ) {
          setSelectedConversationId(snapJson.data.conversations[0].id);
        }
      }
    } catch {
      setAccessDeniedError('تعذر الاتصال بالخادم المحلي.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, selectedConversationId]);

  useEffect(() => {
    refreshSnapshot();
  }, [activeUserId, activeStoreId]);

  const setComposerDraftForConv = useCallback(
    (convId: string, text: string) => {
      setComposerDraftByConv((prev) => ({ ...prev, [convId]: text }));
    },
    []
  );

  const sendMessage: ConvoraContextValue['sendMessage'] = async (params) => {
    const res = await fetch('/api/inbox/messages', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      showFeedback(
        'error',
        json.code === 'INSUFFICIENT_ROLE_ANALYST'
          ? locale === 'ar'
            ? 'دور "محلل" للقراءة فقط — غير مصرح بإرسال رسائل للزبائن.'
            : 'Rôle Analyste (lecture seule) : envoi de messages non autorisé.'
          : json.message || 'تعذر إرسال الرسالة'
      );
      return false;
    }
    await refreshSnapshot();
    showFeedback(
      'success',
      params.senderType === 'internal_note'
        ? locale === 'ar'
          ? 'تم حفظ الملاحظة الداخلية للفريق'
          : 'Note interne enregistrée'
        : locale === 'ar'
        ? 'تم إرسال الرد للعميل بنجاح'
        : 'Réponse envoyée au client'
    );
    return true;
  };

  const updateConversationStatus: ConvoraContextValue['updateConversationStatus'] =
    async (conversationId, nextStatus) => {
      const res = await fetch(
        `/api/inbox/conversations/${conversationId}/status`,
        {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ nextStatus }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showFeedback('error', json.code || 'تعذر تحديث حالة المحادثة');
        return false;
      }
      await refreshSnapshot();
      showFeedback(
        'success',
        locale === 'ar'
          ? 'تم تحديث حالة المحادثة'
          : 'Statut de la conversation mis à jour'
      );
      return true;
    };

  const generateAIDraft: ConvoraContextValue['generateAIDraft'] = async (
    params
  ) => {
    const res = await fetch('/api/ai/generate-draft', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      showFeedback(
        'error',
        json.code === 'INSUFFICIENT_ROLE_ANALYST'
          ? locale === 'ar'
            ? 'دور المحلل غير مخول لتوليد ردود الذكاء الاصطناعي.'
            : 'Rôle Analyste non autorisé à générer des brouillons.'
          : json.message || 'تعذر توليد مسودة الرد الذكي'
      );
      return null;
    }
    const draft = json.data as AIDraftSuggestion;
    setAiDraftByConv((prev) => ({
      ...prev,
      [params.conversationId]: draft,
    }));
    await refreshSnapshot();
    return draft;
  };

  const createProduct: ConvoraContextValue['createProduct'] = async (input) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      showFeedback('error', json.message || json.code || 'تعذر إنشاء المنتج');
      return false;
    }
    await refreshSnapshot();
    showFeedback(
      'success',
      locale === 'ar'
        ? `تمت إضافة المنتج "${input.name_ar}" للكتالوج`
        : `Produit "${input.name_fr}" ajouté au catalogue`
    );
    return true;
  };

  const createOrderDraft: ConvoraContextValue['createOrderDraft'] = async (
    input
  ) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      showFeedback('error', json.message || json.code || 'تعذر إنشاء الطلب');
      return false;
    }
    await refreshSnapshot();
    showFeedback(
      'success',
      locale === 'ar'
        ? `تم إنشاء مسودة الطلب ${json.data.order_number} للمراجعة`
        : `Brouillon de commande ${json.data.order_number} créé`
    );
    return true;
  };

  const transitionOrder: ConvoraContextValue['transitionOrder'] = async (
    orderId,
    nextStatus
  ) => {
    const res = await fetch('/api/orders/transition', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ orderId, nextStatus }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      showFeedback(
        'error',
        json.code || json.message || 'انتقال حالة الطلب غير مسموح'
      );
      return false;
    }
    await refreshSnapshot();
    showFeedback(
      'success',
      locale === 'ar'
        ? `تم تحديث حالة الطلب ${json.data.order_number} بنجاح`
        : `Statut de la commande ${json.data.order_number} mis à jour`
    );
    return true;
  };

  const updateLeadStage: ConvoraContextValue['updateLeadStage'] = async (
    leadId,
    stage,
    notes
  ) => {
    const res = await fetch('/api/leads/stage', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ leadId, stage, notes }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      showFeedback('error', json.code || 'تعذر تحديث مرحلة الفرصة البيعية');
      return false;
    }
    await refreshSnapshot();
    showFeedback(
      'success',
      locale === 'ar'
        ? 'تم تحديث مرحلة العميل المحتمل'
        : 'Étape du prospect mise à jour'
    );
    return true;
  };

  const updateAISettings: ConvoraContextValue['updateAISettings'] = async (
    input
  ) => {
    const res = await fetch('/api/settings/ai', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      showFeedback('error', json.code || 'غير مصرح بتعديل إعدادات الذكاء الاصطناعي');
      return false;
    }
    await refreshSnapshot();
    showFeedback(
      'success',
      locale === 'ar'
        ? 'تم حفظ إعدادات الذكاء الاصطناعي وسياسات المتجر'
        : 'Paramètres IA et politiques enregistrés'
    );
    return true;
  };

  const toggleAutomation: ConvoraContextValue['toggleAutomation'] = async (
    automationId
  ) => {
    const res = await fetch(`/api/automations/${automationId}/toggle`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      showFeedback('error', json.code || 'غير مصرح بتعديل قواعد الأتمتة');
      return false;
    }
    await refreshSnapshot();
    showFeedback(
      'success',
      locale === 'ar'
        ? 'تم تحديث حالة قاعدة الأتمتة'
        : 'Règle d’automatisation mise à jour'
    );
    return true;
  };

  const simulateWebhook: ConvoraContextValue['simulateWebhook'] = async (
    input
  ) => {
    const res = await fetch('/api/webhooks/meta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': input.validSignature
          ? 'convora-hmac-verified-2026'
          : 'invalid-forged-signature',
      },
      body: JSON.stringify({
        provider: input.provider,
        externalEventId: input.externalEventId,
        storeSlug: snapshot?.store.slug || 'casbah-atelier-dz',
        customerName: input.customerName,
        customerHandle: input.customerHandle,
        customerWilaya: input.customerWilaya,
        messageBody: input.messageBody,
        signatureHeader: input.validSignature
          ? 'convora-hmac-verified-2026'
          : 'invalid-forged-signature',
      }),
    });
    const json = await res.json();
    await refreshSnapshot();
    if (!res.ok) {
      showFeedback(
        'error',
        locale === 'ar'
          ? 'تم رفض الـ Webhook بسبب توقيع غير صالح (401 Signature Rejected)'
          : 'Webhook rejeté : signature invalide (401)'
      );
      return { ok: false, rejectedSignature: true };
    }
    if (json.data?.duplicate) {
      showFeedback(
        'error',
        locale === 'ar'
          ? 'تم تجاهل الـ Webhook المكرر تلقائياً (Idempotency Protection)'
          : 'Webhook dupliqué ignoré (Protection d’idempotence)'
      );
      return { ok: true, duplicate: true };
    }
    showFeedback(
      'success',
      locale === 'ar'
        ? 'تم استلام رسالة الـ Webhook وإنشاء المحادثة في صندوق الوارد'
        : 'Message Webhook reçu et ajouté à la boîte de réception'
    );
    return { ok: true, duplicate: false };
  };

  return (
    <ConvoraContext.Provider
      value={{
        route,
        navigate,
        locale,
        setLocale,
        dir,
        isAuthenticated,
        setIsAuthenticated,
        activeUserId,
        setActiveUserId,
        activeStoreId,
        setActiveStoreId,
        selectedConversationId,
        setSelectedConversationId,
        composerDraftByConv,
        setComposerDraftForConv,
        aiDraftByConv,
        snapshot,
        loading,
        accessDeniedError,
        actionFeedback,
        clearFeedback,
        systemStatus,
        refreshSnapshot,
        sendMessage,
        updateConversationStatus,
        generateAIDraft,
        createProduct,
        createOrderDraft,
        transitionOrder,
        updateLeadStage,
        updateAISettings,
        toggleAutomation,
        simulateWebhook,
      }}
    >
      {children}
    </ConvoraContext.Provider>
  );
}

export function useConvora() {
  const ctx = useContext(ConvoraContext);
  if (!ctx) {
    throw new Error('useConvora must be used inside ConvoraProvider');
  }
  return ctx;
}
