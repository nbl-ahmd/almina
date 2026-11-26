// The production API moved to a separate Render account on 26 November 2026; the previous service (almina-5tse) is suspended.
export const productionApiOrigin = 'https://almina-yhxk.onrender.com';

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
