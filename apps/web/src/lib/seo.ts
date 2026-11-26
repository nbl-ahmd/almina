import { familyProfile, sameFamilyIdentity, optionFields, optionLabels } from '@almina/contracts';
import type { Metadata } from 'next';
import type { Product } from './catalog/model';
import { productHref, displayPrice } from './catalog/model';
import {
  businessContact,
  merchantReturnPolicyData,
  policyPaths,
  shippingDetailsData,
  type ShippingPolicy,
} from './policies';

export const siteName = 'Al Mina Pharmacy';
export const siteDescription = 'Shop healthcare, skincare and pharmacy essentials from Al Mina Pharmacy in Ras Al Khaimah.';
export type Query = Record<string, string | string[] | undefined>;
export function hasDuplicateQuery(query: Query) {
  return Object.keys(query).some(key => !/^(utm_[a-z_]+|gclid|fbclid|srsltid)$/i.test(key) && query[key] !== undefined);
}
export function isPublicPath(path: string) {
  return ['/', '/products', '/categories', '/offers', '/about', '/contact', '/ras-al-khaimah', '/brands', '/health-guides',
    ...Object.values(policyPaths)].includes(path)
    || /^\/(products|categories|brands|shop|health-guides|offers|routines|collections|pages)\/[^/]+$/.test(path) || /^\/ar\/(brands|shop|health-guides|offers|routines|pages)\/[^/]+$/.test(path);
}
export function catalogPageNumber(path:string,query:Query):number|null {
  if(!['/products','/offers'].includes(path)&&!/^\/categories\/[^/]+$/.test(path))return null;
  return typeof query.page==='string'&&/^[1-9]\d{0,3}$/.test(query.page)&&Number(query.page)<=1000?Number(query.page):null;
}
export function indexingQuery(path:string,query:Query):Query {
  return catalogPageNumber(path,query)!==null?Object.fromEntries(Object.entries(query).filter(([key])=>key!=='page')):query;
}
export function pageMetadata(origin: string, production: boolean, title: string, description: string, path: string, query: Query = {}, image = '/logo.png'): Metadata {
  // Imported titles may already contain the suffix supplied by the root template.
  const pageTitle = title.replace(/\s*\|\s*Al Mina Pharmacy\s*$/i, '').trim() || siteName;
  const pageNumber=catalogPageNumber(path,query);
  const page=pageNumber!==null&&pageNumber>1?String(pageNumber):null;
  const url = new URL(`${path}${page?`?page=${page}`:''}`, origin).href;
  const socialTitle = `${pageTitle} | ${siteName}`;
  return {
    title: page ? `${pageTitle} — Page ${page}` : pageTitle, description, alternates: { canonical: url },
    // Google needs an explicit large-image preview policy to show product photos
    // in Search. NOARCHIVE-style limits are omitted; snippets remain unbounded.
    robots: {
      index: production && !hasDuplicateQuery(indexingQuery(path, query)), follow: true,
      googleBot: {
        index: production && !hasDuplicateQuery(indexingQuery(path, query)), follow: true,
        'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1,
      },
    },
    openGraph: { type: 'website', title: socialTitle, description, url, siteName, locale: 'en_AE', images: [{ url: new URL(image, origin).href, alt: title }] },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [new URL(image, origin).href] },
  };
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
// No SearchAction: Google retired the sitelinks search box, and /search is disallowed in robots.txt.
export function websiteData(origin:string){return {'@context':'https://schema.org','@type':'WebSite','@id':origin+'/#website',name:siteName,url:origin,inLanguage:'en-AE',publisher:{'@id':`${origin}/#organization`}};}
export function organizationData(origin: string) {
  return { '@context': 'https://schema.org', '@type': ['Organization','Pharmacy'], '@id': `${origin}/#organization`, name: siteName, url: origin,
    description: siteDescription,
    telephone: businessContact.telephone,
    email: businessContact.email,
    address: { '@type': 'PostalAddress', addressLocality: businessContact.addressLocality, addressRegion: businessContact.addressLocality, addressCountry: businessContact.addressCountry },
    areaServed: { '@type': 'Country', name: 'United Arab Emirates' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: businessContact.telephone, email: businessContact.email, availableLanguage: ['English', 'Arabic'] },
    currenciesAccepted: 'AED', paymentAccepted: 'Cash, Credit Card',
    logo: new URL('/logo.png', origin).href, image: new URL('/logo.png', origin).href };
}
export function breadcrumbData(origin: string, items: { name: string; path: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({
    '@type': 'ListItem', position: i + 1, name: item.name, item: new URL(item.path, origin).href,
  })) };
}
function absoluteImages(origin: string, images: string[]) {
  return [...new Set(images.flatMap(image => {
    try {
      const url = new URL(image, origin);
      return ['http:', 'https:'].includes(url.protocol) && !url.pathname.endsWith('/product-placeholder.svg') ? [url.href] : [];
    } catch { return []; }
  }))];
}
function baseProductData(origin: string, product: Product, images: string[], shipping: ReturnType<typeof shippingDetailsData>) {
  const productUrl = new URL(productHref(product), origin).href;
  const photos = absoluteImages(origin, images);
  return { '@context': 'https://schema.org', '@type': 'Product', '@id': `${productUrl}#product`,
    name: product.name, sku: product.product_id, url: productUrl,
    category: product.category.name,
    ...(product.brand||product.familyBrand?{brand:{'@type':'Brand',name:product.brand||product.familyBrand}}:{}),
    ...(product.gtin?{gtin:product.gtin}:{}),...(product.mpn?{mpn:product.mpn}:{}),
    // Only what staff recorded; never inferred from the brand.
    ...(product.manufacturer?{manufacturer:{'@type':'Organization',name:product.manufacturer}}:{}),
    ...(product.condition?{itemCondition:`https://schema.org/${{new:'NewCondition',used:'UsedCondition',refurbished:'RefurbishedCondition'}[product.condition]}`}:{}) ,
    ...(product.description ? { description: product.description } : {}),
    // Keep the visible missing-photo state, but never present a placeholder to
    // Google as a product photograph merely to pass required-field checks.
    ...(photos.length ? { image: photos } : {}),
    offers: { '@type': 'Offer', url: productUrl,
      ...(product.condition?{itemCondition:`https://schema.org/${{new:'NewCondition',used:'UsedCondition',refurbished:'RefurbishedCondition'}[product.condition]}`}:{}) ,
      priceCurrency: 'AED', price: displayPrice(product).toFixed(2),
      // The catalog stock value is the same state rendered beside the price; it
      // is not a checkout reservation or a promise that the basket will pass.
      availability: `https://schema.org/${product.stock>0?'InStock':'OutOfStock'}`,
      seller: { '@type': 'Organization', '@id': `${origin}/#organization`, name: siteName, url: origin },
      hasMerchantReturnPolicy: merchantReturnPolicyData(origin, product.productType === 'general'),
      ...(shipping ? { shippingDetails: shipping } : {}) },
    // This is the advertised catalog price, identical to the visible page, not a
    // checkout quote. Server checkout remains authoritative for totals and stock.
  };
}

export function productData(origin:string, product:Product, images:string[], variants:Product[]=[], variantImages:Record<string,string[]>={}, shippingPolicy?: ShippingPolicy|null) {
  const shipping=shippingDetailsData(shippingPolicy);
  const priced=(member:Product,media:string[])=>baseProductData(origin,member,media,shipping);
  const base=priced(product,images);
  const profile=familyProfile(product);
  if(!profile) return base;
  const members=variants.filter(member=>member.familyKey===product.familyKey&&sameFamilyIdentity(member,product));
  const properties=(member:Product)=>({
    ...(member.variantSize||member.variantPackSize?{size:[member.variantSize,member.variantPackSize].filter(Boolean).join(' / ')}:{}),
    additionalProperty:optionFields.filter(key=>member[key]).map(key=>({'@type':'PropertyValue',name:optionLabels[key],value:member[key]})),
  });
  if(members.length<2) return {...base,...properties(product),brand:{'@type':'Brand',name:profile.familyBrand}};
  const groupId=new URL(`/#product-family-${encodeURIComponent(profile.familyKey!)}`,origin).href;
  return {...base,...properties(product),brand:{'@type':'Brand',name:profile.familyBrand},inProductGroupWithID:profile.familyKey,
    isVariantOf:{'@type':'ProductGroup','@id':groupId,productGroupID:profile.familyKey,name:profile.familyName,brand:{'@type':'Brand',name:profile.familyBrand},
      variesBy:[...(profile.variantSize||profile.variantPackSize?['https://schema.org/size']:[]),...(profile.variantFlavour?['https://schema.org/additionalProperty']:[])],
      hasVariant:members.map(member=>({...priced(member,member._id===product._id?images:variantImages[member._id]??[]),...properties(member),isVariantOf:{'@id':groupId}})),
    },
  };
}

type PublicReviews = {
  items: { rating: number; displayName: string; title: string; body: string; createdAt: string; verifiedPurchase: true }[];
  ratingCount: number; average: number | null;
};
export function aggregateRatingData(reviews: PublicReviews | null | undefined) {
  if (!reviews?.ratingCount || reviews.average === null || reviews.average === undefined) return null;
  return { aggregateRating: { '@type': 'AggregateRating', ratingValue: reviews.average, reviewCount: reviews.ratingCount, bestRating: 5, worstRating: 1 } };
}
export function reviewListData(reviews: PublicReviews | null | undefined) {
  return (reviews?.items ?? []).slice(0, 10).map(review => ({
    '@type': 'Review',
    reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    author: { '@type': 'Person', name: review.displayName },
    ...(review.title ? { name: review.title } : {}),
    reviewBody: review.body,
    datePublished: review.createdAt,
  }));
}

/** Category and brand listings: a CollectionPage whose main entity lists the products shown on the page (real catalogue rows only). */
export function collectionData(origin: string, page: { name: string; description: string; path: string }, products: { name: string; href: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': origin + page.path + '#collection', name: page.name, description: page.description,
    url: origin + page.path, isPartOf: { '@id': origin + '/#website' }, inLanguage: 'en-AE',
    ...(products.length ? { mainEntity: { '@type': 'ItemList', numberOfItems: products.length,
      itemListElement: products.slice(0, 48).map((product, index) => ({ '@type': 'ListItem', position: index + 1, url: origin + product.href, name: product.name })) } } : {}) };
}

/** Only for questions and answers that are visible on the same page. */
export function faqData(faqs: { question: string; answer: string }[]) {
  return faqs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) } : null;
}
