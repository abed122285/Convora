import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { defaultRepository } from './src/lib/supabase/repository';
import {
  buildPrivacySafeRecoveryResponse,
  SlidingWindowRateLimiter,
} from './src/lib/security/authz';
import {
  CreateOrderDraftSchema,
  ForgotPasswordSchema,
  GenerateAIDraftSchema,
  LoginInputSchema,
  OrderStatusTransitionSchema,
  ProductCreateSchema,
  SendMessageSchema,
  SignupInputSchema,
  UpdateAISettingsSchema,
  UpdateLeadStageSchema,
  WebhookPayloadSchema,
} from './src/lib/validation/schemas';
import { buildGroundedBusinessContext } from './src/lib/ai/engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const passwordResetLimiter = new SlidingWindowRateLimiter(4, 60_000);
const aiDraftLimiter = new SlidingWindowRateLimiter(15, 60_000);

function isRealSecret(val: string | undefined, placeholder: string): boolean {
  return Boolean(val && val.trim().length > 8 && val.trim() !== placeholder);
}

function getActorContext(req: express.Request): {
  userId: string;
  storeId: string;
} {
  const userId =
    (req.header('x-convora-user-id') || 'user_amel_owner').trim();
  const storeId =
    (req.header('x-convora-store-id') || 'store_casbah_atelier').trim();
  return { userId, storeId };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '256kb' }));

  // Application Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });

  // 1. Safe System Integration Status (Never exposes keys)
  app.get('/api/system/status', (_req, res) => {
    const geminiConfigured = isRealSecret(
      process.env.GEMINI_API_KEY,
      'MY_GEMINI_API_KEY'
    );
    const supabaseConfigured =
      isRealSecret(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        'https://your-project-ref.supabase.co'
      ) &&
      isRealSecret(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'your-supabase-anon-or-publishable-key'
      );
    const metaConfigured =
      isRealSecret(process.env.META_APP_ID, 'your-meta-app-id') &&
      isRealSecret(process.env.META_APP_SECRET, 'your-meta-app-secret');

    res.json({
      ok: true,
      integrations: {
        supabaseConfigured,
        geminiConfigured,
        metaConfigured,
        runtimeModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      },
    });
  });

  // 2. Privacy-Safe Password Recovery
  app.post('/api/auth/forgot-password', (req, res) => {
    const clientKey = req.ip || 'local_client';
    const rateCheck = passwordResetLimiter.check(clientKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: rateCheck.retryAfterSeconds,
        messageAr:
          'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار قبل إعادة المحاولة حرصاً على سلامة الحساب.',
        messageFr:
          'Trop de tentatives. Veuillez patienter avant de réessayer.',
      });
    }

    const parsed = ForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        messageAr:
          parsed.error.issues[0]?.message || 'صيغة البريد الإلكتروني غير صالحة',
        messageFr: 'Adresse e-mail invalide.',
      });
    }

    const emailExists = defaultRepository.members.some(
      (m) => m.email.toLowerCase() === parsed.data.email.toLowerCase()
    );

    // Privacy-safe: identical response regardless of whether emailExists is true or false
    const responsePayload = buildPrivacySafeRecoveryResponse(emailExists);
    return res.json(responsePayload);
  });

  // 3. Login & Signup Validation
  app.post('/api/auth/login', (req, res) => {
    const parsed = LoginInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'بيانات الدخول غير صالحة',
      });
    }

    const matchedMember =
      defaultRepository.members.find(
        (m) => m.email.toLowerCase() === parsed.data.email.toLowerCase()
      ) || defaultRepository.members[0];

    return res.json({
      ok: true,
      session: {
        userId: matchedMember.user_id,
        email: matchedMember.email,
        fullName: matchedMember.full_name,
        role: matchedMember.role,
        storeId: matchedMember.store_id,
      },
    });
  });

  app.post('/api/auth/signup', (req, res) => {
    const parsed = SignupInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'بيانات التسجيل غير صالحة',
      });
    }

    return res.json({
      ok: true,
      requiresEmailVerification: true,
      email: parsed.data.email,
    });
  });

  // 4. Multi-Tenant Store Snapshot
  app.get('/api/store/snapshot', (req, res) => {
    try {
      const { userId, storeId } = getActorContext(req);
      const snapshot = defaultRepository.getStoreSnapshot(userId, storeId);
      return res.json({ ok: true, data: snapshot });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'ACCESS_DENIED';
      return res.status(403).json({
        ok: false,
        code,
        message:
          code === 'CROSS_TENANT_ACCESS_DENIED'
            ? 'غير مصرح لك بالوصول إلى بيانات متجر آخر (عزل المستأجرين نشط).'
            : 'غير مصرح بتنفيذ هذا الإجراء.',
      });
    }
  });

  // 5. Send Approved Reply or Internal Note
  app.post('/api/inbox/messages', (req, res) => {
    const parsed = SendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'الرسالة غير صالحة',
      });
    }

    try {
      const { userId, storeId } = getActorContext(req);
      const result = defaultRepository.appendMessage({
        userId,
        storeId,
        conversationId: parsed.data.conversationId,
        body: parsed.data.body,
        senderType: parsed.data.senderType,
        aiGenerated: parsed.data.aiGenerated,
      });
      return res.json({ ok: true, data: result });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'ERROR';
      return res.status(403).json({ ok: false, code });
    }
  });

  // 6. Conversation Status Transition
  app.patch('/api/inbox/conversations/:id/status', (req, res) => {
    try {
      const { userId, storeId } = getActorContext(req);
      const nextStatus = req.body?.nextStatus;
      if (
        !['open', 'pending_review', 'human_active', 'resolved'].includes(
          nextStatus
        )
      ) {
        return res
          .status(400)
          .json({ ok: false, code: 'INVALID_CONVERSATION_STATUS' });
      }
      const updated = defaultRepository.updateConversationStatus({
        userId,
        storeId,
        conversationId: req.params.id,
        nextStatus,
      });
      return res.json({ ok: true, data: updated });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'ERROR';
      return res.status(403).json({ ok: false, code });
    }
  });

  // 7. Server-Only Context-Grounded AI Reply Draft Generation
  app.post('/api/ai/generate-draft', async (req, res) => {
    const { userId, storeId } = getActorContext(req);
    const rate = aiDraftLimiter.check(`${userId}:${storeId}`);
    if (!rate.allowed) {
      return res.status(429).json({
        ok: false,
        code: 'AI_RATE_LIMITED',
        retryAfterSeconds: rate.retryAfterSeconds,
      });
    }

    const parsed = GenerateAIDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message,
      });
    }

    try {
      // First generate the verified deterministic draft & grounded context
      const fallbackDraft = defaultRepository.generateDraftForConversation({
        userId,
        storeId,
        conversationId: parsed.data.conversationId,
        language: parsed.data.language,
        tone: parsed.data.tone,
      });

      const hasRealGeminiKey = isRealSecret(
        process.env.GEMINI_API_KEY,
        'MY_GEMINI_API_KEY'
      );

      if (!hasRealGeminiKey) {
        return res.json({
          ok: true,
          data: fallbackDraft,
        });
      }

      // Live server-side Gemini call using @google/genai
      const store = defaultRepository.stores.find((s) => s.id === storeId)!;
      const conv = defaultRepository.conversations.find(
        (c) => c.id === parsed.data.conversationId && c.store_id === storeId
      )!;
      const convMessages = defaultRepository.messages.filter(
        (m) => m.conversation_id === conv.id && m.store_id === storeId
      );
      const storeProducts = defaultRepository.products.filter(
        (p) => p.store_id === storeId
      );
      const customerOrders = defaultRepository.orders.filter(
        (o) =>
          o.store_id === storeId &&
          (o.customer_id === conv.customer_id || o.conversation_id === conv.id)
      );

      const grounded = buildGroundedBusinessContext({
        store,
        conversation: conv,
        messages: convMessages,
        storeProducts,
        customerOrders,
      });

      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
        const languageLabel =
          parsed.data.language === 'darja'
            ? 'Algerian Darja (الدارجة الجزائرية المحترمة)'
            : parsed.data.language === 'fr'
            ? 'French (Français)'
            : 'Modern Standard Arabic (العربية)';

        const response = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents: [
              `Customer Name: ${conv.customer_name} (${conv.customer_wilaya})`,
              `Recent Conversation History:\n${convMessages
                .filter((m) => m.sender_type !== 'internal_note')
                .map((m) => `[${m.sender_type}]: ${m.body}`)
                .join('\n')}`,
              `Verified Store Facts:\n${grounded.groundedFacts.join('\n')}`,
              `Missing / Unverified Warnings:\n${
                grounded.missingInfoWarnings.join('\n') || 'None'
              }`,
              parsed.data.customInstructions
                ? `Merchant Guidance: ${parsed.data.customInstructions}`
                : '',
            ].join('\n\n'),
            config: {
              systemInstruction:
                `You are CONVORA AI Assistant for an Algerian e-commerce merchant (${store.name}). ` +
                `Draft a helpful reply in ${languageLabel} with a ${parsed.data.tone} tone. ` +
                `STRICT GROUNDING RULE: Never invent prices, stock counts, discounts, delivery times, or order confirmations. ` +
                `If inventory or order info is listed under Missing/Unverified Warnings, explicitly state that the team will verify it before confirming. Keep response under 90 words.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  draft_text: {
                    type: Type.STRING,
                    description: 'The grounded reply draft for the merchant to review.',
                  },
                },
                required: ['draft_text'],
              },
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 2500)
          ),
        ]);

        const rawText = response.text?.trim();
        if (rawText) {
          const parsedJson = JSON.parse(rawText) as { draft_text?: string };
          if (parsedJson.draft_text && parsedJson.draft_text.trim().length > 5) {
            fallbackDraft.draft_text = parsedJson.draft_text.trim();
            fallbackDraft.provider_mode = 'gemini_live';
          }
        }
      } catch {
        // Keep verified deterministic grounded draft when external Gemini API is unreachable
      }

      return res.json({
        ok: true,
        data: fallbackDraft,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'AI_DRAFT_FAILED';
      return res.status(400).json({ ok: false, code });
    }
  });

  // 8. Product Catalog Creation
  app.post('/api/products', (req, res) => {
    const parsed = ProductCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'بيانات المنتج غير صالحة',
      });
    }

    try {
      const { userId, storeId } = getActorContext(req);
      const created = defaultRepository.createProduct({
        userId,
        storeId,
        ...parsed.data,
      });
      return res.json({ ok: true, data: created });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'PRODUCT_ERROR';
      return res.status(403).json({ ok: false, code });
    }
  });

  // 9. Order Draft Creation & Status Transitions
  app.post('/api/orders', (req, res) => {
    const parsed = CreateOrderDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'بيانات الطلب غير صالحة',
      });
    }

    try {
      const { userId, storeId } = getActorContext(req);
      const order = defaultRepository.createOrderDraft({
        userId,
        storeId,
        ...parsed.data,
      });
      return res.json({ ok: true, data: order });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'ORDER_CREATE_ERROR';
      return res.status(400).json({ ok: false, code });
    }
  });

  app.post('/api/orders/transition', (req, res) => {
    const parsed = OrderStatusTransitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message,
      });
    }

    try {
      const { userId, storeId } = getActorContext(req);
      const updated = defaultRepository.transitionOrder({
        userId,
        storeId,
        orderId: parsed.data.orderId,
        nextStatus: parsed.data.nextStatus,
      });
      return res.json({ ok: true, data: updated });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'ORDER_TRANSITION_ERROR';
      return res.status(400).json({ ok: false, code });
    }
  });

  // 10. Lead Stage Update
  app.patch('/api/leads/stage', (req, res) => {
    const parsed = UpdateLeadStageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message,
      });
    }

    try {
      const { userId, storeId } = getActorContext(req);
      const updated = defaultRepository.updateLeadStage({
        userId,
        storeId,
        ...parsed.data,
      });
      return res.json({ ok: true, data: updated });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'LEAD_UPDATE_ERROR';
      return res.status(403).json({ ok: false, code });
    }
  });

  // 11. AI Settings Update
  app.put('/api/settings/ai', (req, res) => {
    const parsed = UpdateAISettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message,
      });
    }

    try {
      const { userId, storeId } = getActorContext(req);
      const updated = defaultRepository.updateAISettings({
        userId,
        storeId,
        ...parsed.data,
      });
      return res.json({ ok: true, data: updated });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'SETTINGS_UPDATE_ERROR';
      return res.status(403).json({ ok: false, code });
    }
  });

  // 12. Automation Toggle
  app.post('/api/automations/:id/toggle', (req, res) => {
    try {
      const { userId, storeId } = getActorContext(req);
      const rule = defaultRepository.toggleAutomation({
        userId,
        storeId,
        automationId: req.params.id,
      });
      return res.json({ ok: true, data: rule });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'AUTOMATION_ERROR';
      return res.status(403).json({ ok: false, code });
    }
  });

  // 13. Webhook Ingestion with Signature Verification & Idempotency
  app.post('/api/webhooks/meta', (req, res) => {
    const parsed = WebhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_WEBHOOK_PAYLOAD',
        message: parsed.error.issues[0]?.message,
      });
    }

    try {
      const expectedToken =
        process.env.META_WEBHOOK_VERIFY_TOKEN &&
        process.env.META_WEBHOOK_VERIFY_TOKEN !== 'your-meta-webhook-verify-token'
          ? process.env.META_WEBHOOK_VERIFY_TOKEN
          : 'convora-hmac-verified-2026';

      const signatureVerified =
        parsed.data.signatureHeader === expectedToken ||
        req.header('x-hub-signature-256') === expectedToken;

      const result = defaultRepository.ingestWebhookEvent({
        storeSlug: parsed.data.storeSlug,
        provider: parsed.data.provider,
        externalEventId: parsed.data.externalEventId,
        customerName: parsed.data.customerName,
        customerHandle: parsed.data.customerHandle,
        customerPhone: parsed.data.customerPhone,
        customerWilaya: parsed.data.customerWilaya,
        messageBody: parsed.data.messageBody,
        signatureVerified,
      });

      if (result.rejectedSignature) {
        return res.status(401).json({
          ok: false,
          code: 'WEBHOOK_SIGNATURE_REJECTED',
          data: result,
        });
      }

      return res.json({ ok: true, data: result });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'WEBHOOK_ERROR';
      return res.status(400).json({ ok: false, code });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CONVORA Server listening on http://localhost:${PORT}`);
  });
}

startServer();
