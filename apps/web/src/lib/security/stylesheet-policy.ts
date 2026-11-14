// Next's development overlay and HMR inject style elements without a nonce.
// Both labels must indicate local development; compiled previews stay strict.
export function stylesheetPolicy(nonce: string, appEnvironment: string, nodeEnvironment: string | undefined, emailDesigner = false, staffAlerts = false): string {
  const dynamicStyles = (appEnvironment === 'development' && nodeEnvironment === 'development') || emailDesigner;
  // GrapesJS injects editor and canvas styles at runtime. Limit this exception to its admin route.
  // Sonner 2.0.8 attaches an empty style node before inserting its immutable stylesheet. Permit its exact bytes, never arbitrary inline styles.
  const alertStyles=staffAlerts?" 'sha256-StEaX+se6YS7pqjzrzMIA0KaX9zF/8zAhvQXZAe5epY=' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='":"";
  return `style-src 'self' ${dynamicStyles ? "'unsafe-inline'" : `'nonce-${nonce}'`}${alertStyles}`;
}
