import type {
  ChannelProvider,
  ConversationStatus,
  CustomerIntent,
  LeadStage,
  OrderStatus,
  UILocale,
} from '../../types/domain';

export function formatDzd(amount: number, locale: UILocale): string {
  const formatted = amount.toLocaleString('en-US');
  return locale === 'ar' ? `${formatted} د.ج` : `${formatted} DZD`;
}

export function getChannelLabel(provider: ChannelProvider, locale: UILocale): string {
  const labels: Record<ChannelProvider, { ar: string; fr: string }> = {
    whatsapp_business: { ar: 'واتساب للأعمال', fr: 'WhatsApp Business' },
    instagram_direct: { ar: 'إنستغرام دايركت', fr: 'Instagram Direct' },
    facebook_messenger: { ar: 'فيسبوك مسنجر', fr: 'Facebook Messenger' },
  };
  return labels[provider][locale];
}

export function getIntentLabel(intent: CustomerIntent, locale: UILocale): string {
  const labels: Record<CustomerIntent, { ar: string; fr: string }> = {
    greeting: { ar: 'ترحيب واستفسار عام', fr: 'Salutation' },
    price_inquiry: { ar: 'استفسار عن السعر', fr: 'Demande de prix' },
    product_inquiry: { ar: 'تفاصيل المنتج', fr: 'Info produit' },
    size_stock_inquiry: { ar: 'توفر المقاس والمخزون', fr: 'Taille & Stock' },
    order_request: { ar: 'طلب شراء جديد', fr: 'Intention de commande' },
    order_tracking: { ar: 'تتبع طلبية', fr: 'Suivi de colis' },
    shipping_wilaya: { ar: 'التوصيل والولايات', fr: 'Livraison Wilaya' },
    exchange_complaint: { ar: 'استبدال مقاس / شكوى', fr: 'Échange / Réclamation' },
    human_handoff: { ar: 'تحويل لمسؤول بشري', fr: 'Transfert humain' },
    vip_lead: { ar: 'عميل VIP', fr: 'Client VIP' },
    unknown: { ar: 'غير مصنف', fr: 'Non classé' },
  };
  return labels[intent]?.[locale] ?? intent;
}

export function getConversationStatusLabel(
  status: ConversationStatus,
  locale: UILocale
): string {
  const map: Record<ConversationStatus, { ar: string; fr: string }> = {
    open: { ar: 'مفتوحة', fr: 'Ouverte' },
    pending_review: { ar: 'بانتظار مراجعة التاجر', fr: 'À vérifier' },
    human_active: { ar: 'متابعة بشرية', fr: 'Suivi humain' },
    resolved: { ar: 'مغلقة / محلولة', fr: 'Résolue' },
  };
  return map[status][locale];
}

export function getOrderStatusLabel(status: OrderStatus, locale: UILocale): string {
  const map: Record<OrderStatus, { ar: string; fr: string }> = {
    draft: { ar: 'مسودة غير مؤكدة', fr: 'Brouillon non confirmé' },
    pending_confirmation: { ar: 'بانتظار التأكيد الهاتفي', fr: 'En attente de confirmation' },
    confirmed: { ar: 'طلب مؤكد', fr: 'Confirmée' },
    shipped: { ar: 'قيد التوصيل (مشحون)', fr: 'Expédiée' },
    delivered: { ar: 'تم التسليم', fr: 'Livrée' },
    cancelled: { ar: 'ملغى', fr: 'Annulée' },
  };
  return map[status][locale];
}

export function getLeadStageLabel(stage: LeadStage, locale: UILocale): string {
  const map: Record<LeadStage, { ar: string; fr: string }> = {
    new: { ar: 'جديد', fr: 'Nouveau' },
    qualified: { ar: 'مؤهل', fr: 'Qualifié' },
    high_intent: { ar: 'نية شراء عالية', fr: 'Haute intention' },
    follow_up: { ar: 'متابعة مطلوبة', fr: 'À relancer' },
    converted: { ar: 'تحول لطلب', fr: 'Converti' },
    lost: { ar: 'مغلق', fr: 'Perdu' },
  };
  return map[stage][locale];
}

export const UI_COPY = {
  ar: {
    brandPromise: 'كل محادثة. تحت السيطرة.',
    nav: {
      dashboard: 'لوحة التحكم',
      inbox: 'صندوق الوارد الموحد',
      aiAssistant: 'مساعد الرد الذكي',
      customers: 'الزبائن',
      leads: 'الفرص البيعية',
      orders: 'الطلبيات',
      products: 'المنتجات والمخزون',
      aiSettings: 'إعدادات الذكاء الاصطناعي',
      automations: 'الأتمتة وقواعد العمل',
      channels: 'قنوات التواصل',
      analytics: 'التحليلات والأداء',
      settings: 'الإعدادات والأمان',
    },
  },
  fr: {
    brandPromise: 'Chaque conversation. Sous contrôle.',
    nav: {
      dashboard: 'Tableau de bord',
      inbox: 'Boîte de réception',
      aiAssistant: 'Assistant IA',
      customers: 'Clients',
      leads: 'Prospects (Leads)',
      orders: 'Commandes',
      products: 'Produits & Stock',
      aiSettings: 'Paramètres IA',
      automations: 'Automatisations',
      channels: 'Canaux connectés',
      analytics: 'Analytique',
      settings: 'Paramètres & Sécurité',
    },
  },
};
