/** Store accounts are fulfilment identities, never catalogue or marketing operators.
 * Kept shared so the browser gateway and persistent API enforce the same boundary.
 * Existing person accounts retain their established access until explicitly retired. */
export function storeAccountRouteAllowed(method: string, path: string): boolean {
  const verb = method === 'HEAD' ? 'GET' : method;
  const route = path.replace(/^\/api\//, '').replace(/\/$/, '');
  if (/^orders\/notifications(?:\/(?:read|preferences|test))?$/.test(route)) return (verb==='GET'&&(route==='orders/notifications'||route.endsWith('/preferences')))||(verb==='POST'&&(route.endsWith('/read')||route.endsWith('/test')))||(verb==='PUT'&&route.endsWith('/preferences'));
  if (verb === 'GET' && /^(auth\/me|orders(?:\/(?:receiving|notification-settings)|\/[a-f0-9]{24})?)$/i.test(route)) return true;
  if (verb === 'POST' && /^(auth\/(logout|logout-all)|orders\/subscribe|orders\/[a-f0-9]{24}\/(confirm|pack))$/i.test(route)) return true;
  if (verb === 'DELETE' && route === 'orders/subscribe') return true;
  return verb === 'PUT' && /^orders\/(?:cancel\/)?[a-f0-9]{24}$/i.test(route);
}
