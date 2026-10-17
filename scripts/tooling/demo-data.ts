import { ObjectId, type Db, type Document } from 'mongodb';
import { hash } from 'bcryptjs';
import { migrateCommerce } from '../migrations/commerce.js';

export const demoDatabaseName = 'almina_local_demo';
export const demoPassword = 'local-demo-password'; // Public synthetic credentials; never deployed accounts.
export const demoProducts = [
  { id: 'dddddddddddddddddddd0001', sku: 'PD900001', name: 'Demo Daily Care Kit', category: 0, price: 25, salePrice: 20, stock: 12, vat: true, sale: true, featured: true },
  { id: 'dddddddddddddddddddd0002', sku: 'PD900002', name: 'Demo Gentle Hand Wash', category: 0, price: 15, stock: 8, vat: true, sale: false, featured: true },
  { id: 'dddddddddddddddddddd0003', sku: 'PD900003', name: 'Demo Travel Essentials', category: 1, price: 35, stock: 5, vat: false, sale: false, featured: false },
  { id: 'dddddddddddddddddddd0004', sku: 'PD900004', name: 'Demo Unavailable Item', category: 1, price: 10, stock: 0, vat: true, sale: false, featured: false },
];
export async function seedDemoDatabase(db: Db) {
  if (db.databaseName !== demoDatabaseName) throw new Error('Demo database name required');
  const hello = await db.command({ hello: 1 });
  if (hello.setName !== 'almina_demo' || !hello.hosts?.every((host: string) => /^127\.0\.0\.1:\d+$/.test(host))) {
    throw new Error('Dedicated loopback demo replica set required');
  }
  const markers = db.collection<Document & { _id: string }>('demo_setup');
  const prior = await markers.findOne({ _id: 'demo-v1' });
  if (prior?.version === 1) return { created: false };
  // Refuse existing unmarked data before applying any index/policy/seed write.
  for await (const collection of db.listCollections({}, { nameOnly: true })) {
    if (await db.collection(collection.name).findOne({}, { projection: { _id: 1 } })) throw new Error('Empty unmarked demo database required');
  }
  await migrateCommerce(db);
  const password = await hash(demoPassword, 12);
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      const categories = [new ObjectId('cccccccccccccccccccc0001'), new ObjectId('cccccccccccccccccccc0002')];
      await db.collection('categories').insertMany(categories.map((_id, index) => ({ _id, name: ['Demo Personal Care', 'Demo Travel'][index], disabled: false })), { session });
      await db.collection('products').insertMany(demoProducts.map(({ id, sku, category, ...product }) => ({
        ...product, _id: new ObjectId(id), product_id: sku, category: categories[category], barcode: sku,
        description: 'Synthetic demonstration product for local testing. No medical claims. Not a real pharmacy listing.',
        disabled: false, images: [], createdAt: new Date(),
      })), { session });
      await db.collection('users').insertMany([
        { username: 'demo-admin', name: 'Demo Administrator', role: 'admin', cities: ['Dubai', 'Ras al-Khaimah'], password },
        { username: 'demo-staff', name: 'Demo Dubai Staff', role: 'user', cities: ['Dubai'], password },
      ], { session });
      await db.collection('stores').insertOne({ status: 'open' }, { session });
      await markers.insertOne({ _id: 'demo-v1', version: 1, at: new Date() }, { session });
    });
    return { created: true };
  } finally { await session.endSession(); }
}
