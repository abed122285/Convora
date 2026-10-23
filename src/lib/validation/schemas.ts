import { z } from 'zod';

export const EmailSchema = z
  .string()
  .trim()
  .min(5, 'البريد الإلكتروني مطلوب / Email requis')
  .max(254, 'البريد الإلكتروني طويل جداً')
  .email('صيغة البريد الإلكتروني غير صالحة (مثل name@store.dz)');

export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل'),
});

export const SignupInputSchema = z.object({
  fullName: z.string().trim().min(2, 'الاسم الكامل مطلوب').max(100),
  storeName: z.string().trim().min(2, 'اسم المتجر مطلوب').max(100),
  wilaya: z.string().trim().min(2, 'الولاية مطلوبة').max(60),
  email: EmailSchema,
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
    .max(128),
});

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export const SendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, 'لا يمكن إرسال رسالة فارغة').max(2000, 'الرسالة تتجاوز الحد المسموح (2000 حرف)'),
  senderType: z.enum(['merchant', 'internal_note']).default('merchant'),
  aiGenerated: z.boolean().optional().default(false),
});

export const GenerateAIDraftSchema = z.object({
  conversationId: z.string().min(1),
  language: z.enum(['ar', 'fr', 'darja']).default('ar'),
  tone: z.enum(['friendly', 'professional', 'concise']).default('friendly'),
  customInstructions: z.string().max(400).optional(),
});

export const ProductCreateSchema = z.object({
  sku: z.string().trim().min(2, 'رمز المنتج SKU مطلوب').max(40),
  name_ar: z.string().trim().min(2, 'اسم المنتج بالعربية مطلوب').max(140),
  name_fr: z.string().trim().min(2, 'Nom du produit en français requis').max(140),
  description_ar: z.string().trim().max(1000).default(''),
  description_fr: z.string().trim().max(1000).default(''),
  category: z.string().trim().min(2).max(80),
  price_dzd: z.number().int().min(100, 'السعر يجب أن يكون 100 د.ج على الأقل').max(5000000),
  stock_quantity: z.number().int().min(0).max(100000).nullable(),
  ai_visible: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        id: z.string(),
        size: z.string().trim().min(1).max(30),
        color: z.string().trim().min(1).max(40),
        stock: z.number().int().min(0).nullable(),
      })
    )
    .default([]),
});

export const OrderStatusTransitionSchema = z.object({
  orderId: z.string().min(1),
  nextStatus: z.enum([
    'draft',
    'pending_confirmation',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled',
  ]),
});

export const CreateOrderDraftSchema = z.object({
  conversationId: z.string().nullable().optional(),
  customerId: z.string().min(1),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(30),
  wilaya: z.string().trim().min(2).max(80),
  commune: z.string().trim().max(80).default(''),
  deliveryType: z.enum(['home', 'stop_desk']).default('home'),
  isAiDraft: z.boolean().default(true),
  shippingFeeDzd: z.number().int().min(0).max(5000).default(600),
  notes: z.string().max(500).default(''),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantLabel: z.string().max(80).default(''),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1, 'يجب إضافة منتج واحد على الأقل للطلب'),
});

export const UpdateLeadStageSchema = z.object({
  leadId: z.string().min(1),
  stage: z.enum(['new', 'qualified', 'high_intent', 'follow_up', 'converted', 'lost']),
  notes: z.string().max(1000).optional(),
});

export const UpdateAISettingsSchema = z.object({
  ai_enabled: z.boolean(),
  default_language: z.enum(['ar', 'fr', 'darja']),
  ai_tone: z.enum(['friendly', 'professional', 'concise']),
  require_human_approval: z.boolean(),
  confidence_threshold: z.number().min(0.5).max(0.99),
  return_policy: z.string().trim().min(5).max(1000),
  shipping_policy: z.string().trim().min(5).max(1000),
});

export const WebhookPayloadSchema = z.object({
  provider: z.enum(['instagram_direct', 'whatsapp_business', 'facebook_messenger']),
  externalEventId: z.string().trim().min(4).max(128),
  storeSlug: z.string().trim().min(2).max(80),
  customerName: z.string().trim().min(1).max(120),
  customerHandle: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().max(30).optional().default(''),
  customerWilaya: z.string().trim().max(60).optional().default('16 - Alger'),
  messageBody: z.string().trim().min(1).max(2000),
  signatureHeader: z.string().optional(),
});
