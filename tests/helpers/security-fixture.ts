import { ObjectId, type Document, type Db } from 'mongodb';
export const id = new ObjectId('0123456789abcdef01234567');
export function securityDb(initial: Record<string, Document[]> = {}) {
  const data = { ...initial };
  const calls: { collection: string; operation: string; value: Document }[] = [];
  function matches(doc: Document, filter: Document): boolean {
    return Object.entries(filter).every(([key, value]) => {
      const actual = key.split('.').reduce<unknown>((result, field) => (result as Document | undefined)?.[field], doc);
      if (value instanceof ObjectId) return actual instanceof ObjectId && value.equals(actual);
      if (value && typeof value === 'object') {
        if ('$gt' in value) return actual instanceof Date && actual > value.$gt;
        if ('$ne' in value) return actual !== value.$ne;
        if ('$in' in value) return value.$in.includes(actual);
      }
      return actual === value;
    });
  }
  const db = { collection(collection: string) {
    const docs = data[collection] ??= [];
    return {
      async findOne(filter: Document) { calls.push({ collection, operation: 'findOne', value: filter }); return docs.find(doc => matches(doc, filter)) ?? null; },
      async insertOne(value: Document) {
        calls.push({ collection, operation: 'insertOne', value });
        if ((value._id && docs.some(doc => doc._id === value._id)) || (collection === 'users' && docs.some(doc => doc.username === value.username))) throw Object.assign(new Error(), { code: 11000 });
        docs.push(value); return { insertedId: value._id };
      },
      async findOneAndUpdate(filter: Document, update: Document) {
        let doc = docs.find(doc => matches(doc, filter));
        if (!doc) { doc = { ...filter, ...update.$setOnInsert, count: 0 }; docs.push(doc!); }
        doc!.count += update.$inc.count;
        return doc;
      },
      async deleteOne(filter: Document) { const i = docs.findIndex(doc => matches(doc, filter)); if (i >= 0) docs.splice(i, 1); },
      async deleteMany(filter: Document) { for (let i = docs.length - 1; i >= 0; i--) if (matches(docs[i]!, filter)) docs.splice(i, 1); },
    };
  } } as unknown as Db;
  return { db, data, calls };
}
