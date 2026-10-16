// Next's development overlay and HMR inject style elements without a nonce.
// Both labels must indicate local development; compiled previews stay strict.
export function stylesheetPolicy(nonce: string, appEnvironment: string, nodeEnvironment: string | undefined): string {
  const development = appEnvironment === 'development' && nodeEnvironment === 'development';
  return `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`;
}
