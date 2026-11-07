import { createHash } from 'node:crypto';
import { ObjectId,type Db } from 'mongodb';
import { pushDevices } from './push-devices.js';
import { z } from 'zod';

// The public application-server key is deliberately shareable. Never return its
// private counterpart, provider details, or environment contents.
export function staffNotificationSettings(env: Record<string, string | undefined>) {
  const enabled=env.ADMIN_PUSH_ENABLED==='true' && Boolean(env.ADMIN_PUSH_PRIVATE_KEY && env.ADMIN_PUSH_SUBJECT);
  const publicKey=enabled && z.string().regex(/^[A-Za-z0-9_-]{87}$/).safeParse(env.ADMIN_PUSH_PUBLIC_KEY).success ? env.ADMIN_PUSH_PUBLIC_KEY! : null;
  return { enabled:Boolean(publicKey), publicKey };
}

export async function staffDeviceFingerprints(db:Db,actor:string) {
  const user=await db.collection('users').findOne({_id:new ObjectId(actor),disabled:{$ne:true},role:{$in:['admin','user']}},{maxTimeMS:3000,projection:{subscription:1,pushSubscriptions:1}});
  return user?pushDevices(user).map(device=>createHash('sha256').update(device.endpoint).digest('hex')):[];
}
