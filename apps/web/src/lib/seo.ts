import type { Metadata } from 'next';
import type { Product } from './catalog/model';
import { productHref, displayPrice } from './catalog/model';

export const siteName = 'Al Mina Pharmacy';
export const siteDescription = 'Shop healthcare, skincare and pharmacy essentials from Al Mina Pharmacy in Ras Al Khaimah.';
export type Query = Record<string, string | string[] | undefined>;
export function hasDuplicateQuery(query: Query) {
  return Object.keys(query).some(key => !/^(utm_[a-z_]+|gclid|fbclid)$/i.test(key) && query[key] !== undefined);
}
export function isPublicPath(path: string) {
  return ['/', '/products', '/categories', '/offers'].includes(path)
    || /^\/(products|categories)\/[^/]+$/.test(path);
}
export function pageMetadata(origin: string, production: boolean, title: string, description: string, path: string, query: Query = {}, image = '/logo.png'): Metadata {
  const url = new URL(path, origin).href;
  const socialTitle = `${title} | ${siteName}`;
  return {
    title, description, alternates: { canonical: url },
    robots: { index: production && !hasDuplicateQuery(query), follow: true },
    openGraph: { type: 'website', title: socialTitle, description, url, siteName, locale: 'en_AE', images: [{ url: new URL(image, origin).href, alt: title }] },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [new URL(image, origin).href] },
  };
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
export function organizationData(origin: string) {
  return { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${origin}/#organization`, name: siteName, url: origin };
}
export function breadcrumbData(origin: string, items: { name: string; path: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({
    '@type': 'ListItem', position: i + 1, name: item.name, item: new URL(item.path, origin).href,
  })) };
}
export function productData(origin: string, product: Product, images: string[]) {
  return { '@context': 'https://schema.org', '@type': 'Product', '@id': `${new URL(productHref(product), origin).href}#product`,
    name: product.name, sku: product.product_id, url: new URL(productHref(product), origin).href,
    category: product.category.name,
    ...(product.description ? { description: product.description } : {}),
    ...(images.length ? { image: images.map(image => new URL(image, origin).href) } : {}),
    offers: { '@type': 'Offer', url: new URL(productHref(product), origin).href,
      priceCurrency: 'AED', price: displayPrice(product).toFixed(2), seller: { '@id': `${origin}/#organization` } },
    // This is the advertised catalog price, identical to the visible page, not a
    // checkout quote. Omit availability until the checkout/store-open policy is integrated.
  };
}
