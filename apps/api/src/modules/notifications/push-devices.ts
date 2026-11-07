import { createHash } from 'node:crypto';
import { pushSubscription, type PushSubscription } from './push.js';

/** Read old single-device records without a bulk credential migration. */
export function pushDevices(user: Record<string, unknown>): PushSubscription[] {
  const candidates = Array.isArray(user.pushSubscriptions) ? user.pushSubscriptions : [user.subscription];
  const devices = new Map<string, PushSubscription>();
  for (const candidate of candidates.slice(-5)) {
    try { const value = pushSubscription(candidate); devices.set(value.endpoint, value); } catch { /* A corrupt device must not suppress valid devices. */ }
  }
  return [...devices.values()];
}
export const subscriptionDigest = (subscription: PushSubscription) => createHash('sha256').update(JSON.stringify(subscription)).digest('hex');
export const pushReceiptId = (job: string, user: unknown, subscription: PushSubscription) => createHash('sha256').update(`${job}:${user}:${subscriptionDigest(subscription)}`).digest('hex');

/** Device removal and primary compatibility pointer change atomically. */
export function removePushDevice(endpoint:string) { return [
  {$set:{pushSubscriptions:{$filter:{input:{$cond:[{$isArray:'$pushSubscriptions'},'$pushSubscriptions',{$cond:[{$eq:[{$type:'$subscription'},'object']},['$subscription'],[]]}]},as:'device',cond:{$ne:['$$device.endpoint',{$literal:endpoint}]}}}}},
  {$set:{subscription:{$cond:[{$gt:[{$size:'$pushSubscriptions'},0]},{$arrayElemAt:['$pushSubscriptions',-1]},'$$REMOVE']}}},
]; }
