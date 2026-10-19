import { familyProfile, sameFamilyIdentity, optionFields, optionLabels } from '@almina/contracts';
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
  return ['/', '/products', '/categories', '/offers', '/about', '/contact', '/ras-al-khaimah', '/brands', '/health-guides'].includes(path)
    || /^\/(products|categories|brands|shop|health-guides|offers|routines|collections)\/[^/]+$/.test(path) || /^\/ar\/(brands|shop|health-guides|offers|routines)\/[^/]+$/.test(path);
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
    robots: { index: production && !hasDuplicateQuery(indexingQuery(path,query)), follow: true },
    openGraph: { type: 'website', title: socialTitle, description, url, siteName, locale: 'en_AE', images: [{ url: new URL(image, origin).href, alt: title }] },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [new URL(image, origin).href] },
  };
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
export function websiteData(origin:string){return {'@context':'https://schema.org','@type':'WebSite','@id':origin+'/#website',name:siteName,url:origin,potentialAction:{'@type':'SearchAction',target:{'@type':'EntryPoint',urlTemplate:origin+'/search?q={search_term_string}'},'query-input':'required name=search_term_string'}};}
export function organizationData(origin: string) {
  return { '@context': 'https://schema.org', '@type': ['Organization','Pharmacy'], telephone:'+971504825007', address:{'@type':'PostalAddress',addressLocality:'Ras Al Khaimah',addressCountry:'AE'}, logo:new URL('/logo.png',origin).href, '@id': `${origin}/#organization`, name: siteName, url: origin };
}
export function breadcrumbData(origin: string, items: { name: string; path: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({
    '@type': 'ListItem', position: i + 1, name: item.name, item: new URL(item.path, origin).href,
  })) };
}
function baseProductData(origin: string, product: Product, images: string[]) {
  return { '@context': 'https://schema.org', '@type': 'Product', '@id': `${new URL(productHref(product), origin).href}#product`,
    name: product.name, sku: product.product_id, url: new URL(productHref(product), origin).href,
    category: product.category.name,
    ...(product.brand||product.familyBrand?{brand:{'@type':'Brand',name:product.brand||product.familyBrand}}:{}),
    ...(product.gtin?{gtin:product.gtin}:{}),...(product.mpn?{mpn:product.mpn}:{}),
    ...(product.condition?{itemCondition:`https://schema.org/${{new:'NewCondition',used:'UsedCondition',refurbished:'RefurbishedCondition'}[product.condition]}`}:{}) ,
    ...(product.description ? { description: product.description } : {}),
    ...(images.length ? { image: images.map(image => new URL(image, origin).href) } : {}),
    offers: { '@type': 'Offer', url: new URL(productHref(product), origin).href,
      ...(product.condition?{itemCondition:`https://schema.org/${{new:'NewCondition',used:'UsedCondition',refurbished:'RefurbishedCondition'}[product.condition]}`}:{}) , priceCurrency: 'AED', price: displayPrice(product).toFixed(2), seller: { '@id': `${origin}/#organization` } },
    // This is the advertised catalog price, identical to the visible page, not a
    // checkout quote. The wrapper adds availability only after live policy confirmation.
  };
}

export function productData(origin:string, product:Product, images:string[], variants:Product[]=[], variantImages:Record<string,string[]>={}, availabilityConfirmed=false) {
  const priced=(member:Product,media:string[])=>{const data=baseProductData(origin,member,media);return {...data,offers:{...data.offers,...(availabilityConfirmed?{availability:`https://schema.org/${member.stock>0?'InStock':'OutOfStock'}`}:{})}};};
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
