import { randomUUID } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import type { EnvironmentSource } from '@almina/config/env';
import { readSearchEnvironment, type SearchEnvironment } from './config.js';
import { geminiEmbeddings, type EmbeddingProvider } from './embedding-provider.js';
import { semanticHash, semanticText } from './enrichment.js';
import { queryHashInput } from './query-normalizer.js';

export const semanticSeedQueries = ['cream for dry skin', 'sugar checking machine', 'something gentle for dry sensitive skin', 'baby sun protection', 'daily oral care', 'machine to check sugar at home', 'العناية بالبشرة الجافة'];
const day = 86400000;

/** Offline, leased work. Shopper HTTP handlers never invoke the embedding provider. */
export async function processSearchEmbeddings(db: Db, env: SearchEnvironment, provider: EmbeddingProvider) {
  const jobs = db.collection<Document & { _id: string }>('search_jobs'), now = new Date(), owner = randomUUID();
  try { await jobs.updateOne({ _id: 'embeddings-v1' }, { $setOnInsert: { leaseUntil: new Date(0), cursor: null } }, { upsert: true, maxTimeMS: 3000 }); }
  catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  const job = await jobs.findOneAndUpdate({ _id: 'embeddings-v1', leaseUntil: { $lte: now } }, { $set: { owner, leaseUntil: new Date(now.getTime() + 600000) } }, { returnDocument: 'after', maxTimeMS: 3000 });
  if (!job) return { leased: false, products: 0, queries: 0 };
  let cursor = job.cursor as string | null, products = 0, queries = 0, failed = false;
  try {
    const queue = db.collection<Document & { _id: string }>('search_query_queue');
    for (const query of semanticSeedQueries) {
      const locale = /[\u0600-\u06ff]/.test(query) ? 'ar' : 'en', hash = semanticHash(queryHashInput(query, locale));
      await queue.updateOne({ _id: hash }, { $setOnInsert: { queryHash: hash, query, locale, state: 'pending', expiresAt: new Date(now.getTime() + 7 * day) } }, { upsert: true, maxTimeMS: 3000 });
      // Refresh only public curated seeds. Never extend retention of shopper phrases.
      await queue.updateOne({ _id: hash, expiresAt: { $lte: new Date(now.getTime() + day) } }, { $set: { state: 'pending', expiresAt: new Date(now.getTime() + 7 * day) } }, { maxTimeMS: 3000 });
    }
    const pending = await queue.find({ state: 'pending', expiresAt: { $gt: now } }, { maxTimeMS: 3000 }).sort({ _id: 1 }).limit(3).toArray();
    for (const row of pending) {
      const cached = await db.collection('search_query_vectors').findOne({ queryHash: row.queryHash, model: env.EMBEDDING_MODEL, version: 1, expiresAt: { $gt: new Date(now.getTime() + day) } }, { projection: { _id: 1 }, maxTimeMS: 3000 });
      if (!cached) {
        const vector = await provider.embed(String(row.query), 'query');
        await db.collection<Document & { _id: string }>('search_query_vectors').updateOne({ _id: row._id }, { $set: { queryHash: row.queryHash, vector, model: env.EMBEDDING_MODEL, version: 1, updatedAt: new Date(), expiresAt: row.expiresAt } }, { upsert: true, maxTimeMS: 3000 });
        queries++;
      }
      await queue.updateOne({ _id: row._id, state: 'pending', expiresAt: row.expiresAt }, { $set: { state: 'complete' } }, { maxTimeMS: 3000 });
    }
    const rows = await db.collection('products').aggregate<Document>([
      { $match: { archivedAt: { $exists: false }, ...(cursor ? { _id: { $gt: new ObjectId(cursor) } } : {}) } },
      { $sort: { _id: 1 } }, { $limit: 100 },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'searchCategory', pipeline: [{ $project: { name: 1 } }] } },
    ], { maxTimeMS: 3000 }).toArray();
    for (const row of rows) {
      if (row.productType === 'general' && row.contentReviewed === true) {
        const text = semanticText(row, String(row.searchCategory?.[0]?.name ?? '')), hash = semanticHash(text), prior = row.searchEmbedding;
        if (prior?.model !== env.EMBEDDING_MODEL || prior?.version !== 1 || prior?.semanticTextHash !== hash || prior?.vector?.length !== env.SEARCH_EMBEDDING_DIMENSIONS) {
          const vector = await provider.embed(text, 'document');
          await db.collection('products').updateOne({ _id: row._id, updatedAt: row.updatedAt ?? { $exists: false }, searchMetadataRevision: row.searchMetadataRevision ?? { $exists: false }, productType: 'general', contentReviewed: true }, { $set: { searchEmbedding: { vector, model: env.EMBEDDING_MODEL, version: 1, semanticTextHash: hash, updatedAt: new Date() } } }, { maxTimeMS: 3000 });
          products++;
        }
      }
      cursor = String(row._id);
      if (products >= 3) break;
    }
    if (!rows.length || rows.length < 100 && cursor === String(rows.at(-1)?._id)) cursor = null;
    return { leased: true, products, queries };
  } catch {
    failed = true;
    throw new Error('Background search embedding batch failed');
  } finally {
    await jobs.updateOne({ _id: 'embeddings-v1', owner }, { $set: { cursor, updatedAt: new Date(), leaseUntil: new Date(Date.now() + (failed ? 300000 : 60000)), state: failed ? 'retry' : 'ready' }, $unset: { owner: '' } }, { maxTimeMS: 3000 });
  }
}

export function searchEmbeddingWorker(getDb: () => Promise<Db>, source: EnvironmentSource = process.env) {
  const env = readSearchEnvironment(source);
  if (!env.SEARCH_EMBEDDING_WORKER_ENABLED) return undefined;
  if (env.SEARCH_PROVIDER !== 'atlas' || !env.SEARCH_SEMANTIC_ENABLED || !source.SEARCH_EMBEDDING_API_KEY) throw new Error('Background search embedding configuration incomplete');
  const provider = geminiEmbeddings(env, source.SEARCH_EMBEDDING_API_KEY);
  let active: Promise<void> | undefined, stopped = false;
  const tick = () => {
    if (stopped || active) return;
    active = getDb().then(db => processSearchEmbeddings(db, env, provider)).then(() => undefined)
      .catch(() => { console.error('{"event":"search_embedding_batch_failed"}'); })
      .finally(() => { active = undefined; });
  };
  const timer = setInterval(tick, 60000); timer.unref(); tick();
  return { async stop() { stopped = true; clearInterval(timer); await active; } };
}
