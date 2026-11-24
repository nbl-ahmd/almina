// The storefront shell renders data-customer-session="0" when no customer session cookie came with the page.
// Guest pages then answer session-only reads locally instead of sending a request that can only return 401.
export function renderedAsGuest() {
  return document.querySelector('[data-customer-session]')?.getAttribute('data-customer-session') === '0';
}
/** GET a session-only customer read, or a local 401 for a page rendered without a session. */
export function customerRead(path: '/api/customer/me' | '/api/customer/addresses') {
  return renderedAsGuest() ? Promise.resolve(new Response(null, { status: 401 })) : fetch(path, { cache: 'no-store' });
}
