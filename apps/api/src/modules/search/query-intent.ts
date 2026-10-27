import type { z } from 'zod';
import type { searchInterpretationSchema, SearchInput } from '@almina/contracts/search';
import { normalizeSearch,exactIdentifier } from './query-normalizer.js';
export type SearchIntent=z.infer<typeof searchInterpretationSchema>;
export const knownBrands=['CeraVe','Cetaphil','Bioderma','Pampers','Accu-Chek',"Johnson's"];
export function queryIntent(input:Pick<SearchInput,'q'|'minPrice'|'maxPrice'|'inStock'|'offers'>,brands:string[]=knownBrands):{intent:SearchIntent;text:string}{
 const normalized=normalizeSearch(input.q),identifier=exactIdentifier(input.q),intent:SearchIntent={concerns:[]};
 if(identifier)return {intent:{...intent,identifier},text:input.q.trim()};
 const brand=brands.find(b=>` ${normalized} `.includes(` ${normalizeSearch(b)} `));if(brand)intent.brand=brand;
 const price=normalized.match(/(?:under|below|less than|اقل من|تحت)\s*(\d+(?:\.\d{1,2})?)/);
 if(price)intent.maxPrice=Math.min(999999,Number(price[1]));
 const above=normalized.match(/(?:above|over|اكثر من)\s*(\d+(?:\.\d{1,2})?)/);if(above)intent.minPrice=Math.min(999999,Number(above[1]));
 if(/\b(cheap|cheapest|budget|affordable)\b|رخيص/.test(normalized))intent.priceIntent='low';
 if(/\b(offers?|sale|discounts?)\b|عروض|تخفيض/.test(normalized))intent.offers=true;
 if(/\bin stock\b|متوفر/.test(normalized))intent.inStock=true;
 const size=normalized.match(/\b\d+(?:\.\d+)?\s*(?:ml|mg|kg|g|l)\b|\bsize\s+\d+\b|مقاس\s+\d+/);if(size)intent.size=size[0];
 const features=['fragrance free','alcohol free','water resistant'].filter(f=>normalized.includes(f));if(features.length)intent.features=features;
 const quantity=normalized.match(/\b(\d{1,3})\s*(?:pack|pieces|pcs)\b/);if(quantity)intent.quantity=Number(quantity[1]);
 const kind=normalized.match(/\b(cleanser|shampoo|sunscreen|diaper|wipe|moisturizer|glucometer|glucose monitor|toothpaste|cotton swab)\b/);if(kind)intent.productKind=kind[0];
 const form=normalized.match(/\b(cream|gel|lotion|spray|foam|capsule|tablet)\b/);if(form)intent.form=form[0];
 if(/\b(baby|babies|infant)\b|اطفال|رضع/.test(normalized))intent.audience='baby';else if(/\b(kids|children|child)\b/.test(normalized))intent.audience='kids';
 const area=normalized.match(/\b(face|body|hand|hair|oral)\b/);if(area)intent.bodyArea=area[0];
 for(const concern of ['dry skin','sensitive skin'])if(normalized.includes(concern))intent.concerns.push(concern);
 if(input.minPrice!==undefined)intent.minPrice=input.minPrice;if(input.maxPrice!==undefined)intent.maxPrice=input.maxPrice;
 if(input.inStock!==undefined)intent.inStock=input.inStock;if(input.offers!==undefined)intent.offers=input.offers;
 const text=normalized.replace(/(?:products?\s+)?(?:under|below|less than|above|over|اقل من|تحت|اكثر من)\s*\d+(?:\.\d{1,2})?/g,' ')
 .replace(/\b(?:cheap|cheapest|budget|affordable|products?|in stock|offers?|sale|discounts?|for|something|to|at home)\b/g,' ').replace(/\s+/g,' ').trim();
 return {intent,text};
}
export function relaxationQueries(text:string,intent:SearchIntent){
 if(intent.identifier)return [];
 const queries:string[]=[];
 if(intent.size)queries.push(text.replace(intent.size,'').replace(/\s+/g,' ').trim());
 if(intent.brand&&intent.productKind)queries.push(`${normalizeSearch(intent.brand)} ${intent.productKind}`);
 if(intent.productKind)queries.push(intent.productKind);
 return [...new Set(queries)].filter(q=>q&&q!==text).slice(0,3);
}
