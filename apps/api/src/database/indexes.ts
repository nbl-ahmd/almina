import type { Db, IndexDescription } from 'mongodb';

// Additive only. No uniqueness changes without a production duplicate inventory.
export const indexPlan: Readonly<Record<string, readonly IndexDescription[]>> = {
  products: [
    {name:'catalog_google_export',key:{googleApproved:1,_id:1}},
    {name:'catalog_meta_export',key:{metaApproved:1,_id:1}},
    { name: 'product_family_members', key: { familyKey: 1, archivedAt: 1, product_id: 1 } },
    { name: 'v1_product_business_id', key: { product_id: 1 } },
    { name: 'retained_product_image', key: { image: 1 } },
    { name: 'retained_product_images', key: { images: 1 } },
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
    { name: 'retained_order_received_page', key: { createdAt: -1, _id: -1 } },
    { name: 'retained_order_city_received_page', key: { 'customer.city': 1, createdAt: -1, _id: -1 } },
    { name: 'retained_order_status_received_page', key: { status: 1, createdAt: -1, _id: -1 } },
    { name: 'retained_order_city_status_received_page', key: { 'customer.city': 1, status: 1, createdAt: -1, _id: -1 } },
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
  catalog_search_terms:[{name:'search_token_prefix',key:{terms:1}}],
  product_reviews:[{name:'product_approved_reviews',key:{productId:1,moderation:1,createdAt:-1}},{name:'review_moderation_queue',key:{moderation:1,createdAt:1}}],
  customer_reminders: [{name:'reminder_owner',key:{customerId:1,updatedAt:-1}},{name:'reminder_worker',key:{state:1,nextCheckAt:1,leaseUntil:1}},{name:'reminder_expiry',key:{expiresAt:1},expireAfterSeconds:0},{name:'reminder_unsubscribe',key:{unsubscribeHash:1}}],
  customers: [{name:'customer_email_identity',key:{emailHash:1},unique:true}],
  customer_sessions:[{name:'customer_session_expiry',key:{expiresAt:1},expireAfterSeconds:0},{name:'customer_session_owner',key:{customerId:1}}],
  customer_auth_codes:[{name:'customer_code_expiry',key:{expiresAt:1},expireAfterSeconds:0}],
  customer_auth_limits:[{name:'customer_auth_limit_expiry',key:{expiresAt:1},expireAfterSeconds:0}],
  reward_vouchers:[{name:'reward_voucher_code',key:{code:1},unique:true},{name:'reward_voucher_owner',key:{customerId:1,state:1,expiresAt:1}}],
  reward_ledger:[{name:'reward_order_reversal',key:{orderId:1,reversed:1}}],
  growth_pages:[{name:'growth_public_pages',key:{locale:1,kind:1,published:1,updatedAt:-1}}],
  users: [{ name: 'staff_push_scope', key: { role: 1, disabled: 1, _id: 1 } }],
  conversations: [{ name: 'whatsapp_sender_lookup', key: { from: 1 } }],
  whatsappposters: [{ name: 'whatsapp_poster_filename', key: { image: 1 } }],
  catalog_import_changes:[{name:'catalog_import_change_report',key:{previewId:1,rolledBack:1,_id:1}}],
  categories: [{ name: 'retained_category_image', key: { image: 1 } }],
  banners: [{ name: 'retained_banner_image', key: { image: 1 } }],
  auth_rate_limits: [{ name: 'auth_quota_expiry', key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  geocoding_cache: [{ name: 'geocoding_cache_expiry', key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  geocoding_limits: [{ name: 'geocoding_quota_expiry', key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
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
