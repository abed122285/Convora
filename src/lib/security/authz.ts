import type {
  ConversationStatus,
  MemberRole,
  OrderStatus,
  StoreMember,
} from '../../types/domain';

export type SecurityAction =
  | 'read_store_data'
  | 'send_message'
  | 'generate_ai_draft'
  | 'manage_products'
  | 'transition_order'
  | 'manage_ai_settings'
  | 'manage_channels'
  | 'manage_automations'
  | 'manage_team';

const ROLE_PERMISSIONS: Record<MemberRole, SecurityAction[]> = {
  owner: [
    'read_store_data',
    'send_message',
    'generate_ai_draft',
    'manage_products',
    'transition_order',
    'manage_ai_settings',
    'manage_channels',
    'manage_automations',
    'manage_team',
  ],
  admin: [
    'read_store_data',
    'send_message',
    'generate_ai_draft',
    'manage_products',
    'transition_order',
    'manage_ai_settings',
    'manage_channels',
    'manage_automations',
  ],
  agent: [
    'read_store_data',
    'send_message',
    'generate_ai_draft',
    'transition_order',
  ],
  analyst: ['read_store_data'],
};

/**
 * Verifies that an authenticated user is a member of the target store
 * and holds a role permitted to perform the requested action.
 * Never trusts client-provided store_id alone.
 */
export function authorizeStoreAction(params: {
  userId: string | null | undefined;
  targetStoreId: string;
  memberships: StoreMember[];
  action: SecurityAction;
}): {
  authorized: boolean;
  member?: StoreMember;
  reason?: string;
} {
  const { userId, targetStoreId, memberships, action } = params;
  if (!userId) {
    return { authorized: false, reason: 'UNAUTHENTICATED' };
  }

  const membership = memberships.find(
    (m) => m.user_id === userId && m.store_id === targetStoreId
  );

  if (!membership) {
    return {
      authorized: false,
      reason: 'CROSS_TENANT_ACCESS_DENIED',
    };
  }

  const allowedActions = ROLE_PERMISSIONS[membership.role] ?? [];
  if (!allowedActions.includes(action)) {
    return {
      authorized: false,
      member: membership,
      reason: `INSUFFICIENT_ROLE_${membership.role.toUpperCase()}`,
    };
  }

  return { authorized: true, member: membership };
}

/**
 * Enforces strict order lifecycle transitions.
 * Prevents jumping directly from draft to shipped/delivered without confirmation.
 */
const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['pending_confirmation', 'confirmed', 'cancelled'],
  pending_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus
): { valid: boolean; reason?: string } {
  if (current === next) {
    return { valid: false, reason: 'Order is already in this status.' };
  }
  const allowed = ALLOWED_ORDER_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return {
      valid: false,
      reason: `Cannot transition order directly from '${current}' to '${next}'.`,
    };
  }
  return { valid: true };
}

/**
 * Enforces valid conversation status transitions.
 */
const ALLOWED_CONVERSATION_TRANSITIONS: Record<
  ConversationStatus,
  ConversationStatus[]
> = {
  open: ['pending_review', 'human_active', 'resolved'],
  pending_review: ['open', 'human_active', 'resolved'],
  human_active: ['open', 'resolved'],
  resolved: ['open', 'human_active'],
};

export function canTransitionConversationStatus(
  current: ConversationStatus,
  next: ConversationStatus
): boolean {
  if (current === next) return true;
  return (ALLOWED_CONVERSATION_TRANSITIONS[current] ?? []).includes(next);
}

/**
 * Calculates order totals strictly on the server from verified catalog items.
 */
export function calculateVerifiedOrderTotals(
  items: Array<{ unit_price_dzd: number; quantity: number }>,
  shippingFeeDzd: number
): { subtotal_dzd: number; shipping_fee_dzd: number; total_dzd: number } {
  const subtotal_dzd = items.reduce((sum, item) => {
    const qty = Math.max(1, Math.floor(item.quantity));
    const price = Math.max(0, Math.floor(item.unit_price_dzd));
    return sum + qty * price;
  }, 0);
  const safeShipping = Math.max(0, Math.floor(shippingFeeDzd));
  return {
    subtotal_dzd,
    shipping_fee_dzd: safeShipping,
    total_dzd: subtotal_dzd + safeShipping,
  };
}

/**
 * Privacy-safe password recovery response generator.
 * Always returns the same generic message regardless of whether the email exists.
 */
export function buildPrivacySafeRecoveryResponse(_emailExists: boolean): {
  ok: true;
  genericMessageAr: string;
  genericMessageFr: string;
  cooldownSeconds: number;
} {
  return {
    ok: true,
    genericMessageAr:
      'إذا كان هذا البريد الإلكتروني مسجلاً لدينا، ستتلقى رابطاً لإعادة تعيين كلمة المرور خلال دقائق.',
    genericMessageFr:
      'Si cette adresse e-mail est associée à un compte, vous recevrez un lien de réinitialisation dans quelques minutes.',
    cooldownSeconds: 60,
  };
}

/**
 * In-memory sliding-window rate limiter for sensitive routes (auth, password reset, AI draft).
 */
export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  public check(key: string, nowMs: number = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const timestamps = (this.hits.get(key) ?? []).filter(
      (t) => nowMs - t < this.windowMs
    );
    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0] ?? nowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((this.windowMs - (nowMs - oldest)) / 1000)
      );
      this.hits.set(key, timestamps);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    timestamps.push(nowMs);
    this.hits.set(key, timestamps);
    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      retryAfterSeconds: 0,
    };
  }
}

/**
 * Webhook idempotency key builder scoped by store + provider + externalEventId.
 */
export function buildWebhookIdempotencyKey(
  storeId: string,
  provider: string,
  externalEventId: string
): string {
  return `${storeId}::${provider}::${externalEventId.trim()}`;
}
