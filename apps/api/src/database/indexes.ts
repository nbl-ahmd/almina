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
    { name: 'v1_order_city_page', key: { 'customer.city': 1, _id: -1 } },
    { name: 'v1_order_state_page', key: { dispatched: 1, canceled: 1, _id: -1 } },
    { name: 'v1_order_city_state_page', key: { 'customer.city': 1, dispatched: 1, canceled: 1, _id: -1 } },
  ],
  api_sessions: [
    { name: 'v1_session_token', key: { tokenHash: 1 }, unique: true },
    { name: 'v1_session_expiry', key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ],
};
export async function applyIndexes(db: Db) {
  for (const [collection, indexes] of Object.entries(indexPlan)) {
    await db.collection(collection).createIndexes([...indexes], { maxTimeMS: 60000 });
  }
}
