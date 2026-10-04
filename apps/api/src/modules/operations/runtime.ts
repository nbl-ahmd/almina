import { isIP } from 'node:net';
import { z } from 'zod';
const source = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_ALLOWED_ORIGINS: z.string().min(1).max(4096),
  AUTH_TRUST_PROXY: z.string().max(4096).default(''),
  MONGODB_URI: z.string().min(1).max(16384).regex(/^mongodb(?:\+srv)?:\/\/[^\s]+$/),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
});
function invalid(): never { throw new Error('Retained runtime configuration invalid'); }
// Explicit source only: importing this module never loads a file, starts a server or connects MongoDB.
export function retainedRuntimeConfiguration(raw: Readonly<Record<string, string | undefined>>) {
  const parsed = source.safeParse(raw);
  if (!parsed.success) return invalid();
  const value = parsed.data;
  const development = value.APP_ENV === 'development';
  if (!development && value.NODE_ENV !== 'production') return invalid();
  const origins = value.AUTH_ALLOWED_ORIGINS.split(',').filter(Boolean);
  const trustProxy = value.AUTH_TRUST_PROXY.split(',').filter(Boolean);
  if (!origins.length || origins.length > 10 || new Set(origins).size !== origins.length || origins.some(origin => {
    try {
      const url = new URL(origin);
      return url.origin !== origin || (url.protocol !== 'https:' && !(development && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)));
    } catch { return true; }
  })) return invalid();
  if (trustProxy.length > 10 || new Set(trustProxy).size !== trustProxy.length || trustProxy.some(ip => !isIP(ip))) return invalid();
  return { development, origins, trustProxy, port: value.PORT, mongoUri: value.MONGODB_URI,
    mongoOptions: { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, maxPoolSize: 20, autoIndex: false, autoCreate: false } };
}
export function loadRetainedEnvironment(path: string, load: (path: string) => void = process.loadEnvFile): boolean {
  try { load(path); return true; }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return false;
    return invalid(); // Native file/parser diagnostics may contain sensitive paths or values.
  }
}
