// Complete legacy HTTP allowlist. Unlisted paths/methods never reach a handler.
export type RetainedAccess = 'admin' | 'staff' | 'public' | 'orders' | 'login' | 'webhook' | 'verification';
export const routePolicies = [
  ['GET', '/api/operations', 'admin'],
  ['GET','/api/catalog-export/state','public'],['GET','/api/catalog-export/products','public'],
  ['GET','/api/catalog-import/template','admin'],
  ...['preview','commit','report','rollback'].map(action=>['POST',`/api/catalog-import/${action}`,'admin'] as [string,string,RetainedAccess]),
  ['POST', '/api/media/products/:id', 'admin'],
  ['GET', '/api/recovery/template', 'admin'], ['POST', '/api/recovery/preview', 'admin'], ['POST', '/api/recovery/commit', 'admin'],
  ['POST', '/api/auth/login', 'login'], ['POST', '/api/auth/logout', 'staff'],
  ['POST', '/api/auth/logout-all', 'staff'], ['GET', '/api/auth/me', 'staff'],
  ['POST', '/api/auth/signup', 'admin'], ['GET', '/api/auth/users', 'admin'], ['DELETE', '/api/auth/users/:id', 'admin'],
  ['POST', '/api/products', 'admin'], ['GET', '/api/products', 'public'], ['GET', '/api/products/search', 'public'],
  ['GET', '/api/products/images/:filename', 'public'], ['GET', '/api/products/category/:categoryId', 'public'],
  ['GET', '/api/products/details/:productId', 'public'], ['GET', '/api/products/:id', 'public'],
  ['DELETE', '/api/products/:id', 'admin'], ['PUT', '/api/products/publish/:productId', 'admin'], ['PUT', '/api/products/:id', 'admin'],
  ['POST', '/api/category', 'admin'], ['GET', '/api/category', 'public'],
  ['GET', '/api/category/images/:filename', 'public'], ['GET', '/api/category/:id', 'public'],
  ['PUT', '/api/category/disable/:id', 'admin'], ['PUT', '/api/category/:id', 'admin'], ['DELETE', '/api/category/:id', 'admin'],
  ['POST', '/api/banners', 'admin'], ['GET', '/api/banners', 'public'],
  ['GET', '/api/banners/images/:filename', 'public'], ['DELETE', '/api/banners/:id', 'admin'],
  ['POST', '/api/batch', 'admin'], ['PUT', '/api/store/status', 'admin'], ['GET', '/api/store/status', 'public'],
  ['POST', '/api/store/cart/add', 'public'],
  ['POST', '/api/orders', 'public'], ['POST', '/api/orders/quote', 'public'], ['POST', '/api/orders/email', 'admin'], ['POST', '/api/orders/subscribe', 'staff'], ['DELETE', '/api/orders/subscribe', 'staff'],
  ['GET', '/api/orders', 'orders'], ['GET', '/api/orders/:id', 'orders'],
  ['PUT', '/api/orders/edit/:orderId', 'admin'], ['PUT', '/api/orders/:orderId', 'orders'], ['PUT', '/api/orders/cancel/:orderId', 'orders'],
  ['POST', '/api/whatsapp/image', 'admin'], ['GET', '/api/whatsapp/image', 'admin'],
  ['GET', '/api/whatsapp/image/:filename', 'public'], ['DELETE', '/api/whatsapp/image/:id', 'admin'],
  ['POST', '/api/whatsapp/s', 'admin'], ['POST', '/api/whatsapp/sr', 'admin'], ['POST', '/api/whatsapp', 'admin'],
  ['POST', '/api/whatsapp/text', 'admin'], ['GET', '/api/whatsapp/reports', 'admin'], ['GET', '/api/whatsapp/recipients', 'admin'], ['GET', '/api/whatsapp/messages/:recipient', 'admin'],
  ['POST', '/api/whatsapp/webhook', 'webhook'], ['GET', '/api/whatsapp/webhook', 'verification'],
] satisfies [string, string, RetainedAccess][];
export const retainedRoutePolicies = routePolicies.map(([method, path, policy]) => ({ method, path, policy,
  pattern: new RegExp(`^${path.replace(/:[A-Za-z]+/g, '[^/]+')}/?$`, 'i') }));
export function lookupPolicy(method: string, path: string) {
  // Reject ambiguous encoded/slash paths rather than normalize before Express dispatch.
  if (path.includes('%') || path.includes('//') || path.includes('\\')) return undefined;
  return retainedRoutePolicies.find(route => route.method === (method === 'HEAD' ? 'GET' : method) && route.pattern.test(path));
}

