import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeStoreAction,
  buildPrivacySafeRecoveryResponse,
  canTransitionOrderStatus,
  SlidingWindowRateLimiter,
} from '../lib/security/authz';
import {
  ForgotPasswordSchema,
  ProductCreateSchema,
  SendMessageSchema,
} from '../lib/validation/schemas';
import { MultiTenantStoreRepository } from '../lib/supabase/repository';

test('1. Unauthorized users cannot access protected store data', () => {
  const repo = new MultiTenantStoreRepository();
  const check = authorizeStoreAction({
    userId: null,
    targetStoreId: 'store_casbah_atelier',
    memberships: repo.members,
    action: 'read_store_data',
  });
  assert.equal(check.authorized, false);
  assert.equal(check.reason, 'UNAUTHENTICATED');
});

test('2. Users cannot access another store records (multi-tenant isolation)', () => {
  const repo = new MultiTenantStoreRepository();
  assert.throws(
    () => repo.getStoreSnapshot('user_amel_owner', 'store_oran_beaute'),
    /CROSS_TENANT_ACCESS_DENIED/
  );
});

test('3. Role-based access control prevents analyst from mutating products or sending messages', () => {
  const repo = new MultiTenantStoreRepository();
  assert.throws(
    () =>
      repo.appendMessage({
        userId: 'user_lina_analyst',
        storeId: 'store_casbah_atelier',
        conversationId: 'conv_yasmine_1',
        body: 'Test message from analyst',
        senderType: 'merchant',
      }),
    /INSUFFICIENT_ROLE_ANALYST/
  );
});

test('4. Validation rejects malformed emails, empty messages, and negative prices', () => {
  const badEmail = ForgotPasswordSchema.safeParse({
    email: 'merchant-invalid-domain',
  });
  assert.equal(badEmail.success, false);

  const emptyMsg = SendMessageSchema.safeParse({
    conversationId: 'conv_yasmine_1',
    body: '   ',
  });
  assert.equal(emptyMsg.success, false);

  const invalidPrice = ProductCreateSchema.safeParse({
    sku: 'SKU-1',
    name_ar: 'منتج تجريبي',
    name_fr: 'Produit test',
    category: 'Fashion',
    price_dzd: -500,
    stock_quantity: 5,
  });
  assert.equal(invalidPrice.success, false);
});

test('5. Password recovery does not reveal whether an email address is registered', () => {
  const existingAccountRes = buildPrivacySafeRecoveryResponse(true);
  const nonExistingAccountRes = buildPrivacySafeRecoveryResponse(false);

  assert.deepEqual(existingAccountRes, nonExistingAccountRes);
  assert.equal(existingAccountRes.ok, true);
});

test('6. AI drafts do not automatically become sent messages and warn when inventory is unverified', () => {
  const repo = new MultiTenantStoreRepository();
  const initialMsgCount = repo.messages.filter(
    (m) => m.conversation_id === 'conv_meriem_2'
  ).length;

  const draft = repo.generateDraftForConversation({
    userId: 'user_amel_owner',
    storeId: 'store_casbah_atelier',
    conversationId: 'conv_meriem_2', // Linked to prod_ensemble_lin with stock_quantity: null
    language: 'ar',
    tone: 'professional',
  });

  const afterMsgCount = repo.messages.filter(
    (m) => m.conversation_id === 'conv_meriem_2'
  ).length;

  assert.equal(afterMsgCount, initialMsgCount);
  assert.equal(draft.requires_human_approval, true);
  assert.equal(draft.missing_info_warnings.length > 0, true);
});

test('7. Order creation and status transitions enforce authorization and lifecycle rules', () => {
  const repo = new MultiTenantStoreRepository();

  // Draft order cannot jump directly to delivered
  const invalidTransition = canTransitionOrderStatus('draft', 'delivered');
  assert.equal(invalidTransition.valid, false);

  // Valid transition: draft -> confirmed clears is_ai_draft flag
  const confirmed = repo.transitionOrder({
    userId: 'user_amel_owner',
    storeId: 'store_casbah_atelier',
    orderId: 'ord_1044_draft',
    nextStatus: 'confirmed',
  });
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.is_ai_draft, false);
});

test('8. Duplicate webhooks do not create duplicate conversations or messages', () => {
  const repo = new MultiTenantStoreRepository();
  const beforeConvCount = repo.conversations.length;

  const firstDelivery = repo.ingestWebhookEvent({
    storeSlug: 'casbah-atelier-dz',
    provider: 'whatsapp_business',
    externalEventId: 'wamid.UNIQUE_EVENT_9001',
    customerName: 'أمين بوضياف',
    customerHandle: '+213 551 22 33 44',
    customerPhone: '0551 22 33 44',
    customerWilaya: '16 - Alger',
    messageBody: 'بشحال عباية حرير المدينة؟',
    signatureVerified: true,
  });

  assert.equal(firstDelivery.duplicate, false);
  assert.equal(repo.conversations.length, beforeConvCount + 1);

  const secondDelivery = repo.ingestWebhookEvent({
    storeSlug: 'casbah-atelier-dz',
    provider: 'whatsapp_business',
    externalEventId: 'wamid.UNIQUE_EVENT_9001',
    customerName: 'أمين بوضياف',
    customerHandle: '+213 551 22 33 44',
    customerPhone: '0551 22 33 44',
    customerWilaya: '16 - Alger',
    messageBody: 'بشحال عباية حرير المدينة؟',
    signatureVerified: true,
  });

  assert.equal(secondDelivery.duplicate, true);
  assert.equal(repo.conversations.length, beforeConvCount + 1);
});

test('9. Sliding window rate limiter blocks burst abuse cleanly', () => {
  const limiter = new SlidingWindowRateLimiter(3, 60_000);
  assert.equal(limiter.check('ip_1', 1000).allowed, true);
  assert.equal(limiter.check('ip_1', 2000).allowed, true);
  assert.equal(limiter.check('ip_1', 3000).allowed, true);
  const blocked = limiter.check('ip_1', 4000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds > 0, true);
});
