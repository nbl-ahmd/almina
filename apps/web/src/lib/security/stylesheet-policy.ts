// Next's development overlay and HMR inject style elements without a nonce.
// Both labels must indicate local development; compiled previews stay strict.
export function stylesheetPolicy(nonce: string, appEnvironment: string, nodeEnvironment: string | undefined, emailDesigner = false): string {
  const dynamicStyles = (appEnvironment === 'development' && nodeEnvironment === 'development') || emailDesigner;
  // GrapesJS injects editor and canvas styles at runtime. Limit this exception to its admin route.
  return `style-src 'self' ${dynamicStyles ? "'unsafe-inline'" : `'nonce-${nonce}'`}`;
}
