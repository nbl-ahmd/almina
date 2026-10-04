import type { Db, IndexDescription } from 'mongodb';

// Additive only. No uniqueness changes without a production duplicate inventory.
export const indexPlan: Readonly<Record<string, readonly IndexDescription[]>> = {
  products: [
    { name: 'v1_product_business_id', key: { product_id: 1 } },
    { name: 'v1_product_category_page', key: { category: 1, _id: -1, disabled: 1 } },
    { name: 'v1_product_featured_page', key: { featured: 1, _id: -1, disabled: 1 } },
    { name: 'v1_product_sale_page', key: { sale: 1, _id: -1, disabled: 1 } },
    { name: 'v1_product_search', key: { name: 'text', description: 'text' }, default_language: 'none', weights: { name: 5, description: 1 } },
  ],
  orders: [
    { name: 'commerce_order_number_lookup', key: { orderId: 1 } },
    { name: 'commerce_v2_number_unique', key: { orderId: 1 }, unique: true, partialFilterExpression: { schemaVersion: 2 } },
    { name: 'commerce_order_status', key: { status: 1, _id: -1 } },
    { name: 'v1_order_city_page', key: { 'customer.city': 1, _id: -1 } },
    { name: 'v1_order_state_page', key: { dispatched: 1, canceled: 1, _id: -1 } },
    { name: 'v1_order_city_state_page', key: { 'customer.city': 1, dispatched: 1, canceled: 1, _id: -1 } },
  ],
  media_history: [{ name: 'media_entity_history', key: { collection: 1, entityId: 1, createdAt: -1 } },
    { name: 'media_previous_single', key: { collection: 1, 'previousAssets.image': 1, createdAt: -1 } },
    { name: 'media_previous_multiple', key: { collection: 1, 'previousAssets.images': 1, createdAt: -1 } }],
  inventory_adjustments: [{ name: 'inventory_product_history', key: { productId: 1, createdAt: -1 } }],
  auth_administration_audit: [{ name: 'staff_account_history', key: { targetUserId: 1, createdAt: -1 } }],
  checkout_requests: [{ name: 'operations_checkout_order', key: { orderId: 1 } }],
  webhook_receipts: [{ name: 'operations_webhook_pending', key: { state: 1, receivedAt: 1 } }],
  order_outbox: [{ name: 'commerce_outbox_claim', key: { state: 1, leaseUntil: 1, createdAt: 1 } },
    { name: 'staff_push_job_claim', key: { createdAt: 1, pushState: 1, pushLeaseUntil: 1, pushNextAttemptAt: 1 } }],
  staff_push_deliveries: [{ name: 'staff_push_review', key: { state: 1, createdAt: 1 } }],
  users: [{ name: 'staff_push_scope', key: { role: 1, disabled: 1, _id: 1 } }],
  conversations: [{ name: 'whatsapp_sender_lookup', key: { from: 1 } }],
  whatsappposters: [{ name: 'whatsapp_poster_filename', key: { image: 1 } }],
  auth_rate_limits: [{ name: 'auth_quota_expiry', key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  api_sessions: [
    { name: 'v1_session_token', key: { tokenHash: 1 }, unique: true },
    { name: 'v2_session_user', key: { userId: 1 } },
    { name: 'v1_session_expiry', key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ],
};
export async function applyIndexes(db: Db) {
  for (const [collection, indexes] of Object.entries(indexPlan)) {
    await db.collection(collection).createIndexes([...indexes], { maxTimeMS: 60000 });
  }
}
