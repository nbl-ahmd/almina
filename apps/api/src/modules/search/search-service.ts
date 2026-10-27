import { randomUUID } from 'node:crypto';
import type { Document } from 'mongodb';
import {publicSearchProduct} from './serialization.js';
import type { SearchInput,SearchResponse,SearchSynonym,SearchRule,SearchSuggestions } from '@almina/contracts/search';
import { normalizeSearch } from './query-normalizer.js';
import { queryIntent,relaxationQueries } from './query-intent.js';
import { expandSynonyms } from './synonyms.js';
import { rankCandidates } from './ranking.js';
import { currentPrice,semanticAllowed } from './policy.js';
import { groupedSuggestions,emptySuggestions,productLink } from './atlas-provider.js';
import { semanticHash } from './enrichment.js';
import type { SearchProvider,Candidate,SearchExecution,SearchDiagnostic } from './search-types.js';
export type SearchConfiguration={synonyms:SearchSynonym[];rules:SearchRule[];brands:string[];navigation?:{name:string;match:string;locale:string;kind:string;href:string;categoryId?:string;sourceId?:string}[]};
export {publicSearchProduct} from './serialization.js';
export function facets(candidates:Candidate[]):SearchResponse['facets']{
 const products=candidates.map(c=>c.product),counts=(pick:(p:Document)=>unknown)=>{const values=new Map<string,number>();for(const p of products){const raw=pick(p);for(const value of new Set(Array.isArray(raw)?raw:[raw])){if(typeof value==='string'&&value)values.set(value,(values.get(value)??0)+1);}}return [...values].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,20).map(([value,count])=>({value,count}));};
 const prices=products.map(currentPrice).filter(Number.isFinite);
 return {scope:'bounded-relevant-candidates',categories:counts(p=>p.category?.name),brands:counts(p=>p.brand??p.familyBrand),forms:counts(p=>p.productForm),sizes:counts(p=>p.packLabel),
 audiences:counts(p=>p.searchDocument?.audience),bodyAreas:counts(p=>p.searchDocument?.bodyArea),concerns:counts(p=>p.searchDocument?.concerns),features:counts(p=>p.searchDocument?.features),inStock:products.filter(p=>p.stock>0).length,price:prices.length?{min:Math.min(...prices),max:Math.max(...prices)}:null};
}
export class SearchService{
 constructor(private provider:SearchProvider,private configuration:()=>Promise<SearchConfiguration>,private observe:(measurement:SearchDiagnostic)=>void=()=>{}){}
 async search(input:SearchInput):Promise<SearchExecution>{
 const started=performance.now(),deadline=Date.now()+4500,searchId=randomUUID(),normalizedQuery=normalizeSearch(input.q),config=await this.configuration();
 const {intent,text}=queryIntent(input,config.brands),expansions=input.literal?[]:expandSynonyms(input.q,config.synonyms,input.locale);
 const expandedKinds=[...new Set(expansions.map(q=>queryIntent({q},config.brands).intent.productKind).filter((kind):kind is string=>Boolean(kind)))];
 if(!intent.productKind&&expandedKinds.length===1)intent.productKind=expandedKinds[0];
 const rules=config.rules.filter(rule=>rule.enabled&&normalizeSearch(rule.query)===normalizedQuery&&(!rule.startsAt||rule.startsAt<=new Date().toISOString())&&(!rule.endsAt||rule.endsAt>new Date().toISOString()));
 const categoryIntent=(config.navigation??[]).find(n=>n.kind==='category'&&n.categoryId&&n.match===normalizedQuery);if(categoryIntent){intent.category=categoryIntent.categoryId;intent.categoryName=categoryIntent.name;}
 const parseMs=performance.now()-started,lexicalStarted=performance.now();
 let lexical:Candidate[]=[],semantic:Candidate[]=[],relaxed=false,interpretedQuery=text,unavailable=false;
 try{
 lexical=await this.provider.search({input,text,intent,expansions,deadline});
 if(!lexical.length&&!input.literal&&!intent.identifier){for(const relaxedQuery of relaxationQueries(text,intent)){
 const candidates=await this.provider.search({input,text:relaxedQuery,intent,expansions:expandSynonyms(relaxedQuery,config.synonyms,input.locale),relaxed:true,deadline});
 // Relaxation must not invent medication substitution. Only reviewed general-sale products qualify.
 lexical=candidates.filter(c=>semanticAllowed(c.product));if(lexical.length){relaxed=true;interpretedQuery=relaxedQuery;break;}}
 }
 }catch{unavailable=true;if(intent.identifier&&this.provider.exactFallback){try{lexical=(await this.provider.exactFallback(input)).map((product,index)=>({product,tier:0,lexicalRank:index+1,matchedFields:['identifier-fallback']}));}catch{/* No broad fallback scan. */}}}
 const lexicalMs=performance.now()-lexicalStarted,vectorStarted=performance.now();
 if(!unavailable&&!input.literal&&!intent.identifier&&(!intent.brand||!lexical.some(c=>c.tier<=2))&&(lexical.length<5||lexical.every(c=>c.tier>=5))){try{semantic=await this.provider.semanticSearch({input,text,intent,expansions,deadline});}catch{/* Lexical remains useful during vector outages. */}}
 const vectorMs=performance.now()-vectorStarted,fusionStarted=performance.now();
 const sort=input.sort==='relevance'&&intent.priceIntent==='low'?'relevance-cheap':input.sort;
 const ranked=rankCandidates(lexical,semantic,rules,sort,input.groupFamilies).filter(c=>publicSearchProduct(c.product)!==null),offset=input.offset??(input.page-1)*input.limit,page=ranked.slice(offset,offset+input.limit);
 const suggestions=groupedSuggestions(ranked.map(c=>c.product),normalizedQuery);
 const navigation=(config.navigation??[]).filter(n=>(n.locale==='both'||n.locale===input.locale)&&n.match.includes(normalizedQuery));
 for(const n of navigation){if(n.kind==='brand'||n.kind==='category'){const group=n.kind==='brand'?suggestions.brands:suggestions.categories;const found=group.find(b=>normalizeSearch(b.name)===n.match);if(found)found.href=n.href;else if(group.length<3)group.push({name:n.name,href:n.href});}}
 const brandCandidate=lexical[0]?.product.brand||lexical[0]?.product.familyBrand;
 const correction=!input.literal&&normalizedQuery.split(' ').length===1&&lexical[0]?.tier===6&&lexical[0].matchedFields.some(field=>field==='brand'||field==='familyBrand')&&typeof brandCandidate==='string'?brandCandidate as string:null;
 const collections=[...navigation.filter(n=>n.kind!=='brand'&&n.kind!=='category').map(n=>({name:n.name,href:n.href})),...rules.filter(r=>r.type==='navigation'&&r.href&&r.name).map(r=>({name:r.name!,href:r.href!}))];
 if(intent.offers)collections.push({name:input.locale==='ar'?'العروض':'Offers',href:'/offers'});
 if(intent.maxPrice===50)collections.push({name:input.locale==='ar'?'٥٠ درهماً وأقل':'AED 50 & under',href:'/collections/under-50'});
 const exactUnavailable=ranked.find(c=>c.tier<=1&&c.product.stock<=0);
 let alternatives=exactUnavailable&&semanticAllowed(exactUnavailable.product)?ranked.filter(c=>c.product.stock>0&&semanticAllowed(c.product)&&String(c.product.category?._id)===String(exactUnavailable.product.category?._id)&&c.product.productForm===exactUnavailable.product.productForm).slice(0,6).map(c=>({name:String(c.product.name),href:productLink(c.product)})):[];
 if(exactUnavailable&&semanticAllowed(exactUnavailable.product)&&this.provider.alternatives){try{const hidden=new Set(rules.filter(r=>r.type==='hide').map(r=>r.productId));alternatives=(await this.provider.alternatives(exactUnavailable.product,input)).filter(p=>!hidden.has(String(p._id))).map(p=>({name:String(p.name),href:productLink(p)}));}catch{/* Alternatives never block exact results. */}}
 const response:SearchResponse={searchId,query:input.q,normalizedQuery,interpretedQuery,interpretation:intent,correction,relaxed,unavailable,
 products:page.flatMap(c=>{const p=publicSearchProduct(c.product);return p?[p]:[];}),categories:suggestions.categories,brands:suggestions.brands,collections:collections.slice(0,3),
 querySuggestions:expansions.slice(0,5).map(name=>({name,href:'/search?'+new URLSearchParams({q:name})})),alternatives,facets:facets(ranked),
 pagination:{page:Math.floor(offset/input.limit)+1,hasNext:ranked.length>offset+input.limit&&offset+input.limit<300,resultCount:ranked.length,bounded:lexical.length>=300}};
 const diagnostic:SearchDiagnostic={searchId,locale:input.locale,queryHash:semanticHash(normalizedQuery),operation:'search',lexical:lexical.length,semantic:semantic.length,resultCount:ranked.length,relaxed,corrected:Boolean(correction),unavailable,parseMs,lexicalMs,vectorMs,fusionMs:performance.now()-fusionStarted,durationMs:performance.now()-started};
 this.observe(diagnostic);return {response,candidates:ranked,diagnostic};
 }
 async suggest(input:SearchInput):Promise<SearchSuggestions>{const started=performance.now();let response:SearchSuggestions;
 let configurationUnavailable=false;
 const config:SearchConfiguration=await this.configuration().catch(()=>{configurationUnavailable=true;return {synonyms:[],rules:[],brands:[]};});
 const rules=config.rules.filter(r=>r.enabled&&normalizeSearch(r.query)===normalizeSearch(input.q)&&(!r.startsAt||r.startsAt<=new Date().toISOString())&&(!r.endsAt||r.endsAt>new Date().toISOString()));
 try{response=configurationUnavailable?{...emptySuggestions(),unavailable:true}:await this.provider.suggest(input,rules);}catch{response={...emptySuggestions(),unavailable:true};}
 for(const n of config.navigation??[]){if(n.locale!=='both'&&n.locale!==input.locale||!n.match.includes(normalizeSearch(input.q)))continue;const group=n.kind==='brand'?response.brands:n.kind==='category'?response.categories:response.collections;const existing=group.find(b=>normalizeSearch(b.name)===n.match);if(existing)existing.href=n.href;else if(group.length<3)group.push({name:n.name,href:n.href});}
 response.related=expandSynonyms(input.q,config.synonyms,input.locale).slice(0,3).map(name=>({name,href:'/search?'+new URLSearchParams({q:name})}));
 const {intent}=queryIntent(input,config.brands);if(intent.offers)response.collections=[{name:input.locale==='ar'?'العروض':'Offers',href:'/offers'}];
 this.observe({searchId:randomUUID(),locale:input.locale,queryHash:semanticHash(normalizeSearch(input.q)),operation:'suggest',lexical:response.products.length,semantic:0,resultCount:response.products.length,relaxed:false,corrected:false,unavailable:response.unavailable,parseMs:0,lexicalMs:performance.now()-started,vectorMs:0,fusionMs:0,durationMs:performance.now()-started});return response;
 }
}
