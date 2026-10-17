import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Document } from 'mongodb';
import { type deliveryEmirates, reverseLocationInputSchema, reverseLocationDtoSchema, type ReverseLocation } from '@almina/contracts';
import type { GetDb } from '../../database.js';
import { HttpError } from '../../errors.js';

const queryOptions = { maxTimeMS: 2000, timeoutMS: 3000 };
const upstreamSchema = z.object({ display_name: z.string().trim().min(1).max(1000),
  address: z.record(z.string(), z.string().max(1000)),
});
const aliases: Record<string, typeof deliveryEmirates[number]> = {
  rasalkhaimah: 'Ras al-Khaimah', abudhabi: 'Abu Dhabi', dubai: 'Dubai', sharjah: 'Sharjah',
  ajman: 'Ajman', ummalquwain: 'Umm al-Quwain', ummalqaiwain: 'Umm al-Quwain', fujairah: 'Fujairah', alfujairah: 'Fujairah',
};
const iso: Record<string, typeof deliveryEmirates[number]> = {
  'AE-RK': 'Ras al-Khaimah', 'AE-AZ': 'Abu Dhabi', 'AE-DU': 'Dubai', 'AE-SH': 'Sharjah',
  'AE-AJ': 'Ajman', 'AE-UQ': 'Umm al-Quwain', 'AE-FU': 'Fujairah',
};
export function normalizeLocation(raw: unknown): Omit<ReverseLocation, 'maplink'> {
  const parsed = upstreamSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(502, 'LOCATION_NOT_FOUND');
  const fields = parsed.data.address;
  if (fields.country_code?.toLowerCase() !== 'ae') throw new HttpError(422, 'LOCATION_OUTSIDE_UAE');
  let emirate: typeof deliveryEmirates[number] | undefined;
  for (const field of ['ISO3166-2-lvl4', 'ISO3166-2-lvl3', 'ISO3166-2-lvl6']) emirate ??= iso[fields[field] ?? ''];
  for (const field of ['state', 'province', 'region', 'city']) {
    const value = (fields[field] ?? '').toLowerCase().replace(/emirate/g, '').replace(/[^a-z]/g, '');
    emirate ??= aliases[value];
  }
  const city = ['suburb', 'quarter', 'neighbourhood', 'industrial', 'city', 'town', 'village', 'municipality']
    .map(field => fields[field]?.trim()).find(value => value && value.length <= 200);
  if (!emirate || !city) throw new HttpError(502, 'LOCATION_NOT_FOUND');
  return { address: parsed.data.display_name, emirate, city };
}
export interface LocationOptions { endpoint: string; userAgent: string; dailyLimit: number; enabled: boolean; fetch?: typeof fetch; now?: () => number }
export function readLocationOptions(source: Readonly<Record<string, string | undefined>>): LocationOptions {
  const endpoint = source.GEOCODING_REVERSE_URL ?? 'https://nominatim.openstreetmap.org/reverse';
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Invalid GEOCODING_REVERSE_URL');
  const dailyLimit = Number(source.GEOCODING_DAILY_LIMIT ?? 500);
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 10000) throw new Error('Invalid GEOCODING_DAILY_LIMIT');
  const userAgent = source.GEOCODING_USER_AGENT ?? 'AlMinaPharmacy/1.0 (+https://alminapharmacy.com/contact)';
  if (!userAgent.trim() || userAgent.length > 300 || /[\r\n]/.test(userAgent)) throw new Error('Invalid GEOCODING_USER_AGENT');
  if (source.GEOCODING_ENABLED && !['true', 'false'].includes(source.GEOCODING_ENABLED)) throw new Error('Invalid GEOCODING_ENABLED');
  return { endpoint, userAgent, dailyLimit, enabled: source.GEOCODING_ENABLED !== 'false' };
}
export function createReverseLocationService(getDb: GetDb, supplied?: LocationOptions) {
  return { async lookup(raw: unknown): Promise<ReverseLocation> {
    const parsed = reverseLocationInputSchema.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
    let options: LocationOptions;
    try { options = supplied ?? readLocationOptions(process.env); } catch { throw new HttpError(503, 'SERVICE_UNAVAILABLE'); }
    if (!options.enabled) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    const { latitude, longitude } = parsed.data;
    const map = new URL('https://www.google.com/maps/search/');
    map.searchParams.set('api', '1'); map.searchParams.set('query', `${latitude},${longitude}`);
    const db = await getDb(), now = options.now ?? Date.now, time = now();
    // Approx. metre precision. Never log coordinates or store the original GPS fix.
    const cacheKey = createHash('sha256').update(`${options.endpoint}:${latitude.toFixed(5)},${longitude.toFixed(5)}:en`).digest('hex');
    const cache = db.collection<Document & { _id: string }>('geocoding_cache');
    const hit = await cache.findOne({ _id: cacheKey, expiresAt: { $gt: new Date(time) } }, queryOptions);
    if (hit) {
      const result = reverseLocationDtoSchema.safeParse({ ...hit.address, maplink: map.href });
      if (result.success) return result.data;
    }
    const limits = db.collection<Document & { _id: string }>('geocoding_limits');
    // One global lease across all API instances, not a process-local limiter.
    await limits.updateOne({ _id: 'provider' }, { $setOnInsert: { leaseUntil: new Date(0), nextAllowedAt: new Date(0) } }, { ...queryOptions, upsert: true });
    const owner = randomUUID();
    // MongoDB's clock avoids host-clock skew when Render scales to multiple instances.
    const instant = options.now ? new Date(time) : '$$NOW';
    const lease = await limits.findOneAndUpdate({ _id: 'provider', $expr: { $and: [
      { $lte: ['$leaseUntil', instant] }, { $lte: ['$nextAllowedAt', instant] },
    ] } }, [{ $set: { owner, leaseUntil: { $add: [instant, 15000] }, nextAllowedAt: { $add: [instant, 1100] } } }], { ...queryOptions, returnDocument: 'after' });
    if (!lease) throw new HttpError(429, 'RATE_LIMITED');
    let cooldown = 1100;
    try {
      const day = Math.floor(time / 86400000);
      const usage = await limits.findOneAndUpdate({ _id: `day:${day}` },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((day + 2) * 86400000) } }, { ...queryOptions, upsert: true, returnDocument: 'after' });
      if (!usage || usage.count > options.dailyLimit) throw new HttpError(429, 'RATE_LIMITED');
      const url = new URL(options.endpoint);
      url.searchParams.set('format', 'jsonv2'); url.searchParams.set('addressdetails', '1');
      url.searchParams.set('lat', latitude.toFixed(5)); url.searchParams.set('lon', longitude.toFixed(5));
      url.searchParams.set('accept-language', 'en');
      let address: Omit<ReverseLocation, 'maplink'>;
      try {
        const response = await (options.fetch ?? fetch)(url, { headers: { Accept: 'application/json', 'User-Agent': options.userAgent },
          signal: AbortSignal.timeout(5000), redirect: 'error', cache: 'no-store' });
        if (!response.ok) {
          cooldown = response.status === 429 ? 60000 : 10000;
          throw new HttpError(response.status === 429 ? 429 : 503, response.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE');
        }
        const reader = response.body?.getReader(); if (!reader) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
        const chunks: Uint8Array[] = []; let size = 0;
        for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length;
          if (size > 65536) { await reader.cancel(); throw new HttpError(503, 'SERVICE_UNAVAILABLE'); } chunks.push(part.value); }
        address = normalizeLocation(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) { if (error instanceof HttpError) throw error; cooldown = 10000; throw new HttpError(503, 'SERVICE_UNAVAILABLE'); }
      const result = reverseLocationDtoSchema.parse({ ...address, maplink: map.href });
      await cache.updateOne({ _id: cacheKey }, { $set: { address, expiresAt: new Date(now() + 86400000) } }, { ...queryOptions, upsert: true });
      return result;
    } finally {
      const finishedAt = options.now ? new Date(now()) : '$$NOW';
      await limits.updateOne({ _id: 'provider', owner }, [{ $set: { leaseUntil: new Date(0), nextAllowedAt: { $add: [finishedAt, cooldown] } } }, { $unset: 'owner' }], queryOptions);
    }
  } };
}
