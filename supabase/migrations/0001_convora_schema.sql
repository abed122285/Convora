-- CONVORA Multi-Tenant SaaS Database Schema & RLS Policies
-- Incremental & idempotent migration preserving existing objects where present

create extension if not exists "pgcrypto";

-- 1. Stores (Core Tenant Boundary)
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null default 'fashion',
  wilaya text not null default '16 - Alger',
  currency text not null default 'DZD',
  default_language text not null default 'ar' check (default_language in ('ar', 'fr', 'darja')),
  ai_tone text not null default 'friendly' check (ai_tone in ('friendly', 'professional', 'concise')),
  ai_enabled boolean not null default true,
  require_human_approval boolean not null default true,
  confidence_threshold numeric(3,2) not null default 0.80,
  return_policy text not null default 'استبدال مجاني خلال 48 ساعة في حال وجود عيب مصنعي. التوصيل متوفر لـ 58 ولاية.',
  shipping_policy text not null default 'التوصيل للجزائر العاصمة (400 د.ج) ولباقي الولايات (600 - 900 د.ج) عبر ياليدين و ZR Express خلال 24-72 ساعة.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Store Members (Multi-tenant RBAC)
create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner', 'admin', 'agent', 'analyst')),
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

-- 3. Channel Connections
create table if not exists public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null check (provider in ('instagram_direct', 'whatsapp_business', 'facebook_messenger')),
  account_name text not null,
  external_account_id text,
  status text not null default 'not_connected' check (status in ('connected', 'not_connected', 'config_required', 'simulated_demo')),
  webhook_verified boolean not null default false,
  last_webhook_at timestamptz,
  messages_today integer not null default 0,
  created_at timestamptz not null default now(),
  unique (store_id, provider)
);

-- 4. Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sku text not null,
  name_ar text not null,
  name_fr text not null,
  description_ar text not null default '',
  description_fr text not null default '',
  category text not null default 'Modest Fashion',
  price_dzd integer not null check (price_dzd >= 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  variants jsonb not null default '[]'::jsonb,
  ai_visible boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, sku)
);

-- 5. Product Images (linked to private store-media bucket)
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null,
  customer_handle text not null,
  customer_phone text,
  customer_wilaya text,
  channel text not null check (channel in ('instagram_direct', 'whatsapp_business', 'facebook_messenger')),
  status text not null default 'open' check (status in ('open', 'pending_review', 'human_active', 'resolved')),
  intent text not null default 'product_inquiry' check (intent in (
    'greeting', 'price_inquiry', 'product_inquiry', 'size_stock_inquiry',
    'order_request', 'order_tracking', 'shipping_wilaya', 'exchange_complaint',
    'human_handoff', 'vip_lead', 'unknown'
  )),
  intent_confidence numeric(3,2) not null default 0.90,
  unread_count integer not null default 0,
  is_high_intent boolean not null default false,
  ai_needs_review boolean not null default false,
  assigned_to text,
  related_product_ids uuid[] not null default '{}',
  last_message_preview text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 7. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'merchant', 'internal_note', 'system')),
  sender_name text not null,
  body text not null,
  delivery_status text not null default 'delivered' check (delivery_status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  ai_generated boolean not null default false,
  approved_by_user_id uuid,
  created_at timestamptz not null default now()
);

-- 8. Leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  wilaya text not null,
  source_channel text not null check (source_channel in ('instagram_direct', 'whatsapp_business', 'facebook_messenger')),
  stage text not null default 'new' check (stage in ('new', 'qualified', 'high_intent', 'follow_up', 'converted', 'lost')),
  interested_products text[] not null default '{}',
  estimated_value_dzd integer not null default 0,
  assigned_to text,
  notes text not null default '',
  follow_up_due_at timestamptz,
  last_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 9. Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_number text not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  wilaya text not null,
  commune text not null default '',
  delivery_type text not null default 'home' check (delivery_type in ('home', 'stop_desk')),
  status text not null default 'draft' check (status in ('draft', 'pending_confirmation', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  is_ai_draft boolean not null default false,
  subtotal_dzd integer not null check (subtotal_dzd >= 0),
  shipping_fee_dzd integer not null default 600 check (shipping_fee_dzd >= 0),
  total_dzd integer not null check (total_dzd >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, order_number)
);

-- 10. Order Items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  variant_label text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price_dzd integer not null check (unit_price_dzd >= 0),
  line_total_dzd integer not null check (line_total_dzd >= 0)
);

-- 11. AI Usage
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  model text not null,
  language text not null,
  tone text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  grounded_in_catalog boolean not null default true,
  missing_info_flagged boolean not null default false,
  status text not null check (status in ('draft_generated', 'approved_inserted', 'provider_unavailable', 'rate_limited')),
  created_at timestamptz not null default now()
);

-- 12. Webhook Events (Idempotency & Signature Verification Audit)
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  signature_verified boolean not null default false,
  status text not null check (status in ('processed', 'duplicate_ignored', 'rejected_signature', 'failed')),
  processed_at timestamptz not null default now(),
  unique (store_id, provider, external_event_id)
);

-- Enable Row Level Security on all tenant tables
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.channel_connections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ai_usage enable row level security;
alter table public.webhook_events enable row level security;

-- Helper function: verify authenticated user is a member of the target store
create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
  );
$$;

-- RLS Policies for Store Isolation
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'stores' and policyname = 'tenant_isolation_stores') then
    create policy tenant_isolation_stores on public.stores
      for all using (public.is_store_member(id));
  end if;
end $$;
