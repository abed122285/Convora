import type {
  AIDraftSuggestion,
  AIUsageRecord,
  AuditLogEntry,
  AutomationRule,
  ChannelConnection,
  Conversation,
  CustomerProfile,
  Lead,
  Message,
  Order,
  Product,
  Store,
  StoreMember,
  WebhookEventRecord,
} from '../../types/domain';
import {
  authorizeStoreAction,
  buildWebhookIdempotencyKey,
  calculateVerifiedOrderTotals,
  canTransitionConversationStatus,
  canTransitionOrderStatus,
  type SecurityAction,
} from '../security/authz';
import {
  classifyCustomerIntent,
  generateDeterministicGroundedDraft,
} from '../ai/engine';

export interface AuthenticatedSession {
  userId: string;
  email: string;
  fullName: string;
  activeStoreId: string;
}

export class MultiTenantStoreRepository {
  public stores: Store[] = [
    {
      id: 'store_casbah_atelier',
      name: 'دار القصبة للأزياء المحتشمة — Casbah Atelier',
      slug: 'casbah-atelier-dz',
      category: 'Modest Fashion & Beauté',
      wilaya: '16 - الجزائر العاصمة (Alger)',
      currency: 'DZD',
      default_language: 'ar',
      ai_tone: 'friendly',
      ai_enabled: true,
      require_human_approval: true,
      confidence_threshold: 0.82,
      return_policy:
        'استبدال مجاني للمقاس خلال 48 ساعة من الاستلام بشرط بقاء البطاقة الأصلية. الاسترجاع النقدي في حال وجود عيب مصنعي فقط.',
      shipping_policy:
        'التوصيل متوفر لـ 58 ولاية عبر ياليدين و ZR Express: الجزائر العاصمة (400 د.ج للمنزل / 250 د.ج مكتب)، الولايات الكبرى وهران وقسنطينة وسطيف (650 د.ج للمنزل / 450 د.ج مكتب) خلال 24-48 ساعة.',
      faqs: [
        {
          id: 'faq_1',
          question: 'هل الدفع عند الاستلام متوفر؟',
          answer:
            'نعم، الدفع عند الاستلام (Main à main) متوفر في جميع الولايات الـ 58 مع إمكانية فحص الطرد قبل الدفع.',
        },
        {
          id: 'faq_2',
          question: 'كيفاش نختار المقاس المناسب في العبايات؟',
          answer:
            'عبايات حرير المدينة متوفرة بالمقاسات Standard (38-40) و Large (42-44) و XL (46-48) مع جدول قياسات بالسنتيمتر.',
        },
        {
          id: 'faq_3',
          question: 'Quels sont les délais de livraison vers Oran et Constantine ?',
          answer:
            'La livraison via Yalidine Express prend 24h à 48h ouvrables à domicile ou en point relais (Stop Desk).',
        },
      ],
      created_at: '2026-09-01T09:00:00Z',
      updated_at: '2026-10-23T08:00:00Z',
    },
    {
      id: 'store_oran_beaute',
      name: 'Maison Oran Cosmétiques',
      slug: 'maison-oran-dz',
      category: 'Cosmetics',
      wilaya: '31 - وهران (Oran)',
      currency: 'DZD',
      default_language: 'fr',
      ai_tone: 'professional',
      ai_enabled: true,
      require_human_approval: true,
      confidence_threshold: 0.85,
      return_policy: 'Aucun retour sur les produits cosmétiques ouverts.',
      shipping_policy: 'Livraison 58 wilayas via ZR Express.',
      faqs: [],
      created_at: '2026-09-15T10:00:00Z',
      updated_at: '2026-10-22T12:00:00Z',
    },
  ];

  public members: StoreMember[] = [
    {
      id: 'mem_1',
      store_id: 'store_casbah_atelier',
      user_id: 'user_amel_owner',
      email: 'amel@casbah-atelier.dz',
      full_name: 'أمل بن يحيى (Amel Benyahia)',
      role: 'owner',
      created_at: '2026-09-01T09:00:00Z',
    },
    {
      id: 'mem_2',
      store_id: 'store_casbah_atelier',
      user_id: 'user_karim_agent',
      email: 'karim@casbah-atelier.dz',
      full_name: 'كريم منصوري (Karim Mansouri)',
      role: 'agent',
      created_at: '2026-09-05T10:00:00Z',
    },
    {
      id: 'mem_3',
      store_id: 'store_casbah_atelier',
      user_id: 'user_lina_analyst',
      email: 'lina@casbah-atelier.dz',
      full_name: 'لينة زروقي (Lina Zerrouki)',
      role: 'analyst',
      created_at: '2026-09-10T11:00:00Z',
    },
    {
      id: 'mem_other_1',
      store_id: 'store_oran_beaute',
      user_id: 'user_other_merchant',
      email: 'owner@maison-oran.dz',
      full_name: 'Nassim Khelil',
      role: 'owner',
      created_at: '2026-09-15T10:00:00Z',
    },
  ];

  public channels: ChannelConnection[] = [
    {
      id: 'ch_ig_1',
      store_id: 'store_casbah_atelier',
      provider: 'instagram_direct',
      account_name: '@casbah.atelier.dz',
      external_account_id: 'ig_business_994821',
      status: 'simulated_demo',
      webhook_verified: false,
      last_webhook_at: '2026-10-23T08:10:00Z',
      messages_today: 42,
    },
    {
      id: 'ch_wa_1',
      store_id: 'store_casbah_atelier',
      provider: 'whatsapp_business',
      account_name: '+213 558 41 90 12 (WhatsApp Business)',
      external_account_id: 'wa_cloud_213558419012',
      status: 'simulated_demo',
      webhook_verified: false,
      last_webhook_at: '2026-10-23T08:15:00Z',
      messages_today: 68,
    },
    {
      id: 'ch_fb_1',
      store_id: 'store_casbah_atelier',
      provider: 'facebook_messenger',
      account_name: 'Casbah Atelier Algérie',
      external_account_id: '',
      status: 'config_required',
      webhook_verified: false,
      last_webhook_at: null,
      messages_today: 0,
    },
  ];

  public products: Product[] = [
    {
      id: 'prod_abaya_soie',
      store_id: 'store_casbah_atelier',
      sku: 'CSB-ABY-01',
      name_ar: 'عباية حرير المدينة مطرزة — أخضر زيتوني',
      name_fr: 'Abaya Soie de Médine Brodée — Vert Olive',
      description_ar:
        'عباية فاخرة من قماش حرير المدينة الأصلي مع تطريز يدوي خفيف على الأكمام وشال متناسق.',
      description_fr:
        'Abaya fluide en soie de Médine première qualité avec broderie délicate sur les manches et châle assorti.',
      category: 'Modest Fashion',
      price_dzd: 6800,
      stock_quantity: 14,
      variants: [
        { id: 'v1', size: 'M (38-40)', color: 'أخضر زيتوني / Olive', stock: 6 },
        { id: 'v2', size: 'L (42-44)', color: 'أخضر زيتوني / Olive', stock: 5 },
        { id: 'v3', size: 'XL (46-48)', color: 'أسود ملكي / Noir', stock: 3 },
      ],
      images: [
        {
          id: 'img_1',
          store_id: 'store_casbah_atelier',
          product_id: 'prod_abaya_soie',
          storage_path: 'store-media/casbah/abaya-olive.jpg',
          alt_text: 'عباية حرير المدينة أخضر زيتوني',
          is_primary: true,
        },
      ],
      ai_visible: true,
      is_active: true,
      created_at: '2026-09-02T10:00:00Z',
    },
    {
      id: 'prod_karakou_velours',
      store_id: 'store_casbah_atelier',
      sku: 'CSB-KRK-04',
      name_ar: 'كاراكو عاصمي قطيفة بالفتلة الذهبية',
      name_fr: 'Karakou Algérois Velours & Fetla Dorée',
      description_ar:
        'قطعة تقليدية عصرية مطرزة بالفتلة الذهبية الحرة مع سروال شلقة عصري للمناسبات.',
      description_fr:
        'Pièce artisanale algéroise en velours profond brodée à la main au fil d’or avec sarouel chelka.',
      category: 'Tenues Traditionnelles',
      price_dzd: 24500,
      stock_quantity: 4,
      variants: [
        { id: 'v4', size: 'S/M (38)', color: 'زمردي / Émeraude', stock: 2 },
        { id: 'v5', size: 'L (42)', color: 'عنابي / Bordeaux', stock: 2 },
      ],
      images: [],
      ai_visible: true,
      is_active: true,
      created_at: '2026-09-05T11:00:00Z',
    },
    {
      id: 'prod_ensemble_lin',
      store_id: 'store_casbah_atelier',
      sku: 'CSB-LIN-09',
      name_ar: 'طقم كتان طبيعي محتشم (قميص + بنطلون واسع)',
      name_fr: 'Ensemble Lin Naturel Modeste (Tunique + Palazzo)',
      description_ar: 'طقم عملي مريح من الكتان الطبيعي 100% مناسب للعمل والخرجات اليومية.',
      description_fr: 'Ensemble deux pièces en lin naturel respirant, coupe ample et élégante.',
      category: 'Modest Fashion',
      price_dzd: 5400,
      stock_quantity: null, // Explicitly unverified inventory to enforce AI warning
      variants: [
        { id: 'v6', size: 'Standard (38-42)', color: 'بيج رملي / Sable', stock: null },
      ],
      images: [],
      ai_visible: true,
      is_active: true,
      created_at: '2026-09-12T14:00:00Z',
    },
    {
      id: 'prod_serum_argan',
      store_id: 'store_casbah_atelier',
      sku: 'CSB-COS-12',
      name_ar: 'مجموعة العناية بماء الورد البليدي وزيت الأركان',
      name_fr: 'Coffret Éclat Eau de Rose de Blida & Huile d’Argan',
      description_ar: 'سيروم طبيعي مرطب مع ماء مقطر من ورود البليدة للعناية اليومية بالبشرة.',
      description_fr: 'Sérum hydratant pur et hydrolat de rose de Blida certifié.',
      category: 'Beauty & Cosmetics',
      price_dzd: 3200,
      stock_quantity: 22,
      variants: [{ id: 'v7', size: '50ml + 100ml', color: 'Coffret', stock: 22 }],
      images: [],
      ai_visible: true,
      is_active: true,
      created_at: '2026-09-20T09:30:00Z',
    },
    {
      id: 'prod_other_store',
      store_id: 'store_oran_beaute',
      sku: 'ORN-01',
      name_ar: 'عطر وهران الخاص',
      name_fr: 'Parfum Exclusif Oran',
      description_ar: 'خاص بمتجر آخر',
      description_fr: 'Produit appartenant à un autre locataire',
      category: 'Parfums',
      price_dzd: 8900,
      stock_quantity: 10,
      variants: [],
      images: [],
      ai_visible: true,
      is_active: true,
      created_at: '2026-09-20T09:30:00Z',
    },
  ];

  public customers: CustomerProfile[] = [
    {
      id: 'cust_yasmine',
      store_id: 'store_casbah_atelier',
      full_name: 'ياسمين بن علي (Yasmine Benali)',
      handle: '@yasmine.benali.dz',
      phone: '0552 84 19 30',
      wilaya: '31 - وهران (Oran)',
      preferred_language: 'darja',
      channel: 'whatsapp_business',
      total_orders: 2,
      lifetime_spend_dzd: 14200,
      is_vip: true,
      last_interaction_at: '2026-10-23T08:14:00Z',
      notes: 'عميلة وفية من وهران، تفضل التوصيل للمنزل عبر ياليدين.',
    },
    {
      id: 'cust_meriem',
      store_id: 'store_casbah_atelier',
      full_name: 'مريم خليفي (Meriem Khelifi)',
      handle: '@meriem_khlf',
      phone: '0661 49 20 88',
      wilaya: '25 - قسنطينة (Constantine)',
      preferred_language: 'ar',
      channel: 'instagram_direct',
      total_orders: 1,
      lifetime_spend_dzd: 6800,
      is_vip: false,
      last_interaction_at: '2026-10-23T07:55:00Z',
      notes: 'تستفسر عن طقم الكتان الطبيعي (المخزون غير مؤكد حالياً).',
    },
    {
      id: 'cust_sara',
      store_id: 'store_casbah_atelier',
      full_name: 'سارة منصوري (Sara Mansouri)',
      handle: 'Sara Mansouri',
      phone: '0770 12 63 45',
      wilaya: '16 - الجزائر العاصمة (Alger)',
      preferred_language: 'fr',
      channel: 'instagram_direct',
      total_orders: 3,
      lifetime_spend_dzd: 34500,
      is_vip: true,
      last_interaction_at: '2026-10-23T07:30:00Z',
      notes: 'Intéressée par le Karakou Algérois pour un mariage en novembre.',
    },
    {
      id: 'cust_nadia',
      store_id: 'store_casbah_atelier',
      full_name: 'نادية تومي (Nadia Toumi)',
      handle: '+213 549 88 11 04',
      phone: '0549 88 11 04',
      wilaya: '19 - سطيف (Sétif)',
      preferred_language: 'ar',
      channel: 'whatsapp_business',
      total_orders: 1,
      lifetime_spend_dzd: 7450,
      is_vip: false,
      last_interaction_at: '2026-10-23T06:40:00Z',
      notes: 'تريد استبدال مقاس العباية من M إلى L.',
    },
  ];

  public conversations: Conversation[] = [
    {
      id: 'conv_yasmine_1',
      store_id: 'store_casbah_atelier',
      customer_id: 'cust_yasmine',
      customer_name: 'ياسمين بن علي (Yasmine Benali)',
      customer_handle: '+213 552 84 19 30',
      customer_phone: '0552 84 19 30',
      customer_wilaya: '31 - وهران (Oran)',
      channel: 'whatsapp_business',
      status: 'open',
      intent: 'size_stock_inquiry',
      intent_confidence: 0.94,
      unread_count: 2,
      is_high_intent: true,
      ai_needs_review: true,
      assigned_to: 'أمل بن يحيى',
      related_product_ids: ['prod_abaya_soie'],
      last_message_preview:
        'سلام ختي، عباية حرير المدينة الزيتوني راهي متوفرة في تاي L؟ وشحال التوصيل لوهران؟',
      last_message_at: '2026-10-23T08:14:00Z',
      created_at: '2026-10-23T08:05:00Z',
    },
    {
      id: 'conv_meriem_2',
      store_id: 'store_casbah_atelier',
      customer_id: 'cust_meriem',
      customer_name: 'مريم خليفي (Meriem Khelifi)',
      customer_handle: '@meriem_khlf',
      customer_phone: '0661 49 20 88',
      customer_wilaya: '25 - قسنطينة (Constantine)',
      channel: 'instagram_direct',
      status: 'pending_review',
      intent: 'price_inquiry',
      intent_confidence: 0.89,
      unread_count: 1,
      is_high_intent: true,
      ai_needs_review: true,
      assigned_to: 'كريم منصوري',
      related_product_ids: ['prod_ensemble_lin'],
      last_message_preview:
        'مساء الخير، كم سعر طقم الكتان الطبيعي البيج وهل متوفر حالياً للشحن إلى قسنطينة؟',
      last_message_at: '2026-10-23T07:55:00Z',
      created_at: '2026-10-23T07:45:00Z',
    },
    {
      id: 'conv_sara_3',
      store_id: 'store_casbah_atelier',
      customer_id: 'cust_sara',
      customer_name: 'سارة منصوري (Sara Mansouri)',
      customer_handle: '@sara.mansouri.dz',
      customer_phone: '0770 12 63 45',
      customer_wilaya: '16 - الجزائر العاصمة (Alger)',
      channel: 'instagram_direct',
      status: 'open',
      intent: 'order_request',
      intent_confidence: 0.96,
      unread_count: 1,
      is_high_intent: true,
      ai_needs_review: false,
      assigned_to: 'أمل بن يحيى',
      related_product_ids: ['prod_karakou_velours'],
      last_message_preview:
        'Bonjour, je souhaite commander le Karakou Algérois Velours en taille 38 (Émeraude) pour Hydra, Alger.',
      last_message_at: '2026-10-23T07:30:00Z',
      created_at: '2026-10-23T07:10:00Z',
    },
    {
      id: 'conv_nadia_4',
      store_id: 'store_casbah_atelier',
      customer_id: 'cust_nadia',
      customer_name: 'نادية تومي (Nadia Toumi)',
      customer_handle: '+213 549 88 11 04',
      customer_phone: '0549 88 11 04',
      customer_wilaya: '19 - سطيف (Sétif)',
      channel: 'whatsapp_business',
      status: 'human_active',
      intent: 'exchange_complaint',
      intent_confidence: 0.95,
      unread_count: 0,
      is_high_intent: false,
      ai_needs_review: true,
      assigned_to: 'كريم منصوري',
      related_product_ids: ['prod_abaya_soie'],
      last_message_preview:
        'وصلتني الطلبية رقم ORD-1041 بصح المقاس M جاني شوية ضيق، نحب نبدلها لمقاس L من فضلكم.',
      last_message_at: '2026-10-23T06:40:00Z',
      created_at: '2026-10-22T18:20:00Z',
    },
  ];

  public messages: Message[] = [
    {
      id: 'msg_1',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_yasmine_1',
      sender_type: 'customer',
      sender_name: 'ياسمين بن علي',
      body: 'سلام ختي، شفت في الستوري عباية حرير المدينة اللون الأخضر الزيتوني.',
      delivery_status: 'read',
      ai_generated: false,
      created_at: '2026-10-23T08:11:00Z',
    },
    {
      id: 'msg_2',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_yasmine_1',
      sender_type: 'customer',
      sender_name: 'ياسمين بن علي',
      body: 'سلام ختي، عباية حرير المدينة الزيتوني راهي متوفرة في تاي L؟ وشحال التوصيل لوهران؟',
      delivery_status: 'delivered',
      ai_generated: false,
      created_at: '2026-10-23T08:14:00Z',
    },
    {
      id: 'msg_3',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_yasmine_1',
      sender_type: 'internal_note',
      sender_name: 'أمل بن يحيى',
      body: 'ملاحظة داخلية: العميلة ياسمين سبق لها الشراء مرتين (عميلة VIP). متوفر 5 قطع في مقاس L.',
      delivery_status: 'read',
      ai_generated: false,
      created_at: '2026-10-23T08:15:00Z',
    },
    {
      id: 'msg_4',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_meriem_2',
      sender_type: 'customer',
      sender_name: 'مريم خليفي',
      body: 'مساء الخير، كم سعر طقم الكتان الطبيعي البيج وهل متوفر حالياً للشحن إلى قسنطينة؟',
      delivery_status: 'delivered',
      ai_generated: false,
      created_at: '2026-10-23T07:55:00Z',
    },
    {
      id: 'msg_5',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_sara_3',
      sender_type: 'customer',
      sender_name: 'سارة منصوري',
      body: 'Bonjour, je souhaite commander le Karakou Algérois Velours en taille 38 (Émeraude) pour Hydra, Alger.',
      delivery_status: 'delivered',
      ai_generated: false,
      created_at: '2026-10-23T07:30:00Z',
    },
    {
      id: 'msg_6',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_nadia_4',
      sender_type: 'customer',
      sender_name: 'نادية تومي',
      body: 'وصلتني الطلبية رقم ORD-1041 بصح المقاس M جاني شوية ضيق، نحب نبدلها لمقاس L من فضلكم.',
      delivery_status: 'read',
      ai_generated: false,
      created_at: '2026-10-23T06:40:00Z',
    },
    {
      id: 'msg_7',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_nadia_4',
      sender_type: 'merchant',
      sender_name: 'كريم منصوري',
      body: 'مرحباً بكِ أخت نادية، ولا يهمكِ الاستبدال مجاني خلال 48 ساعة. حجزنا لكِ مقاس L وسيتواصل معكِ مندوب ياليدين في سطيف لاستلام القطعة وتسليم المقاس الجديد.',
      delivery_status: 'read',
      ai_generated: false,
      approved_by_user_id: 'user_karim_agent',
      created_at: '2026-10-23T06:48:00Z',
    },
  ];

  public leads: Lead[] = [
    {
      id: 'lead_1',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_yasmine_1',
      customer_id: 'cust_yasmine',
      customer_name: 'ياسمين بن علي (Yasmine Benali)',
      customer_phone: '0552 84 19 30',
      wilaya: '31 - وهران (Oran)',
      source_channel: 'whatsapp_business',
      stage: 'high_intent',
      interested_products: ['عباية حرير المدينة مطرزة — أخضر زيتوني'],
      estimated_value_dzd: 7450,
      assigned_to: 'أمل بن يحيى',
      notes: 'تنتظر تأكيد التوصيل لوهران لتثبيت الطلبية.',
      follow_up_due_at: '2026-10-23T14:00:00Z',
      last_contact_at: '2026-10-23T08:14:00Z',
      created_at: '2026-10-23T08:05:00Z',
    },
    {
      id: 'lead_2',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_sara_3',
      customer_id: 'cust_sara',
      customer_name: 'سارة منصوري (Sara Mansouri)',
      customer_phone: '0770 12 63 45',
      wilaya: '16 - الجزائر العاصمة (Alger)',
      source_channel: 'instagram_direct',
      stage: 'qualified',
      interested_products: ['كاراكو عاصمي قطيفة بالفتلة الذهبية'],
      estimated_value_dzd: 24900,
      assigned_to: 'أمل بن يحيى',
      notes: 'تم إنشاء مسودة طلب ORD-1044 بانتظار المراجعة والتأكيد الهاتفي.',
      follow_up_due_at: '2026-10-23T12:00:00Z',
      last_contact_at: '2026-10-23T07:30:00Z',
      created_at: '2026-10-23T07:10:00Z',
    },
    {
      id: 'lead_3',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_meriem_2',
      customer_id: 'cust_meriem',
      customer_name: 'مريم خليفي (Meriem Khelifi)',
      customer_phone: '0661 49 20 88',
      wilaya: '25 - قسنطينة (Constantine)',
      source_channel: 'instagram_direct',
      stage: 'follow_up',
      interested_products: ['طقم كتان طبيعي محتشم (قميص + بنطلون واسع)'],
      estimated_value_dzd: 6050,
      assigned_to: 'كريم منصوري',
      notes: 'بانتظار جرد المخزن لتأكيد توفر اللون البيج الرملي.',
      follow_up_due_at: '2026-10-23T16:00:00Z',
      last_contact_at: '2026-10-23T07:55:00Z',
      created_at: '2026-10-23T07:45:00Z',
    },
  ];

  public orders: Order[] = [
    {
      id: 'ord_1044_draft',
      store_id: 'store_casbah_atelier',
      order_number: 'ORD-1044',
      conversation_id: 'conv_sara_3',
      customer_id: 'cust_sara',
      customer_name: 'سارة منصوري (Sara Mansouri)',
      customer_phone: '0770 12 63 45',
      wilaya: '16 - الجزائر العاصمة (Alger)',
      commune: 'Hydra',
      delivery_type: 'home',
      status: 'draft',
      is_ai_draft: true,
      items: [
        {
          id: 'item_1',
          store_id: 'store_casbah_atelier',
          order_id: 'ord_1044_draft',
          product_id: 'prod_karakou_velours',
          product_name: 'كاراكو عاصمي قطيفة بالفتلة الذهبية',
          variant_label: 'S/M (38) — زمردي / Émeraude',
          quantity: 1,
          unit_price_dzd: 24500,
          line_total_dzd: 24500,
        },
      ],
      subtotal_dzd: 24500,
      shipping_fee_dzd: 400,
      total_dzd: 24900,
      notes: 'مسودة طلب أعدها المساعد الذكي بناءً على محادثة إنستغرام — تتطلب مراجعة وتأكيد التاجر.',
      created_at: '2026-10-23T07:32:00Z',
      updated_at: '2026-10-23T07:32:00Z',
    },
    {
      id: 'ord_1043_confirmed',
      store_id: 'store_casbah_atelier',
      order_number: 'ORD-1043',
      conversation_id: 'conv_yasmine_1',
      customer_id: 'cust_yasmine',
      customer_name: 'ياسمين بن علي (Yasmine Benali)',
      customer_phone: '0552 84 19 30',
      wilaya: '31 - وهران (Oran)',
      commune: 'Bir El Djir',
      delivery_type: 'home',
      status: 'confirmed',
      is_ai_draft: false,
      items: [
        {
          id: 'item_2',
          store_id: 'store_casbah_atelier',
          order_id: 'ord_1043_confirmed',
          product_id: 'prod_serum_argan',
          product_name: 'مجموعة العناية بماء الورد البليدي وزيت الأركان',
          variant_label: '50ml + 100ml',
          quantity: 2,
          unit_price_dzd: 3200,
          line_total_dzd: 6400,
        },
      ],
      subtotal_dzd: 6400,
      shipping_fee_dzd: 650,
      total_dzd: 7050,
      notes: 'تم التأكيد هاتفياً — جاهز للتسليم لمكتب ياليدين وهران.',
      created_at: '2026-10-22T15:10:00Z',
      updated_at: '2026-10-22T16:00:00Z',
    },
    {
      id: 'ord_1041_delivered',
      store_id: 'store_casbah_atelier',
      order_number: 'ORD-1041',
      conversation_id: 'conv_nadia_4',
      customer_id: 'cust_nadia',
      customer_name: 'نادية تومي (Nadia Toumi)',
      customer_phone: '0549 88 11 04',
      wilaya: '19 - سطيف (Sétif)',
      commune: 'El Eulma',
      delivery_type: 'stop_desk',
      status: 'delivered',
      is_ai_draft: false,
      items: [
        {
          id: 'item_3',
          store_id: 'store_casbah_atelier',
          order_id: 'ord_1041_delivered',
          product_id: 'prod_abaya_soie',
          product_name: 'عباية حرير المدينة مطرزة — أخضر زيتوني',
          variant_label: 'M (38-40) — أخضر زيتوني',
          quantity: 1,
          unit_price_dzd: 6800,
          line_total_dzd: 6800,
        },
      ],
      subtotal_dzd: 6800,
      shipping_fee_dzd: 450,
      total_dzd: 7250,
      notes: 'تم التسليم — طلب استبدال مقاس إلى L مفتوح في المحادثة.',
      created_at: '2026-10-20T11:00:00Z',
      updated_at: '2026-10-22T14:00:00Z',
    },
  ];

  public automations: AutomationRule[] = [
    {
      id: 'auto_1',
      store_id: 'store_casbah_atelier',
      name_ar: 'تحضير مسودة رد للاستفسارات عن الأسعار والمقاسات',
      name_fr: 'Préparer un brouillon IA pour les demandes de prix et tailles',
      trigger: 'incoming_message_intent',
      condition_summary_ar: 'عندما تكون نية الرسالة: استفسار سعر أو مقاس والمنتج متوفر في الكتالوج',
      condition_summary_fr: 'Intention = prix ou stock & produit vérifié au catalogue',
      action_summary_ar: 'إنشاء مسودة رد مستندة للكتالوج بانتظار موافقة التاجر (لا يتم الإرسال تلقائياً)',
      action_summary_fr: 'Générer un brouillon soumis à validation marchande',
      enabled: true,
      require_review: true,
      execution_mode: 'active_server_rule',
      total_triggered: 38,
      last_triggered_at: '2026-10-23T08:14:00Z',
    },
    {
      id: 'auto_2',
      store_id: 'store_casbah_atelier',
      name_ar: 'تحويل طلبات الاستبدال والشكاوى إلى موظف بشري',
      name_fr: 'Escalader les demandes d’échange ou réclamations vers un agent',
      trigger: 'incoming_message_intent',
      condition_summary_ar: 'عند اكتشاف نية استبدال مقاس أو شكوى أو طلب التحدث مع مسؤول',
      condition_summary_fr: 'Intention = échange, réclamation ou transfert humain',
      action_summary_ar: 'تغيير حالة المحادثة إلى "متابعة بشرية" وتنبيه مسؤول خدمة الزبائن',
      action_summary_fr: 'Passer en suivi humain et notifier l’équipe',
      enabled: true,
      require_review: true,
      execution_mode: 'active_server_rule',
      total_triggered: 9,
      last_triggered_at: '2026-10-23T06:40:00Z',
    },
    {
      id: 'auto_3',
      store_id: 'store_casbah_atelier',
      name_ar: 'تذكير متابعة للعملاء ذوي النية الشرائية العالية بعد 4 ساعات',
      name_fr: 'Rappel de relance prospects haute intention (4h)',
      trigger: 'unanswered_15m',
      condition_summary_ar: 'محادثة مصنفة كفرصة بيعية عالية بدون رد نهائي لمدة 4 ساعات',
      condition_summary_fr: 'Prospect haute intention sans confirmation depuis 4h',
      action_summary_ar: 'إضافة مهمة متابعة في قائمة العملاء المحتملين (إعداد محفوظ في قاعدة البيانات)',
      action_summary_fr: 'Créer une tâche de relance (Configuration enregistrée)',
      enabled: false,
      require_review: true,
      execution_mode: 'config_saved_only',
      total_triggered: 0,
      last_triggered_at: null,
    },
  ];

  public aiUsage: AIUsageRecord[] = [
    {
      id: 'aiu_1',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_yasmine_1',
      model: 'gemini-3.8-flash',
      language: 'darja',
      tone: 'friendly',
      prompt_tokens: 410,
      completion_tokens: 96,
      grounded_in_catalog: true,
      missing_info_flagged: false,
      status: 'draft_generated',
      created_at: '2026-10-23T08:14:15Z',
    },
    {
      id: 'aiu_2',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_meriem_2',
      model: 'gemini-3.8-flash',
      language: 'ar',
      tone: 'professional',
      prompt_tokens: 390,
      completion_tokens: 88,
      grounded_in_catalog: true,
      missing_info_flagged: true,
      status: 'draft_generated',
      created_at: '2026-10-23T07:56:00Z',
    },
    {
      id: 'aiu_3',
      store_id: 'store_casbah_atelier',
      conversation_id: 'conv_sara_3',
      model: 'gemini-3.8-flash',
      language: 'fr',
      tone: 'professional',
      prompt_tokens: 420,
      completion_tokens: 105,
      grounded_in_catalog: true,
      missing_info_flagged: false,
      status: 'approved_inserted',
      created_at: '2026-10-23T07:31:20Z',
    },
  ];

  public webhookEvents: WebhookEventRecord[] = [
    {
      id: 'wh_1',
      store_id: 'store_casbah_atelier',
      provider: 'whatsapp_business',
      external_event_id: 'wamid.HBgMMjEzNTUyODQxOTMwFQIAEhgg',
      event_type: 'messages.incoming',
      signature_verified: true,
      status: 'processed',
      processed_at: '2026-10-23T08:14:00Z',
    },
    {
      id: 'wh_2',
      store_id: 'store_casbah_atelier',
      provider: 'instagram_direct',
      external_event_id: 'ig_mid.178414057931872',
      event_type: 'messaging.direct',
      signature_verified: true,
      status: 'processed',
      processed_at: '2026-10-23T07:55:00Z',
    },
  ];

  public auditLogs: AuditLogEntry[] = [
    {
      id: 'aud_1',
      store_id: 'store_casbah_atelier',
      actor_user_id: 'user_amel_owner',
      actor_name: 'أمل بن يحيى',
      actor_role: 'owner',
      action: 'ORDER_CONFIRMED',
      resource_type: 'order',
      resource_id: 'ORD-1043',
      summary: 'تأكيد الطلب ORD-1043 للعميلة ياسمين بن علي (7,050 د.ج — وهران)',
      created_at: '2026-10-22T16:00:00Z',
    },
    {
      id: 'aud_2',
      store_id: 'store_casbah_atelier',
      actor_user_id: 'user_karim_agent',
      actor_name: 'كريم منصوري',
      actor_role: 'agent',
      action: 'HUMAN_HANDOFF_ACCEPTED',
      resource_type: 'conversation',
      resource_id: 'conv_nadia_4',
      summary: 'استلام محادثة استبدال المقاس للعميلة نادية تومي (ORD-1041)',
      created_at: '2026-10-23T06:45:00Z',
    },
  ];

  private processedWebhookKeys = new Set<string>([
    buildWebhookIdempotencyKey(
      'store_casbah_atelier',
      'whatsapp_business',
      'wamid.HBgMMjEzNTUyODQxOTMwFQIAEhgg'
    ),
    buildWebhookIdempotencyKey(
      'store_casbah_atelier',
      'instagram_direct',
      'ig_mid.178414057931872'
    ),
  ]);

  public checkAccess(
    userId: string | null | undefined,
    storeId: string,
    action: SecurityAction
  ) {
    return authorizeStoreAction({
      userId,
      targetStoreId: storeId,
      memberships: this.members,
      action,
    });
  }

  public getStoreSnapshot(userId: string, storeId: string) {
    const auth = this.checkAccess(userId, storeId, 'read_store_data');
    if (!auth.authorized) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }

    const store = this.stores.find((s) => s.id === storeId);
    if (!store) {
      throw new Error('STORE_NOT_FOUND');
    }

    return {
      store,
      currentMember: auth.member!,
      members: this.members.filter((m) => m.store_id === storeId),
      channels: this.channels.filter((c) => c.store_id === storeId),
      products: this.products.filter((p) => p.store_id === storeId),
      customers: this.customers.filter((c) => c.store_id === storeId),
      conversations: this.conversations
        .filter((c) => c.store_id === storeId)
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)),
      messages: this.messages.filter((m) => m.store_id === storeId),
      leads: this.leads.filter((l) => l.store_id === storeId),
      orders: this.orders
        .filter((o) => o.store_id === storeId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      automations: this.automations.filter((a) => a.store_id === storeId),
      aiUsage: this.aiUsage.filter((u) => u.store_id === storeId),
      webhookEvents: this.webhookEvents.filter((w) => w.store_id === storeId),
      auditLogs: this.auditLogs
        .filter((a) => a.store_id === storeId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }

  public appendMessage(params: {
    userId: string;
    storeId: string;
    conversationId: string;
    body: string;
    senderType: 'merchant' | 'internal_note';
    aiGenerated?: boolean;
  }): { message: Message; conversation: Conversation } {
    const auth = this.checkAccess(params.userId, params.storeId, 'send_message');
    if (!auth.authorized || !auth.member) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }

    const conv = this.conversations.find(
      (c) => c.id === params.conversationId && c.store_id === params.storeId
    );
    if (!conv) {
      throw new Error('CONVERSATION_NOT_FOUND_OR_CROSS_TENANT');
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      store_id: params.storeId,
      conversation_id: conv.id,
      sender_type: params.senderType,
      sender_name: auth.member.full_name,
      body: params.body.trim(),
      delivery_status: 'sent',
      ai_generated: Boolean(params.aiGenerated),
      approved_by_user_id: auth.member.user_id,
      created_at: now,
    };

    this.messages.push(message);

    if (params.senderType === 'merchant') {
      conv.last_message_preview = message.body;
      conv.last_message_at = now;
      conv.unread_count = 0;
      conv.ai_needs_review = false;
    }

    this.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      store_id: params.storeId,
      actor_user_id: auth.member.user_id,
      actor_name: auth.member.full_name,
      actor_role: auth.member.role,
      action:
        params.senderType === 'internal_note'
          ? 'INTERNAL_NOTE_ADDED'
          : params.aiGenerated
          ? 'AI_DRAFT_APPROVED_AND_SENT'
          : 'MERCHANT_REPLY_SENT',
      resource_type: 'conversation',
      resource_id: conv.id,
      summary: `${
        params.senderType === 'internal_note' ? 'إضافة ملاحظة داخلية' : 'إرسال رد معتمد'
      } في محادثة ${conv.customer_name}`,
      created_at: now,
    });

    return { message, conversation: conv };
  }

  public updateConversationStatus(params: {
    userId: string;
    storeId: string;
    conversationId: string;
    nextStatus: Conversation['status'];
  }): Conversation {
    const auth = this.checkAccess(params.userId, params.storeId, 'send_message');
    if (!auth.authorized || !auth.member) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }
    const conv = this.conversations.find(
      (c) => c.id === params.conversationId && c.store_id === params.storeId
    );
    if (!conv) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }
    if (!canTransitionConversationStatus(conv.status, params.nextStatus)) {
      throw new Error('INVALID_CONVERSATION_STATUS_TRANSITION');
    }
    conv.status = params.nextStatus;
    if (params.nextStatus === 'resolved') {
      conv.unread_count = 0;
      conv.ai_needs_review = false;
    }
    return conv;
  }

  public createProduct(params: {
    userId: string;
    storeId: string;
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
  }): Product {
    const auth = this.checkAccess(
      params.userId,
      params.storeId,
      'manage_products'
    );
    if (!auth.authorized || !auth.member) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }

    const duplicateSku = this.products.some(
      (p) =>
        p.store_id === params.storeId &&
        p.sku.toLowerCase() === params.sku.trim().toLowerCase()
    );
    if (duplicateSku) {
      throw new Error('DUPLICATE_PRODUCT_SKU');
    }

    const product: Product = {
      id: `prod_${Date.now()}`,
      store_id: params.storeId,
      sku: params.sku.trim().toUpperCase(),
      name_ar: params.name_ar.trim(),
      name_fr: params.name_fr.trim(),
      description_ar: params.description_ar.trim(),
      description_fr: params.description_fr.trim(),
      category: params.category.trim(),
      price_dzd: params.price_dzd,
      stock_quantity: params.stock_quantity,
      variants: params.variants,
      images: [],
      ai_visible: params.ai_visible,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.products.unshift(product);

    this.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      store_id: params.storeId,
      actor_user_id: auth.member.user_id,
      actor_name: auth.member.full_name,
      actor_role: auth.member.role,
      action: 'PRODUCT_CREATED',
      resource_type: 'product',
      resource_id: product.sku,
      summary: `إضافة منتج جديد للكتالوج: ${product.name_ar} (${product.price_dzd.toLocaleString('en-US')} د.ج)`,
      created_at: product.created_at,
    });

    return product;
  }

  public transitionOrder(params: {
    userId: string;
    storeId: string;
    orderId: string;
    nextStatus: Order['status'];
  }): Order {
    const auth = this.checkAccess(
      params.userId,
      params.storeId,
      'transition_order'
    );
    if (!auth.authorized || !auth.member) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }

    const order = this.orders.find(
      (o) => o.id === params.orderId && o.store_id === params.storeId
    );
    if (!order) {
      throw new Error('ORDER_NOT_FOUND_OR_CROSS_TENANT');
    }

    const check = canTransitionOrderStatus(order.status, params.nextStatus);
    if (!check.valid) {
      throw new Error(check.reason || 'INVALID_ORDER_TRANSITION');
    }

    const prevStatus = order.status;
    order.status = params.nextStatus;
    if (params.nextStatus === 'confirmed') {
      order.is_ai_draft = false;
    }
    order.updated_at = new Date().toISOString();

    this.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      store_id: params.storeId,
      actor_user_id: auth.member.user_id,
      actor_name: auth.member.full_name,
      actor_role: auth.member.role,
      action: `ORDER_STATUS_${params.nextStatus.toUpperCase()}`,
      resource_type: 'order',
      resource_id: order.order_number,
      summary: `تحديث حالة الطلب ${order.order_number} من [${prevStatus}] إلى [${params.nextStatus}]`,
      created_at: order.updated_at,
    });

    return order;
  }

  public createOrderDraft(params: {
    userId: string;
    storeId: string;
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
  }): Order {
    const auth = this.checkAccess(
      params.userId,
      params.storeId,
      'transition_order'
    );
    if (!auth.authorized || !auth.member) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }

    const orderId = `ord_${Date.now()}`;
    const orderNumber = `ORD-${1045 + this.orders.length}`;
    const verifiedItems: Order['items'] = params.items.map((item, idx) => {
      const product = this.products.find(
        (p) => p.id === item.productId && p.store_id === params.storeId
      );
      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND_${item.productId}`);
      }
      const lineTotal = product.price_dzd * item.quantity;
      return {
        id: `item_${Date.now()}_${idx}`,
        store_id: params.storeId,
        order_id: orderId,
        product_id: product.id,
        product_name: product.name_ar,
        variant_label: item.variantLabel,
        quantity: item.quantity,
        unit_price_dzd: product.price_dzd,
        line_total_dzd: lineTotal,
      };
    });

    const totals = calculateVerifiedOrderTotals(
      verifiedItems,
      params.shippingFeeDzd
    );
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: orderId,
      store_id: params.storeId,
      order_number: orderNumber,
      conversation_id: params.conversationId ?? null,
      customer_id: params.customerId,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      wilaya: params.wilaya,
      commune: params.commune,
      delivery_type: params.deliveryType,
      status: 'draft',
      is_ai_draft: params.isAiDraft,
      items: verifiedItems,
      subtotal_dzd: totals.subtotal_dzd,
      shipping_fee_dzd: totals.shipping_fee_dzd,
      total_dzd: totals.total_dzd,
      notes: params.notes,
      created_at: now,
      updated_at: now,
    };

    this.orders.unshift(newOrder);

    this.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      store_id: params.storeId,
      actor_user_id: auth.member.user_id,
      actor_name: auth.member.full_name,
      actor_role: auth.member.role,
      action: 'ORDER_DRAFT_CREATED',
      resource_type: 'order',
      resource_id: newOrder.order_number,
      summary: `إنشاء مسودة طلب ${newOrder.order_number} للعميل ${newOrder.customer_name} (${newOrder.total_dzd.toLocaleString('en-US')} د.ج)`,
      created_at: now,
    });

    return newOrder;
  }

  public updateLeadStage(params: {
    userId: string;
    storeId: string;
    leadId: string;
    stage: Lead['stage'];
    notes?: string;
  }): Lead {
    const auth = this.checkAccess(params.userId, params.storeId, 'send_message');
    if (!auth.authorized || !auth.member) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }
    const lead = this.leads.find(
      (l) => l.id === params.leadId && l.store_id === params.storeId
    );
    if (!lead) {
      throw new Error('LEAD_NOT_FOUND_OR_CROSS_TENANT');
    }
    lead.stage = params.stage;
    if (typeof params.notes === 'string') {
      lead.notes = params.notes.trim();
    }
    lead.last_contact_at = new Date().toISOString();
    return lead;
  }

  public updateAISettings(params: {
    userId: string;
    storeId: string;
    ai_enabled: boolean;
    default_language: Store['default_language'];
    ai_tone: Store['ai_tone'];
    require_human_approval: boolean;
    confidence_threshold: number;
    return_policy: string;
    shipping_policy: string;
  }): Store {
    const auth = this.checkAccess(
      params.userId,
      params.storeId,
      'manage_ai_settings'
    );
    if (!auth.authorized || !auth.member) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }
    const store = this.stores.find((s) => s.id === params.storeId);
    if (!store) {
      throw new Error('STORE_NOT_FOUND');
    }
    store.ai_enabled = params.ai_enabled;
    store.default_language = params.default_language;
    store.ai_tone = params.ai_tone;
    store.require_human_approval = params.require_human_approval;
    store.confidence_threshold = params.confidence_threshold;
    store.return_policy = params.return_policy;
    store.shipping_policy = params.shipping_policy;
    store.updated_at = new Date().toISOString();

    this.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      store_id: params.storeId,
      actor_user_id: auth.member.user_id,
      actor_name: auth.member.full_name,
      actor_role: auth.member.role,
      action: 'AI_SETTINGS_UPDATED',
      resource_type: 'store',
      resource_id: store.id,
      summary: `تحديث إعدادات الذكاء الاصطناعي وسياسات المتجر (اللغة الافتراضية: ${store.default_language})`,
      created_at: store.updated_at,
    });

    return store;
  }

  public toggleAutomation(params: {
    userId: string;
    storeId: string;
    automationId: string;
  }): AutomationRule {
    const auth = this.checkAccess(
      params.userId,
      params.storeId,
      'manage_automations'
    );
    if (!auth.authorized || !auth.member) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }
    const rule = this.automations.find(
      (a) => a.id === params.automationId && a.store_id === params.storeId
    );
    if (!rule) {
      throw new Error('AUTOMATION_NOT_FOUND');
    }
    rule.enabled = !rule.enabled;
    return rule;
  }

  public ingestWebhookEvent(params: {
    storeSlug: string;
    provider: ChannelConnection['provider'];
    externalEventId: string;
    customerName: string;
    customerHandle: string;
    customerPhone: string;
    customerWilaya: string;
    messageBody: string;
    signatureVerified: boolean;
  }): {
    duplicate: boolean;
    rejectedSignature: boolean;
    webhookEvent: WebhookEventRecord;
    conversation?: Conversation;
  } {
    const store = this.stores.find((s) => s.slug === params.storeSlug);
    if (!store) {
      throw new Error('WEBHOOK_TARGET_STORE_NOT_FOUND');
    }

    const now = new Date().toISOString();
    if (!params.signatureVerified) {
      const rejectedRecord: WebhookEventRecord = {
        id: `wh_${Date.now()}`,
        store_id: store.id,
        provider: params.provider,
        external_event_id: params.externalEventId,
        event_type: 'messages.incoming',
        signature_verified: false,
        status: 'rejected_signature',
        processed_at: now,
      };
      this.webhookEvents.unshift(rejectedRecord);
      return {
        duplicate: false,
        rejectedSignature: true,
        webhookEvent: rejectedRecord,
      };
    }

    const idemKey = buildWebhookIdempotencyKey(
      store.id,
      params.provider,
      params.externalEventId
    );

    if (this.processedWebhookKeys.has(idemKey)) {
      const dupRecord: WebhookEventRecord = {
        id: `wh_dup_${Date.now()}`,
        store_id: store.id,
        provider: params.provider,
        external_event_id: params.externalEventId,
        event_type: 'messages.incoming',
        signature_verified: true,
        status: 'duplicate_ignored',
        processed_at: now,
      };
      this.webhookEvents.unshift(dupRecord);
      return {
        duplicate: true,
        rejectedSignature: false,
        webhookEvent: dupRecord,
      };
    }

    this.processedWebhookKeys.add(idemKey);

    const intentInfo = classifyCustomerIntent(params.messageBody);
    const convId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: convId,
      store_id: store.id,
      customer_id: `cust_${Date.now()}`,
      customer_name: params.customerName,
      customer_handle: params.customerHandle,
      customer_phone: params.customerPhone || '0550 00 00 00',
      customer_wilaya: params.customerWilaya || '16 - الجزائر العاصمة (Alger)',
      channel: params.provider,
      status: intentInfo.requiresHumanHandoff ? 'human_active' : 'open',
      intent: intentInfo.intent,
      intent_confidence: intentInfo.confidence,
      unread_count: 1,
      is_high_intent:
        intentInfo.intent === 'order_request' ||
        intentInfo.intent === 'price_inquiry' ||
        intentInfo.intent === 'size_stock_inquiry',
      ai_needs_review: true,
      assigned_to: 'أمل بن يحيى',
      related_product_ids: ['prod_abaya_soie'],
      last_message_preview: params.messageBody,
      last_message_at: now,
      created_at: now,
    };

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      store_id: store.id,
      conversation_id: convId,
      sender_type: 'customer',
      sender_name: params.customerName,
      body: params.messageBody,
      delivery_status: 'delivered',
      ai_generated: false,
      created_at: now,
    };

    this.conversations.unshift(newConv);
    this.messages.push(newMsg);

    const processedRecord: WebhookEventRecord = {
      id: `wh_${Date.now()}`,
      store_id: store.id,
      provider: params.provider,
      external_event_id: params.externalEventId,
      event_type: 'messages.incoming',
      signature_verified: true,
      status: 'processed',
      processed_at: now,
    };
    this.webhookEvents.unshift(processedRecord);

    return {
      duplicate: false,
      rejectedSignature: false,
      webhookEvent: processedRecord,
      conversation: newConv,
    };
  }

  public generateDraftForConversation(params: {
    userId: string;
    storeId: string;
    conversationId: string;
    language: Store['default_language'];
    tone: Store['ai_tone'];
  }): AIDraftSuggestion {
    const auth = this.checkAccess(
      params.userId,
      params.storeId,
      'generate_ai_draft'
    );
    if (!auth.authorized) {
      throw new Error(auth.reason || 'UNAUTHORIZED');
    }

    const store = this.stores.find((s) => s.id === params.storeId);
    const conv = this.conversations.find(
      (c) => c.id === params.conversationId && c.store_id === params.storeId
    );
    if (!store || !conv) {
      throw new Error('CONVERSATION_OR_STORE_NOT_FOUND');
    }

    const convMessages = this.messages.filter(
      (m) => m.conversation_id === conv.id && m.store_id === params.storeId
    );
    const storeProducts = this.products.filter(
      (p) => p.store_id === params.storeId
    );
    const customerOrders = this.orders.filter(
      (o) =>
        o.store_id === params.storeId &&
        (o.customer_id === conv.customer_id || o.conversation_id === conv.id)
    );

    const draft = generateDeterministicGroundedDraft({
      store,
      conversation: conv,
      messages: convMessages,
      storeProducts,
      customerOrders,
      language: params.language,
      tone: params.tone,
    });

    this.aiUsage.unshift({
      id: `aiu_${Date.now()}`,
      store_id: store.id,
      conversation_id: conv.id,
      model: 'gemini-3.8-flash',
      language: params.language,
      tone: params.tone,
      prompt_tokens: 380,
      completion_tokens: 92,
      grounded_in_catalog: true,
      missing_info_flagged: draft.missing_info_warnings.length > 0,
      status: 'draft_generated',
      created_at: draft.created_at,
    });

    return draft;
  }
}

export const defaultRepository = new MultiTenantStoreRepository();
