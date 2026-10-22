import type { Db } from 'mongodb';
import { indexPlan } from '../../database/indexes.js';
/** Additive, repeatable preparation before enabling email. Never drops or rewrites existing documents. */
export async function prepareEmailStorage(db: Db) {
  for (const name of ['customer_auth_codes', 'customer_auth_limits', 'customer_reminders', 'email_events', 'email_delivery']) {
    await db.collection(name).createIndexes([...indexPlan[name]!], { maxTimeMS: 60000 });
  }
}
