import { z } from 'zod';
import { isIP } from 'node:net';

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;
export type AppEnvironment = 'development' | 'staging' | 'production';

export class ConfigurationError extends Error {
  constructor(readonly fields: readonly string[]) {
    super(`Invalid configuration: ${fields.join(', ')}`);
    this.name = 'ConfigurationError';
  }
}

const originSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    && url.pathname === '/' && !url.search && !url.hash;
}).transform(value => new URL(value).origin);

const commonSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WEB_ORIGIN: originSchema,
  LOG_LEVEL: z.enum(['info', 'warn', 'error']).default('info'),
});

function parse<T>(schema: z.ZodType<T>, source: unknown): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    // Zod messages can include submitted values. Only field names may leave this boundary.
    throw new ConfigurationError([...new Set(result.error.issues.map((issue) => issue.path.join('.')))]);
  }
  return result.data;
}

function common(source: EnvironmentSource) {
  if (Object.keys(source).some((key) => key.startsWith('NEXT_PUBLIC_'))) {
    throw new ConfigurationError(['NEXT_PUBLIC_* (no public variables are defined)']);
  }
  const appEnv = source.APP_ENV ?? (source.NODE_ENV === 'production' ? undefined : 'development');
  const value = parse(commonSchema, {
    APP_ENV: appEnv,
    NODE_ENV: source.NODE_ENV,
    WEB_ORIGIN: source.WEB_ORIGIN ?? (appEnv === 'development' ? 'http://localhost:3000' : undefined),
    LOG_LEVEL: source.LOG_LEVEL,
  });
  if (value.APP_ENV !== 'development') {
    if (value.NODE_ENV !== 'production') throw new ConfigurationError(['NODE_ENV']);
    if (new URL(value.WEB_ORIGIN).protocol !== 'https:') throw new ConfigurationError(['WEB_ORIGIN']);
  }
  return value;
}

export function readWebEnvironment(source: EnvironmentSource) {
  const shared = common(source);
  const value = parse(z.object({
    API_ORIGIN: originSchema,
    GOOGLE_SITE_VERIFICATION: z.string().regex(/^[A-Za-z0-9_-]{8,200}$/).optional(),
    CLOUDINARY_CLOUD_NAME: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).optional(),
    CATALOG_FEEDS_ENABLED: z.enum(['true','false']).default('false').transform(value=>value==='true'),
    CHECKOUT_ENABLED: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
    COMMERCE_TELEMETRY_ENABLED: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
    LEGACY_MEDIA_FALLBACK_ENABLED: z.enum(['true','false']).default('true').transform(value=>value==='true'),
    LEGACY_API_ORIGIN: originSchema,
    STOREFRONT_REDIRECTS_VERIFIED: z.enum(['true', 'false']).default('true').transform(value => value === 'true'),
    STOREFRONT_PRODUCT_REPLACEMENTS: z.string().default('{}').transform((value, ctx) => {
      const schema = z.record(z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), z.string().regex(/^[A-Za-z0-9_-]{1,80}$/))
        .refine(map => Object.keys(map).length <= 1000 && Object.entries(map).every(([from, to]) => from !== to && !(to in map)));
      try {
        const result = schema.safeParse(JSON.parse(value));
        if (result.success) return result.data;
      } catch { /* Report configuration field only. */ }
      ctx.addIssue({ code: 'custom', message: 'Invalid replacement mapping' });
      return z.NEVER;
    }),
  }), {
    API_ORIGIN: source.API_ORIGIN ?? (shared.APP_ENV === 'development' ? 'http://127.0.0.1:4000' : undefined),
    GOOGLE_SITE_VERIFICATION: source.GOOGLE_SITE_VERIFICATION,
    CATALOG_FEEDS_ENABLED: source.CATALOG_FEEDS_ENABLED,
    CHECKOUT_ENABLED: source.CHECKOUT_ENABLED,
    COMMERCE_TELEMETRY_ENABLED: source.COMMERCE_TELEMETRY_ENABLED,
    CLOUDINARY_CLOUD_NAME: source.CLOUDINARY_CLOUD_NAME,
    LEGACY_MEDIA_FALLBACK_ENABLED: source.LEGACY_MEDIA_FALLBACK_ENABLED,
    STOREFRONT_REDIRECTS_VERIFIED: source.STOREFRONT_REDIRECTS_VERIFIED,
    STOREFRONT_PRODUCT_REPLACEMENTS: source.STOREFRONT_PRODUCT_REPLACEMENTS,
    LEGACY_API_ORIGIN: source.LEGACY_API_ORIGIN ?? source.API_ORIGIN ?? (shared.APP_ENV === 'development' ? 'http://127.0.0.1:4000' : undefined),
  });
  if (shared.APP_ENV !== 'development') {
    const invalid = (['API_ORIGIN', 'LEGACY_API_ORIGIN'] as const).filter(field => new URL(value[field]).protocol !== 'https:');
    if (invalid.length) throw new ConfigurationError(invalid);
  }
  return { ...shared, ...value };
}

export function readApiEnvironment(source: EnvironmentSource) {
  const shared = common(source);
  const value = parse(z.object({
    API_HOST: z.enum(['127.0.0.1', '0.0.0.0']).default(shared.APP_ENV === 'development' ? '127.0.0.1' : '0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_MODE: z.enum(['disabled', 'enabled']).default('disabled'),
    COMMERCE_TELEMETRY_ENABLED: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
    API_TRUST_PROXY: z.string().default('').transform(value => value ? value.split(',').map(item => item.trim()) : [])
      .refine(values => values.length <= 10 && values.every(value => isIP(value) !== 0)),
  }), source);
  if (value.DATABASE_MODE === 'disabled') {
    // Fail closed if a secret was supplied but the connection mode was forgotten.
    if (source.MONGODB_URI || source.MONGODB_DATABASE || source.DATABASE_ENV) {
      throw new ConfigurationError(['DATABASE_MODE']);
    }
    return { ...shared, ...value, database: { mode: 'disabled' as const } };
  }
  const database = parse(z.object({
    MONGODB_URI: z.string().refine((uri) => /^mongodb(\+srv)?:\/\//.test(uri)),
    MONGODB_DATABASE: z.string().min(1).max(63).regex(/^[A-Za-z0-9_-]+$/),
    DATABASE_ENV: z.enum(['development', 'staging', 'production']),
  }), source);
  if (database.DATABASE_ENV !== shared.APP_ENV) throw new ConfigurationError(['DATABASE_ENV']);
  if (shared.APP_ENV !== 'development' && !database.MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new ConfigurationError(['MONGODB_URI']);
  }
  return {
    ...shared, ...value,
    database: { mode: 'enabled' as const, uri: database.MONGODB_URI, name: database.MONGODB_DATABASE },
  };
}

export type WebEnvironment = ReturnType<typeof readWebEnvironment>;
export type ApiEnvironment = ReturnType<typeof readApiEnvironment>;
