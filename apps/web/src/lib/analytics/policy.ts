/** What may leave the shop for the analytics provider. Pure, so every rule is testable without a browser or SDK.
 *  The sanitizer denies by default: a property or event that is not listed here is never sent. */
export type AnalyticsConfig = { key: string; host: string; cookieless: boolean };
export type AnalyticsMode = 'full' | 'anonymous' | 'off';

/** `full` needs permission. `anonymous` stores nothing on the device and needs the owner to switch cookieless counting on. */
export function analyticsMode(choice: 'allowed' | 'declined' | 'unset', blocked: boolean, cookieless: boolean): AnalyticsMode {
  if (blocked) return 'off';
  if (choice === 'allowed') return 'full';
  return cookieless ? 'anonymous' : 'off';
}

const fixedPaths = new Set(['', 'products', 'categories', 'brands', 'offers', 'search', 'cart', 'checkout', 'checkout/stripe',
  'account', 'account/orders', 'saved', 'about', 'contact', 'privacy', 'returns', 'shipping', 'terms', 'map', 'ras-al-khaimah',
  'unsubscribe', 'health-guides']);
const childPaths: Record<string, string> = { products: ':product', categories: ':category', brands: ':brand', offers: ':offer',
  collections: ':collection', shop: ':page', pages: ':page', routines: ':routine', 'health-guides': ':guide', sections: ':section' };

/** Page type instead of address: slugs, order references and tokens can name a medicine or a person.
 *  `null` marks staff and wholesale screens, which are never measured. */
export function safePath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0] ?? '';
  if (first === 'admin' || first === 'wholesale') return null;
  if (first === 'ar') return parts.length > 1 ? '/ar/:section/:page' : '/ar';
  const path = parts.join('/');
  if (fixedPaths.has(path)) return `/${path}`;
  if (parts.length === 2 && Object.hasOwn(childPaths, first)) return `/${first}/${childPaths[first]}`;
  if (parts.length === 3 && first === 'account' && parts[1] === 'orders') return '/account/orders/:order';
  return '/other';
}

const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
/** Campaign tags are typed by whoever builds a link: anything shaped like an address, phone number or free text is dropped.
 *  `utm_term` is excluded because paid search fills it with the shopper's search words. */
function campaignTag(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9 _.~+-]{1,100}$/.test(value) && !/\d{7,}/.test(value) ? value : undefined;
}

function parseUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url : null; } catch { return null; }
}

export function safeUrl(value: unknown): string | undefined {
  const url = parseUrl(value);
  const path = url ? safePath(url.pathname) : null;
  if (!url || path === null) return undefined;
  const query = new URLSearchParams();
  for (const key of campaignKeys) { const tag = campaignTag(url.searchParams.get(key)); if (tag) query.set(key, tag); }
  return `${url.origin}${path}${query.size ? `?${query}` : ''}`;
}

/** Another site is reduced to its origin: its path can carry search words. */
function safeReferrer(value: unknown, origin: string): string | undefined {
  if (value === '$direct') return value;
  const url = parseUrl(value);
  if (!url) return undefined;
  return url.origin === origin ? safeUrl(url.href) : `${url.origin}/`;
}
const domain = (value: unknown) => value === '$direct' || (typeof value === 'string' && /^[A-Za-z0-9.:-]{1,253}$/.test(value)) ? value : undefined;

const events = new Set(['$pageview', '$pageleave', '$web_vitals', 'product_viewed', 'product_added_to_cart', 'cart_updated',
  'checkout_reviewed', 'checkout_confirmed', 'checkout_failed', 'client_error', 'search_performed', 'search_matched',
  'campaign_viewed', 'campaign_clicked', 'contact_clicked']);

/** Set by the SDK: identifiers, device description and scroll depth. None carries page content. */
const sdkKeys = new Set(['token', 'distinct_id', '$device_id', '$session_id', '$window_id', '$lib', '$lib_version', '$insert_id', '$time',
  '$browser', '$browser_version', '$browser_language', '$browser_language_prefix', '$os', '$os_version', '$device_type', '$raw_user_agent',
  '$screen_height', '$screen_width', '$viewport_height', '$viewport_width', '$host', '$timezone', '$timezone_offset', '$cookieless_mode',
  '$process_person_profile', '$is_identified', '$config_defaults', '$pageview_id', '$prev_pageview_id', '$prev_pageview_duration',
  ...['last', 'max'].flatMap(edge => ['scroll', 'content'].flatMap(kind => [`$prev_pageview_${edge}_${kind}`, `$prev_pageview_${edge}_${kind}_percentage`]))]);

const text = (limit: number) => (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= limit ? value : undefined;
const matching = (pattern: RegExp) => (value: unknown) => typeof value === 'string' && pattern.test(value) ? value : undefined;
const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
const flag = (value: unknown) => typeof value === 'boolean' ? value : undefined;
/** The shop's own event properties. */
const shopKeys: Record<string, (value: unknown) => unknown> = {
  product_id: matching(/^[a-fA-F0-9]{24}$/), product_name: text(200), product_category: text(100), product_brand: text(100),
  price_aed: amount, quantity: amount, value_aed: amount, item_count: amount,
  payment_method: matching(/^[a-z_]{1,20}$/), error_code: matching(/^[A-Z_]{1,40}$/), campaign: matching(/^[a-z0-9-]{1,100}$/),
  channel: matching(/^(phone|whatsapp|email)$/), locale: matching(/^(en|ar)$/),
  ...Object.fromEntries(['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].map(name => [`$web_vitals_${name}_value`, amount])),
  test_payment: flag,
};

export type Capture = { event: string; properties: Record<string, unknown>; $set?: unknown; $set_once?: unknown };

function safeProperty(key: string, value: unknown, origin: string): unknown {
  if (sdkKeys.has(key)) return value === null || ['string', 'number', 'boolean'].includes(typeof value) ? value : undefined;
  if (Object.hasOwn(shopKeys, key)) return shopKeys[key]!(value);
  const name = key.replace(/^\$session_entry_/, '$');
  if (name === '$current_url' || name === '$url') return safeUrl(value);
  if (name === '$pathname' || key === '$prev_pageview_pathname') return typeof value === 'string' ? safePath(value) ?? undefined : undefined;
  if (name === '$referrer') return safeReferrer(value, origin);
  if (name === '$referring_domain') return domain(value);
  if ((campaignKeys as readonly string[]).includes(key.replace(/^\$session_entry_/, ''))) return campaignTag(value);
  return undefined;
}

/** The provider's last hook before a request. Returns `null` to drop the whole event. */
export function sanitizeCapture<T extends Capture>(capture: T | null, origin: string): T | null {
  if (!capture || !events.has(capture.event)) return null;
  const { $current_url: url, $pathname: path } = capture.properties;
  const parsed = parseUrl(url);
  if ((parsed && safePath(parsed.pathname) === null) || (typeof path === 'string' && safePath(path) === null)) return null;
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(capture.properties)) {
    const safe = safeProperty(key, value, origin);
    if (safe !== undefined) properties[key] = safe;
  }
  const result: Capture = { ...capture, properties };
  // Person properties are never written: shoppers are not identified.
  delete result.$set;
  delete result.$set_once;
  return result as T;
}

export type ProductSignal = { product_id: string; product_name: string; product_category: string; product_brand?: string; price_aed: number };

/** Only confirmed general-sale products may be named. Medicines and unclassified products can reveal a health condition. */
export function productSignal(product: { _id: string; name: string; productType?: string | undefined; brand?: string | undefined; familyBrand?: string | undefined; category: { name: string } }, price: number): ProductSignal | undefined {
  if (product.productType !== 'general') return undefined;
  const brand = (product.brand || product.familyBrand)?.slice(0, 100);
  return { product_id: product._id, product_name: product.name.slice(0, 200), product_category: product.category.name.slice(0, 100),
    ...(brand ? { product_brand: brand } : {}), price_aed: price };
}

export function contactChannel(href: string): 'phone' | 'whatsapp' | 'email' | undefined {
  if (href.startsWith('tel:')) return 'phone';
  if (href.startsWith('mailto:')) return 'email';
  return /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href) ? 'whatsapp' : undefined;
}
