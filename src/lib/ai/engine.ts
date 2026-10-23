import type {
  AIDraftSuggestion,
  AITone,
  Conversation,
  CustomerIntent,
  Message,
  Order,
  Product,
  ReplyLanguage,
  Store,
} from '../../types/domain';

export interface IntentClassificationResult {
  intent: CustomerIntent;
  confidence: number;
  detectedKeywords: string[];
  requiresHumanHandoff: boolean;
}

/**
 * Classifies customer message intent across Arabic, Algerian Darja, and French.
 * Pure, deterministic classification used for inbox routing and AI context grounding.
 */
export function classifyCustomerIntent(messageText: string): IntentClassificationResult {
  const normalized = messageText.toLowerCase().trim();

  // Prompt injection / system override detection -> force human review
  if (
    /ignore previous|system prompt|override policy|كشف التعليمات|تجاهل التعليمات|api key|service_role/i.test(
      normalized
    )
  ) {
    return {
      intent: 'human_handoff',
      confidence: 0.99,
      detectedKeywords: ['security_escalation'],
      requiresHumanHandoff: true,
    };
  }

  if (
    /شكوى|غاضب|عيب|مشكلة|ترجيع|استرجاع|تبديل|نبدل|مقاس غالط|retour|échange|problème|réclamation|remboursement/i.test(
      normalized
    )
  ) {
    return {
      intent: 'exchange_complaint',
      confidence: 0.94,
      detectedKeywords: ['exchange_or_complaint'],
      requiresHumanHandoff: true,
    };
  }

  if (
    /مسؤول|بشري|إنسان|ندير تيليفون|نعيطلكم|مساعدة بشرية|humain|responsable|parler à quelqu'un/i.test(
      normalized
    )
  ) {
    return {
      intent: 'human_handoff',
      confidence: 0.97,
      detectedKeywords: ['human_requested'],
      requiresHumanHandoff: true,
    };
  }

  if (
    /وين لحقت|تتبع|الكوموند تاعي|طلبيتي|وصلت|ياليدين|suivi|où est ma commande|colis|livreur/i.test(
      normalized
    )
  ) {
    return {
      intent: 'order_tracking',
      confidence: 0.93,
      detectedKeywords: ['order_tracking'],
      requiresHumanHandoff: false,
    };
  }

  if (
    /نحب نكوموندي|نكوموندي|أريد طلب|سجللي طلبية|نشتري|احجزلي|je veux commander|commander|acheter|réserver/i.test(
      normalized
    )
  ) {
    return {
      intent: 'order_request',
      confidence: 0.95,
      detectedKeywords: ['order_intent'],
      requiresHumanHandoff: false,
    };
  }

  if (
    /التوصيل|ليفرزون|ولاية|وهران|قسنطينة|العاصمة|سعر التوصيل|livraison|wilaya|tarif livraison|stop desk|yalidine/i.test(
      normalized
    )
  ) {
    return {
      intent: 'shipping_wilaya',
      confidence: 0.92,
      detectedKeywords: ['shipping_wilaya'],
      requiresHumanHandoff: false,
    };
  }

  if (
    /تاي|مقاس|متوفر|كاين في الستوك|ألوان|موديل|الستوك|taille|disponible|en stock|pointure|couleur/i.test(
      normalized
    )
  ) {
    return {
      intent: 'size_stock_inquiry',
      confidence: 0.91,
      detectedKeywords: ['size_or_stock'],
      requiresHumanHandoff: false,
    };
  }

  if (
    /بشحال|شحال السومة|كم السعر|السعر|بري|prix|combien|tarif|coûte/i.test(
      normalized
    )
  ) {
    return {
      intent: 'price_inquiry',
      confidence: 0.95,
      detectedKeywords: ['price'],
      requiresHumanHandoff: false,
    };
  }

  if (/سلام|مرحبا|صباح الخير|مساء الخير|bonjour|salut|salam|bsr/i.test(normalized)) {
    return {
      intent: 'greeting',
      confidence: 0.9,
      detectedKeywords: ['greeting'],
      requiresHumanHandoff: false,
    };
  }

  return {
    intent: 'product_inquiry',
    confidence: 0.78,
    detectedKeywords: ['general_inquiry'],
    requiresHumanHandoff: false,
  };
}

/**
 * Builds grounded context from verified store products, orders, and policies.
 * Explicitly identifies missing stock/price/order information so the AI never hallucinates.
 */
export function buildGroundedBusinessContext(params: {
  store: Store;
  conversation: Conversation;
  messages: Message[];
  storeProducts: Product[];
  customerOrders: Order[];
}): {
  matchedProducts: Product[];
  groundedFacts: string[];
  missingInfoWarnings: string[];
  requiresHumanApproval: boolean;
} {
  const { store, conversation, messages, storeProducts, customerOrders } = params;
  const visibleProducts = storeProducts.filter(
    (p) => p.store_id === store.id && p.ai_visible && p.is_active
  );

  const matchedProducts = visibleProducts.filter((p) =>
    conversation.related_product_ids.includes(p.id)
  );

  // Also check if latest customer message mentions a product name or SKU
  const latestCustomerMsg =
    [...messages].reverse().find((m) => m.sender_type === 'customer')?.body ??
    conversation.last_message_preview;

  for (const prod of visibleProducts) {
    if (
      !matchedProducts.some((m) => m.id === prod.id) &&
      (latestCustomerMsg.includes(prod.name_ar) ||
        latestCustomerMsg.toLowerCase().includes(prod.name_fr.toLowerCase()) ||
        latestCustomerMsg.toLowerCase().includes(prod.sku.toLowerCase()))
    ) {
      matchedProducts.push(prod);
    }
  }

  const groundedFacts: string[] = [];
  const missingInfoWarnings: string[] = [];

  groundedFacts.push(`المتجر: ${store.name} (${store.wilaya})`);
  groundedFacts.push(`سياسة التوصيل: ${store.shipping_policy}`);
  groundedFacts.push(`سياسة الاستبدال: ${store.return_policy}`);

  if (matchedProducts.length === 0) {
    missingInfoWarnings.push(
      'لم يتم ربط منتج محدد من الكتالوج بهذه المحادثة بعد — لا تذكر أسعاراً أو مقاسات غير مؤكدة.'
    );
  } else {
    for (const prod of matchedProducts) {
      groundedFacts.push(
        `المنتج [${prod.sku}]: ${prod.name_ar} / ${prod.name_fr} — السعر المؤكد: ${prod.price_dzd.toLocaleString('en-US')} DZD`
      );
      if (prod.stock_quantity === null) {
        missingInfoWarnings.push(
          `المخزون غير مؤكد للمنتج "${prod.name_ar}" (${prod.sku}) — يجب إبلاغ العميل بأن توفر القطعة قيد التأكيد من المخزن.`
        );
      } else if (prod.stock_quantity === 0) {
        groundedFacts.push(`حالة المخزون لـ ${prod.name_ar}: نفد المخزون حالياً (0 قطعة).`);
        missingInfoWarnings.push(
          `المنتج "${prod.name_ar}" غير متوفر حالياً في المخزون (0 قطعة).`
        );
      } else {
        const variantSummary = prod.variants
          .map((v) =>
            `${v.size}/${v.color}: ${v.stock === null ? 'غير مؤكد' : `${v.stock} قطعة`}`
          )
          .join('، ');
        groundedFacts.push(
          `المخزون المؤكد لـ ${prod.name_ar}: ${prod.stock_quantity} قطعة (${variantSummary || 'مقاس موحد'})`
        );
      }
    }
  }

  if (customerOrders.length > 0) {
    for (const ord of customerOrders) {
      groundedFacts.push(
        `الطلب ${ord.order_number}: الحالة [${ord.status}] — الإجمالي ${ord.total_dzd.toLocaleString('en-US')} DZD (${ord.wilaya})`
      );
    }
  } else if (conversation.intent === 'order_tracking') {
    missingInfoWarnings.push(
      'لا يوجد طلب مسجل باسم هذا العميل في قاعدة البيانات — اطلب رقم الطلب أو رقم الهاتف للتأكد.'
    );
  }

  const intentEval = classifyCustomerIntent(latestCustomerMsg);
  const requiresHumanApproval =
    store.require_human_approval ||
    intentEval.requiresHumanHandoff ||
    intentEval.confidence < store.confidence_threshold ||
    missingInfoWarnings.length > 0;

  return {
    matchedProducts,
    groundedFacts,
    missingInfoWarnings,
    requiresHumanApproval,
  };
}

/**
 * Generates a deterministic, strictly grounded reply draft in Algerian Darja, Arabic, or French.
 * Used when Gemini runtime key is unavailable or as a verified baseline.
 * Never fabricates prices, stock, discounts, or order confirmations.
 */
export function generateDeterministicGroundedDraft(params: {
  store: Store;
  conversation: Conversation;
  messages: Message[];
  storeProducts: Product[];
  customerOrders: Order[];
  language: ReplyLanguage;
  tone: AITone;
}): AIDraftSuggestion {
  const {
    store,
    conversation,
    messages,
    storeProducts,
    customerOrders,
    language,
    tone,
  } = params;

  const latestMsg =
    [...messages].reverse().find((m) => m.sender_type === 'customer')?.body ??
    conversation.last_message_preview;
  const classification = classifyCustomerIntent(latestMsg);
  const context = buildGroundedBusinessContext({
    store,
    conversation,
    messages,
    storeProducts,
    customerOrders,
  });

  const primaryProduct = context.matchedProducts[0];
  const latestOrder = customerOrders[0];
  let draftText = '';

  if (language === 'darja') {
    const greeting =
      tone === 'professional'
        ? `مرحبا بيك ${conversation.customer_name} في ${store.name}.`
        : tone === 'concise'
        ? `سلام ${conversation.customer_name}،`
        : `سلام ومية مرحبا بيك ${conversation.customer_name} في ${store.name}!`;

    if (classification.intent === 'exchange_complaint' || classification.intent === 'human_handoff') {
      draftText = `${greeting} فهمت انشغالك ختي/خويا. باش نضمنولك حقك، راني حولت المحادثة لمسؤول خدمة الزبائن يتواصل معاك حالاً ويشوف الملف تاعك بالتفصيل. (${store.return_policy})`;
    } else if (classification.intent === 'order_tracking') {
      if (latestOrder) {
        const statusAr =
          latestOrder.status === 'draft'
            ? 'مسودة قيد المراجعة (مازال ما تأكدتش نهائياً)'
            : latestOrder.status === 'confirmed'
            ? 'مؤكدة وجاهزة للشحن'
            : latestOrder.status === 'shipped'
            ? 'خرجت مع شركة التوصيل في الطريق ليك'
            : latestOrder.status;
        draftText = `${greeting} بخصوص لاكوموند تاعك رقم ${latestOrder.order_number} لولاية ${latestOrder.wilaya}، راهي حالياً: ${statusAr}. المبلغ الإجمالي: ${latestOrder.total_dzd.toLocaleString('en-US')} د.ج.`;
      } else {
        draftText = `${greeting} ما لقيناش طلبية مسجلة بهذا الحساب حالياً. ابعثلنا رقم التيليفون ولا رقم الطلبية باش نثبتوها في السيستام.`;
      }
    } else if (primaryProduct) {
      const priceText = `السومة تاع "${primaryProduct.name_ar}" هي ${primaryProduct.price_dzd.toLocaleString('en-US')} د.ج.`;
      let stockText = '';
      if (primaryProduct.stock_quantity === null) {
        stockText =
          'بالنسبة للستوك والمقاسات، راهو قيد التأكيد مع المخزن ونردولك خبر أكيد قبل تثبيت أي طلبية.';
      } else if (primaryProduct.stock_quantity === 0) {
        stockText = 'حالياً هذا الموديل خلاص من الستوك، نقدرو نعلموك غير يدخل من جديد.';
      } else {
        const availableVariants = primaryProduct.variants
          .filter((v) => v.stock === null || v.stock > 0)
          .map((v) => `${v.size} (${v.color})`)
          .join('، ');
        stockText = `راهو متوفر في الستوك (${primaryProduct.stock_quantity} قطعة)${
          availableVariants ? ` بالمقاسات: ${availableVariants}` : ''
        }.`;
      }
      draftText = `${greeting} ${priceText} ${stockText} ${store.shipping_policy} تحب نوجدولك مسودة طلبية لمراجعتها؟`;
    } else {
      draftText = `${greeting} شكراً على تواصلك معانا. ياريت تحددلنا اسم الموديل ولا الكود (SKU) اللي راك تسقسي عليه باش نعطوك السعر المؤكد والتوفر في الستوك. ${store.shipping_policy}`;
    }
  } else if (language === 'fr') {
    const greeting =
      tone === 'professional'
        ? `Bonjour ${conversation.customer_name}, merci d'avoir contacté ${store.name}.`
        : tone === 'concise'
        ? `Bonjour ${conversation.customer_name},`
        : `Bonjour ${conversation.customer_name}, bienvenue chez ${store.name} !`;

    if (classification.intent === 'exchange_complaint' || classification.intent === 'human_handoff') {
      draftText = `${greeting} Nous avons bien noté votre demande. Un conseiller de notre équipe prend le relais immédiatement pour vérifier votre dossier avec précision.`;
    } else if (classification.intent === 'order_tracking') {
      if (latestOrder) {
        draftText = `${greeting} Concernant votre commande ${latestOrder.order_number} (${latestOrder.wilaya}), son statut actuel est : "${latestOrder.status}". Total vérifié : ${latestOrder.total_dzd.toLocaleString('en-US')} DZD.`;
      } else {
        draftText = `${greeting} Aucune commande confirmée n'est encore rattachée à ce profil. Pourriez-vous nous communiquer votre numéro de téléphone ou la référence de commande ?`;
      }
    } else if (primaryProduct) {
      const priceStr = `Le modèle "${primaryProduct.name_fr}" (${primaryProduct.sku}) est au prix vérifié de ${primaryProduct.price_dzd.toLocaleString('en-US')} DZD.`;
      const stockStr =
        primaryProduct.stock_quantity === null
          ? `La disponibilité exacte en stock n'est pas encore vérifiée dans notre inventaire ; un agent va la confirmer avant toute validation.`
          : primaryProduct.stock_quantity === 0
          ? `Cet article est actuellement en rupture de stock (0 disponible).`
          : `Stock vérifié : ${primaryProduct.stock_quantity} unité(s) disponible(s).`;
      draftText = `${greeting} ${priceStr} ${stockStr} Souhaitez-vous que nous préparions un brouillon de commande pour validation ?`;
    } else {
      draftText = `${greeting} Pour vous communiquer le tarif exact et la disponibilité vérifiée, pourriez-vous nous préciser le modèle ou la référence souhaitée ?`;
    }
  } else {
    // Standard Arabic ('ar')
    const greeting =
      tone === 'professional'
        ? `أهلاً بك ${conversation.customer_name} في ${store.name}.`
        : tone === 'concise'
        ? `مرحباً ${conversation.customer_name}،`
        : `أهلاً وسهلاً بك ${conversation.customer_name} في ${store.name}، يسعدنا تواصلك معنا.`;

    if (classification.intent === 'exchange_complaint' || classification.intent === 'human_handoff') {
      draftText = `${greeting} نقدر ملاحظتك تماماً. تم تحويل المحادثة إلى مختص خدمة العملاء لمراجعة طلبك والتواصل معك فوراً وفق سياسة المتجر: ${store.return_policy}`;
    } else if (classification.intent === 'order_tracking') {
      if (latestOrder) {
        const statusMap: Record<Order['status'], string> = {
          draft: 'مسودة طلب قيد المراجعة (غير مؤكدة بعد)',
          pending_confirmation: 'بانتظار تأكيد العميل',
          confirmed: 'مؤكد وجاهز للشحن',
          shipped: 'تم الشحن مع شركة التوصيل',
          delivered: 'تم التسليم',
          cancelled: 'ملغى',
        };
        draftText = `${greeting} بخصوص الطلب رقم ${latestOrder.order_number} المتجه إلى (${latestOrder.wilaya})، حالته الحالية هي: ${statusMap[latestOrder.status]}. الإجمالي المعتمد: ${latestOrder.total_dzd.toLocaleString('en-US')} د.ج.`;
      } else {
        draftText = `${greeting} لا يظهر لدينا طلب مسجل بهذا الحساب حالياً. يرجى تزويدنا برقم الهاتف أو رقم الطلب للتحقق منه بدقة.`;
      }
    } else if (primaryProduct) {
      const priceLine = `سعر "${primaryProduct.name_ar}" (${primaryProduct.sku}) المعتمد هو ${primaryProduct.price_dzd.toLocaleString('en-US')} د.ج.`;
      let stockLine = '';
      if (primaryProduct.stock_quantity === null) {
        stockLine =
          'ملاحظة: حالة المخزون لهذا الموديل غير مؤكدة تلقائياً حالياً، وسيقوم فريقنا بالتحقق من توفر المقاس المطلوب قبل تأكيد الطلب.';
      } else if (primaryProduct.stock_quantity === 0) {
        stockLine = 'هذا المنتج نافد من المخزون حالياً (0 قطعة متوفرة).';
      } else {
        const variantsText = primaryProduct.variants
          .filter((v) => v.stock === null || v.stock > 0)
          .map((v) => `${v.size} - ${v.color}`)
          .join('، ');
        stockLine = `متوفر في المخزون (${primaryProduct.stock_quantity} قطعة)${
          variantsText ? ` بالمقاسات والألوان التالية: ${variantsText}` : ''
        }.`;
      }
      draftText = `${greeting} ${priceLine} ${stockLine} ${store.shipping_policy} هل ترغب في إعداد مسودة طلب لمراجعتها؟`;
    } else {
      draftText = `${greeting} لتزويدك بالسعر الدقيق وحالة التوفر، يرجى تحديد اسم المنتج أو الرمز (SKU) المطلوب. ${store.shipping_policy}`;
    }
  }

  return {
    id: `draft_${Date.now()}`,
    conversation_id: conversation.id,
    store_id: store.id,
    intent: classification.intent,
    confidence: classification.confidence,
    language,
    tone,
    draft_text: draftText,
    grounded_facts: context.groundedFacts,
    missing_info_warnings: context.missingInfoWarnings,
    requires_human_approval: context.requiresHumanApproval,
    provider_mode: 'deterministic_grounded_fallback',
    created_at: new Date().toISOString(),
  };
}
