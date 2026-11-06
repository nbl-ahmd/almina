// JSON/XML endpoints do not render Next scripts and need no per-request nonce.
export function isDataRequest(path: string) {
  return path === '/api' || path.startsWith('/api/') || path === '/robots.txt'
    || path === '/sitemap.xml' || /^\/sitemaps\/(static|products|categories)\/(first|[A-Za-z0-9_-]{1,512})\.xml$/.test(path);
}
export const dataContentSecurityPolicy = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
export const publicSitemapCache = 'public, max-age=0, s-maxage=300';
