// Complete legacy HTTP allowlist. Unlisted paths/methods never reach a handler.
export type RetainedAccess = 'admin' | 'staff' | 'public' | 'orders' | 'login' | 'webhook' | 'verification' | 'stream';
export const routePolicies = [
  ['GET','/api/orders/notifications','staff'],['POST','/api/orders/notifications/read','staff'],['GET','/api/orders/notifications/preferences','staff'],['PUT','/api/orders/notifications/preferences','staff'],['POST','/api/orders/notifications/test','staff'],['GET','/api/orders/notifications/rules','admin'],['PUT','/api/orders/notifications/rules','admin'],
  ['POST','/api/auth/delivery-place-search','admin'],
  ['GET', '/api/image-review/publication', 'admin'],
  ['POST', '/api/image-review/publication/start', 'admin'], ['POST', '/api/image-review/publication/resume', 'admin'], ['POST', '/api/image-review/publication/pause', 'admin'],
  ['GET', '/api/image-review/uploads/:uploadId', 'admin'],
  ['GET', '/api/image-review', 'staff'], ['GET', '/api/image-review/export', 'staff'], ['GET', '/api/image-review/:reviewId', 'staff'],
  ['POST', '/api/image-review/select', 'staff'], ['POST', '/api/image-review/decide', 'staff'],
  ...['stage', 'preview', 'import', 'publish', 'draft'].map(action => ['POST', `/api/image-review/${action}`, 'admin'] as [string, string, RetainedAccess]),
  ['GET', '/api/products/needs-action', 'admin'],
  // Listed before '/api/products/:id' so these names are never read as an identifier.
  ['GET', '/api/products/catalogue', 'staff'], ['GET', '/api/products/queue', 'admin'],
  ['GET', '/api/operations', 'admin'],
  ['GET','/api/catalog-export/state','public'],['GET','/api/catalog-export/products','public'],
  ['GET','/api/catalog-import/template','admin'],
  ...['preview','commit','report','rollback'].map(action=>['POST',`/api/catalog-import/${action}`,'admin'] as [string,string,RetainedAccess]),
  ['POST', '/api/media/products/:id', 'admin'],
  ['POST', '/api/media/products/:id/sign', 'admin'], ['POST', '/api/media/products/:id/commit', 'admin'],
  ['POST','/api/media/marketing','staff'],
  ['GET', '/api/recovery/template', 'admin'], ['POST', '/api/recovery/preview', 'admin'], ['POST', '/api/recovery/commit', 'admin'],
  ['POST', '/api/auth/login', 'login'], ['POST', '/api/auth/logout', 'staff'],
  ['POST', '/api/auth/logout-all', 'staff'], ['GET', '/api/auth/me', 'staff'],
  ['GET','/api/auth/branch-login-availability','admin'], ['GET','/api/auth/branches','admin'], ['POST','/api/auth/branches','admin'], ['POST','/api/auth/branch-login','admin'],
  ['GET','/api/auth/delivery-zones','admin'], ['GET','/api/auth/branch-inventory','admin'],
  ...['delivery-zone','delivery-zone-delete','delivery-settings','branch-inventory'].map(path=>['POST','/api/auth/'+path,'admin'] as [string,string,RetainedAccess]),
  ['PUT','/api/orders/:id/branch','admin'],
  ['GET', '/api/auth/order-routing', 'admin'], ['PUT', '/api/auth/order-routing', 'admin'], ['PUT', '/api/auth/users/:id/assignment', 'admin'],
  ['POST', '/api/orders/:id/confirm', 'orders'], ['POST', '/api/orders/:id/pack', 'orders'],
  ['GET', '/api/orders/notification-settings', 'staff'], ['GET', '/api/orders/receiving', 'orders'], ['GET', '/api/orders/events', 'orders'], ['POST', '/api/orders/events/ticket', 'orders'], ['GET', '/api/orders/events/stream', 'stream'], ['PUT', '/api/orders/:id/routing', 'admin'],
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

