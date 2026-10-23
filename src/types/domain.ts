export type UILocale = 'ar' | 'fr';
export type ReplyLanguage = 'ar' | 'fr' | 'darja';
export type AITone = 'friendly' | 'professional' | 'concise';
export type MemberRole = 'owner' | 'admin' | 'agent' | 'analyst';

export type ChannelProvider = 'instagram_direct' | 'whatsapp_business' | 'facebook_messenger';
export type ChannelStatus = 'connected' | 'not_connected' | 'config_required' | 'simulated_demo';

export type ConversationStatus = 'open' | 'pending_review' | 'human_active' | 'resolved';

export type CustomerIntent =
  | 'greeting'
  | 'price_inquiry'
  | 'product_inquiry'
  | 'size_stock_inquiry'
  | 'order_request'
  | 'order_tracking'
  | 'shipping_wilaya'
  | 'exchange_complaint'
  | 'human_handoff'
  | 'vip_lead'
  | 'unknown';

export type MessageSenderType = 'customer' | 'merchant' | 'internal_note' | 'system';
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export type LeadStage = 'new' | 'qualified' | 'high_intent' | 'follow_up' | 'converted' | 'lost';

export type OrderStatus =
  | 'draft'
  | 'pending_confirmation'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Store {
  id: string;
  name: string;
  slug: string;
  category: string;
  wilaya: string;
  currency: 'DZD';
  default_language: ReplyLanguage;
  ai_tone: AITone;
  ai_enabled: boolean;
  require_human_approval: boolean;
  confidence_threshold: number;
  return_policy: string;
  shipping_policy: string;
  faqs: Array<{ id: string; question: string; answer: string }>;
  created_at: string;
  updated_at: string;
}

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: MemberRole;
  created_at: string;
}

export interface ChannelConnection {
  id: string;
  store_id: string;
  provider: ChannelProvider;
  account_name: string;
  external_account_id: string;
  status: ChannelStatus;
  webhook_verified: boolean;
  last_webhook_at: string | null;
  messages_today: number;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number | null; // null means stock unknown / unverified
}

export interface ProductImage {
  id: string;
  store_id: string;
  product_id: string;
  storage_path: string;
  alt_text: string;
  is_primary: boolean;
}

export interface Product {
  id: string;
  store_id: string;
  sku: string;
  name_ar: string;
  name_fr: string;
  description_ar: string;
  description_fr: string;
  category: string;
  price_dzd: number;
  stock_quantity: number | null; // null means unverified inventory
  variants: ProductVariant[];
  images: ProductImage[];
  ai_visible: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  store_id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_name: string;
  body: string;
  delivery_status: DeliveryStatus;
  ai_generated: boolean;
  approved_by_user_id?: string;
  created_at: string;
}

export interface AIDraftSuggestion {
  id: string;
  conversation_id: string;
  store_id: string;
  intent: CustomerIntent;
  confidence: number;
  language: ReplyLanguage;
  tone: AITone;
  draft_text: string;
  grounded_facts: string[];
  missing_info_warnings: string[];
  requires_human_approval: boolean;
  provider_mode: 'gemini_live' | 'deterministic_grounded_fallback';
  created_at: string;
}

export interface Conversation {
  id: string;
  store_id: string;
  customer_id: string;
  customer_name: string;
  customer_handle: string;
  customer_phone: string;
  customer_wilaya: string;
  channel: ChannelProvider;
  status: ConversationStatus;
  intent: CustomerIntent;
  intent_confidence: number;
  unread_count: number;
  is_high_intent: boolean;
  ai_needs_review: boolean;
  assigned_to: string;
  related_product_ids: string[];
  last_message_preview: string;
  last_message_at: string;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  store_id: string;
  full_name: string;
  handle: string;
  phone: string;
  wilaya: string;
  preferred_language: ReplyLanguage;
  channel: ChannelProvider;
  total_orders: number;
  lifetime_spend_dzd: number;
  is_vip: boolean;
  last_interaction_at: string;
  notes: string;
}

export interface Lead {
  id: string;
  store_id: string;
  conversation_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  wilaya: string;
  source_channel: ChannelProvider;
  stage: LeadStage;
  interested_products: string[];
  estimated_value_dzd: number;
  assigned_to: string;
  notes: string;
  follow_up_due_at: string;
  last_contact_at: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  store_id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_label: string;
  quantity: number;
  unit_price_dzd: number;
  line_total_dzd: number;
}

export interface Order {
  id: string;
  store_id: string;
  order_number: string;
  conversation_id: string | null;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  wilaya: string;
  commune: string;
  delivery_type: 'home' | 'stop_desk';
  status: OrderStatus;
  is_ai_draft: boolean;
  items: OrderItem[];
  subtotal_dzd: number;
  shipping_fee_dzd: number;
  total_dzd: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AIUsageRecord {
  id: string;
  store_id: string;
  conversation_id: string | null;
  model: string;
  language: ReplyLanguage;
  tone: AITone;
  prompt_tokens: number;
  completion_tokens: number;
  grounded_in_catalog: boolean;
  missing_info_flagged: boolean;
  status: 'draft_generated' | 'approved_inserted' | 'provider_unavailable' | 'rate_limited';
  created_at: string;
}

export interface WebhookEventRecord {
  id: string;
  store_id: string;
  provider: ChannelProvider;
  external_event_id: string;
  event_type: string;
  signature_verified: boolean;
  status: 'processed' | 'duplicate_ignored' | 'rejected_signature' | 'failed';
  processed_at: string;
}

export interface AutomationRule {
  id: string;
  store_id: string;
  name_ar: string;
  name_fr: string;
  trigger: 'incoming_message_intent' | 'unanswered_15m' | 'high_intent_detected' | 'draft_order_created';
  condition_summary_ar: string;
  condition_summary_fr: string;
  action_summary_ar: string;
  action_summary_fr: string;
  enabled: boolean;
  require_review: boolean;
  execution_mode: 'config_saved_only' | 'active_server_rule';
  total_triggered: number;
  last_triggered_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  store_id: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: MemberRole;
  action: string;
  resource_type: string;
  resource_id: string;
  summary: string;
  created_at: string;
}
