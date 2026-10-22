import { publicationIssues, visibleToRetail } from '@almina/contracts';
import { type Product, displayPrice, productHref, productOptionLabel } from './model';
export type FeedChannel='google'|'meta';
export const feedColumns=['id','title','description','availability','condition','price','link','image_link','brand','gtin','mpn','identifier_exists','item_group_id','size','product_type','google_product_category','additional_image_link'];
export function feedIssues(product:Product,channel:FeedChannel,images:string[]) {
  const missing=publicationIssues(product);
  if(!visibleToRetail(product))missing.push('Retail visibility');
  if(product.product_id.length>(channel==='google'?50:100))missing.push('Channel identifier length');
  if(!product.condition)missing.push('Condition review');
  if(product.name.length>150)missing.push('Product title exceeds 150 characters');
  if(!(channel==='google'?product.googleApproved:product.metaApproved))missing.push('Channel approval');
  if(channel==='google'&&(!product.identifierStatus||product.identifierStatus==='unknown'))missing.push('Manufacturer identifier review');
  if(product.identifierStatus==='assigned'&&!product.gtin&&!product.mpn)missing.push('Assigned manufacturer identifier is missing');
  if(channel==='meta'&&product.productType!=='general')missing.push('Meta healthcare eligibility review (medicines excluded)');
  if(!images.length||images.some(url=>!url.startsWith('https://')))missing.push('Public HTTPS product image');
  return [...new Set(missing)];
}
export function feedProduct(origin:string,product:Product,images:string[],channel:FeedChannel):Record<string,string>|null {
  if(feedIssues(product,channel,images).length)return null;
  const label=productOptionLabel(product),title=`${product.name}${label?` — ${label}`:''}`;
  // Never truncate a strength or pack specification to satisfy a title limit.
  if(title.length>150)return null;
  return {id:product.product_id,title,description:product.description!,availability:product.stock>0?(channel==='google'?'in_stock':'in stock'):(channel==='google'?'out_of_stock':'out of stock'),condition:product.condition!,price:`${displayPrice(product).toFixed(2)} AED`,link:new URL(productHref(product),origin).href,image_link:images[0]!,brand:product.brand||product.familyBrand||'',gtin:product.gtin||'',mpn:product.mpn||'',identifier_exists:channel==='google'&&product.identifierStatus==='not-assigned'&&!product.gtin&&!product.mpn?'no':'',item_group_id:product.familyKey||'',size:[product.variantSize,product.variantPackSize].filter(Boolean).join(' / '),product_type:product.category.name,google_product_category:product.googleProductCategory||'',additional_image_link:images.slice(1).join(',')};
}
export function escapeFeedXml(value:string){return value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!));}
export function feedXml(origin:string,rows:Record<string,string>[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Al Mina Pharmacy</title><link>${escapeFeedXml(origin)}</link><description>Reviewed product catalog</description>${rows.map(row=>`<item>${feedColumns.filter(key=>row[key]).flatMap(key=>key==='additional_image_link'?row[key]!.split(',').map(image=>`<g:additional_image_link>${escapeFeedXml(image)}</g:additional_image_link>`):[`<g:${key}>${escapeFeedXml(row[key]!)}</g:${key}>`]).join('')}</item>`).join('')}</channel></rss>`;
}
function csvCell(value:string){const safe=/^[=+@\-\t\r]/.test(value)?`'${value}`:value;return `"${safe.replace(/"/g,'""')}"`;}
export function feedCsv(rows:Record<string,string>[]){return [feedColumns.join(','),...rows.map(row=>feedColumns.map(key=>csvCell(row[key]||'')).join(','))].join('\r\n')+'\r\n';}
