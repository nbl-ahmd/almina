export const productionApiOrigin = 'https://almina-5tse.onrender.com';

export function requireProductionVercelEnvironment(env) {
  const expected = {
    APP_ENV: 'production',
    CHECKOUT_ENABLED: 'true',
    WEB_ORIGIN: 'https://alminapharmacy.com',
    API_ORIGIN: productionApiOrigin,
    LEGACY_API_ORIGIN: productionApiOrigin,
  };
  const mismatches = Object.keys(expected).filter(key => env[key] !== expected[key]);
  if (mismatches.length) {
    throw new Error(`Frontend production configuration requires review: ${mismatches.join(', ')}`);
  }
}
