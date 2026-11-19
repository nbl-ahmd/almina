export const productionApiOrigin = 'https://almina-5tse.onrender.com';

export function requireProductionVercelEnvironment(env: Readonly<Record<string, string | undefined>>) {
  const expected = {
    APP_ENV: 'production',
    CHECKOUT_ENABLED: 'true',
    WEB_ORIGIN: 'https://alminapharmacy.com',
    API_ORIGIN: productionApiOrigin,
    LEGACY_API_ORIGIN: productionApiOrigin,
  };
  const mismatches = Object.entries(expected).flatMap(([key, value]) => env[key] === value ? [] : [key]);
  if (mismatches.length) {
    throw new Error(`Frontend production configuration requires review: ${mismatches.join(', ')}`);
  }
}
