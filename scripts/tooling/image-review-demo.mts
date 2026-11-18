import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { MongoClient, ObjectId } from 'mongodb';
import { hash } from 'bcryptjs';
import { imageIdentitySchema } from '@almina/contracts';
import { stageImageReview, listImageReviews } from '../../apps/api/src/modules/media/image-review.js';
import { imagePublicationWorker } from '../../apps/api/src/modules/media/image-review-publication.js';
import { indexPlan } from '../../apps/api/src/database/indexes.js';
import { assertExclusiveLoopbackPorts } from './e2e-ownership.mjs';

// Disposable demonstration only; no dotenv, production database or provider keys.
const require = createRequire(import.meta.url), root = new URL('../../', import.meta.url);
const origin = 'http://127.0.0.1:4790';
await assertExclusiveLoopbackPorts([4790, 4791]);
const replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, name: 'almina_test', ip: '127.0.0.1' } });
const uri = replica.getUri(); if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/.test(uri)) throw new Error('Non-loopback demo refused');
const client = await new MongoClient(uri).connect(), db = client.db('almina_image_review_demo_' + randomUUID().replaceAll('-', ''));
const adminId = new ObjectId(), staffId = new ObjectId(), password = await hash('synthetic-test-password', 4);
await db.collection('users').insertMany([{ _id: adminId, username: 'review-admin', name: 'Review administrator', role: 'admin', cities: [], password }, { _id: staffId, username: 'review-pharmacist', name: 'Review pharmacist', role: 'user', cities: [], password }]);
await db.collection('products').insertMany([
  { _id: new ObjectId(), product_id: 'PD0081', name: 'ACM Novophane Energizing Shampoo 200 ml', brand: 'ACM', productForm: 'Shampoo', packLabel: '200 ml', price: 0, stock: 0, published: false, disabled: true, cloudinaryImages: [] },
  { _id: new ObjectId(), product_id: 'PD1198', name: 'CeraVe Moisturising Cream 454 g', brand: 'CeraVe', productForm: 'Cream', packLabel: '454 g', price: 0, stock: 0, published: false, disabled: true, cloudinaryImages: [] },
]);
for (const name of ['image_review_items', 'image_review_events', 'image_review_publications', 'image_review_publication_groups', 'image_review_publication_entries']) await db.collection(name).createIndexes([...indexPlan[name]!]);
const image = 'https://res.cloudinary.com/drvxmb0vq/image/upload/v1747762321/products/71022b55-ab03-49a7-a482-39441d05e910.webp';
await stageImageReview(db, { schemaVersion: 'image-review-package-v1', sourceRun: 'disposable-demo', catalogueChecksum: 'a'.repeat(64), withdrawals: [], items: [{
  assetId: '1b896070e3e04f5ca38fd68c461efb84', sourceSha256: '0bf427ff7dc8c9854a936ec8997d665fb0cd0a31065adeea4c8546ab577563e5', publicId: 'products/71022b55-ab03-49a7-a482-39441d05e910', imageUrl: image,
  identity: imageIdentitySchema.parse({ name: 'ACM Novophane Energizing Shampoo', brand: 'ACM', line: 'Novophane', form: 'Shampoo', size: '200 ml' }),
  labelText: ['ACM', 'NOVOPHANE', 'ENERGIZING SHAMPOO', '200mL'], flags: [], candidateProductIds: ['PD0081'], priorDecision: 'held',
  sourceNote: 'Demonstration of a saved extraction. Product records belong to this disposable database; imports affect only this demo.', extractionReference: 'demo-local-extraction',
}] }, String(adminId), 'drvxmb0vq');
// Optional queue for local UX checks; repeated reference photos are clearly demo-only.
if (process.argv.includes('--review-speed')) {
  await db.collection('stores').insertOne({ name: 'Disposable demo store' });
  await db.collection('categories').insertOne({ name: 'Personal care', disabled: false });
  await db.collection('products').insertOne({ product_id: 'PD_DEMO_400', name: 'ACM Novophane Energizing Shampoo 400 ml', brand: 'ACM', productForm: 'Shampoo', packLabel: '400 ml', price: 0, stock: 0, published: false, disabled: true });
  const reference = (await listImageReviews(db, {}, String(adminId))).items[0]!.source;
  await stageImageReview(db, { schemaVersion: 'image-review-package-v1', sourceRun: 'disposable-speed-demo', catalogueChecksum: 'a'.repeat(64), withdrawals: [], items: Array.from({ length: 4 }, (_, index) => ({ ...reference, assetId: `speed-demo-${index}`, flags: index === 3 ? ['blurry'] : [], candidateProductIds: index === 3 ? [] : index === 2 ? ['PD_DEMO_400', 'PD0081'] : ['PD0081'], sourceNote: 'Disposable speed-review fixture. This queue entry reuses the sample original to test navigation; it is not a new recovered image.' })) }, String(adminId), 'drvxmb0vq');
}
const { createLegacyApp } = require('../../backend/app.js');
const api = createLegacyApp({ development: true, origins: [origin], imageReviewEnabled: true, recoveryCloudName: 'drvxmb0vq', getCommerceDb: async () => db });
const server = createServer(api) as Server; server.listen(4791, '127.0.0.1');
let stopping = false;
const publicationWorker = imagePublicationWorker(() => db, { cloudName: 'drvxmb0vq', enabled: () => !stopping });
async function stop() {
  if (stopping) return; stopping = true;
  await publicationWorker.stop();
  if (web && web.exitCode === null) { const done = new Promise<void>(resolve => web!.once('exit', () => resolve())); web.kill('SIGTERM'); await done; }
  server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  await db.dropDatabase(); await client.close(); await replica.stop();
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void stop().then(() => process.exit(0)); });
const clean = Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR }).filter(([, value]) => value !== undefined));
const web = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', '4790'], { cwd: fileURLToPath(new URL('apps/web/', root)),
  env: { ...clean, NODE_ENV: 'development', APP_ENV: 'development', WEB_ORIGIN: origin, API_ORIGIN: 'http://127.0.0.1:4791', LEGACY_API_ORIGIN: 'http://127.0.0.1:4791', CLOUDINARY_CLOUD_NAME: 'drvxmb0vq', AL_MINA_ISOLATED_BUILD: '1', AL_MINA_VERIFICATION_TAG: 'image-review', NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'inherit' });
web.once('exit', () => { if (!stopping) void stop(); });
console.log('Disposable image-review demo: http://127.0.0.1:4790/admin/image-review');
console.log('Synthetic logins: review-admin or review-pharmacist / synthetic-test-password. Demo data disappears on shutdown.');
