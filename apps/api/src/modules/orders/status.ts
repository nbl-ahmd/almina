import type { Document } from 'mongodb';
import { orderStatusSchema, type OrderStatus } from '@almina/contracts';
export function historicalStatus(doc: Document): OrderStatus | 'legacy_conflict' {
  if (doc.status !== undefined) return orderStatusSchema.safeParse(doc.status).success ? doc.status : 'legacy_conflict';
  if (doc.canceled === true && doc.dispatched === true) return 'legacy_conflict';
  return doc.canceled === true ? 'cancelled' : doc.dispatched === true ? 'dispatched' : 'pending';
}
