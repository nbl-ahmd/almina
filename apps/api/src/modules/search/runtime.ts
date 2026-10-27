import {ObjectId,type Db,type Document} from 'mongodb';
import type { SearchInput,SearchRule } from '@almina/contracts/search';
import { synonymSchema,searchRuleSchema } from '@almina/contracts/search';
import { retainedProductList,retainedCatalogQuery } from '../catalog/compatibility-reads.js';
import { suggestProducts } from '../growth/search.js';
import { AtlasSearchProvider,groupedSuggestions,categoryLink } from './atlas-provider.js';
import { readSearchEnvironment,searchLimits } from './config.js';
import { SearchService,type SearchConfiguration } from './search-service.js';
import type { SearchProvider,RetrievalInput,SearchDiagnostic } from './search-types.js';
import {normalizeSearch} from './query-normalizer.js';
import { seedSynonyms } from './synonyms.js';
class LegacySearchProvider implements SearchProvider{
 constructor(private db:Db){}
 async search({input}:RetrievalInput){const parsed=retainedCatalogQuery({q:input.q,limit:'100',groupFamilies:String(input.groupFamilies),sort:input.sort,
 filter:JSON.stringify({...(input.category?{category:input.category}:{}),...(input.offers?{sale:true}:{}),...(input.featured===undefined?{}:{featured:input.featured}),...(input.stock===undefined?{}:{stock:input.stock})}),...(input.inStock===undefined?{}:{inStock:String(input.inStock)}),...(input.minPrice===undefined?{}:{minPrice:String(input.minPrice)}),...(input.maxPrice===undefined?{}:{maxPrice:String(input.maxPrice)})},'search');
 const products=await retainedProductList(this.db,{...parsed,limit:300});
 return products.map((product,index)=>({product,tier:4,lexicalRank:index+1,matchedFields:['legacy']}));}
 async suggest(input:SearchInput,rules:SearchRule[]=[]){let rows=await suggestProducts(this.db,input.q);if(!rows.length){const words=input.q.toLowerCase().split(/\s+/);const fallback=await retainedProductList(this.db,retainedCatalogQuery({q:words[0]!,limit:'30'},'search'));rows=fallback.filter(p=>words.every(word=>String(p.name).toLowerCase().includes(word))).slice(0,6).map(p=>({id:String(p._id),name:String(p.name),productId:String(p.product_id),category:String(p.category.name)}));}const products=await this.hydrate(rows.map(row=>row.id),input);const byId=new Map(products.map(p=>[String(p._id),p])),hidden=new Set(rules.filter(r=>r.type==='hide').map(r=>r.productId));return groupedSuggestions(rows.flatMap(row=>{const p=byId.get(row.id);return p&&!hidden.has(row.id)?[p]:[];}),normalizeSearch(input.q));}
 async semanticSearch(){return [];}
 async hydrate(ids:string[],input:SearchInput):Promise<Document[]>{return new AtlasSearchProvider(this.db,readSearchEnvironment(process.env)).hydrate(ids,input,{concerns:[]});}
}
const cached=new WeakMap<Db,{expires:number;value:Promise<SearchConfiguration>}>();
export function invalidateSearchConfiguration(db:Db){cached.delete(db);}
export async function searchConfiguration(db:Db):Promise<SearchConfiguration>{
 const prior=cached.get(db);if(prior&&prior.expires>Date.now())return visibleConfiguration(db,await prior.value);
 const value=(async()=>{const [synonyms,rules,brands,pages,categories]=await Promise.all([
 db.collection('search_synonyms').find({},{maxTimeMS:1000,projection:{_id:0}}).limit(501).toArray(),
 db.collection('search_rules').find({},{maxTimeMS:1000,projection:{_id:0}}).limit(201).toArray(),
 db.collection('products').aggregate<{_id:string}>([{$match:{brand:{$type:'string'},disabled:{$ne:true},published:{$ne:false},archivedAt:{$exists:false}}},{$sort:{brand:1,_id:1}},{$limit:20000},{$group:{_id:'$brand'}},{$sort:{_id:1}},{$limit:300}],{maxTimeMS:1000}).toArray(),
 db.collection('growth_pages').find({published:true,kind:{$in:['brand','collection','category']},healthContent:{$ne:true}},{maxTimeMS:1000,projection:{kind:1,slug:1,locale:1,title:1,query:1,startsAt:1,endsAt:1}}).sort({slug:1}).limit(200).toArray(),
 db.collection('categories').find({disabled:{$ne:true},archivedAt:{$exists:false},name:{$type:'string'}},{maxTimeMS:1000,projection:{name:1}}).sort({name:1}).limit(1000).toArray()]);
 if(synonyms.length>500||rules.length>200)throw Error('Search configuration requires size review');
 const savedSynonyms=synonyms.flatMap(row=>{const parsed=synonymSchema.safeParse(row);return parsed.success?[parsed.data]:[];});
 const cleanSynonyms=[...new Map([...seedSynonyms,...savedSynonyms].map(entry=>[entry.key,entry])).values()];if(cleanSynonyms.length>500)throw Error('Search vocabulary requires size review');
 return {synonyms:cleanSynonyms,rules:rules.flatMap(row=>{const parsed=searchRuleSchema.safeParse(row);return parsed.success?[parsed.data]:[];}),brands:brands.map(b=>b._id),navigation:[...categories.map(p=>({name:String(p.name),match:normalizeSearch(String(p.name)),locale:'both',kind:'category',categoryId:String(p._id),href:categoryLink(p)})),...pages.filter(p=>(!p.startsAt||p.startsAt<=new Date().toISOString())&&(!p.endsAt||p.endsAt>new Date().toISOString())&&/^[a-z0-9][a-z0-9-]*$/.test(String(p.slug))).map(p=>({name:String(p.title),match:normalizeSearch(String(p.query||p.title)),locale:String(p.locale??'en'),kind:String(p.kind),sourceId:String(p._id),href:`${p.locale==='ar'?'/ar':''}/${p.kind==='brand'?'brands':p.kind==='category'?'shop':'routines'}/${p.slug}`}))]};
 })();cached.set(db,{expires:Date.now()+searchLimits.configTtlMs,value});try{return await visibleConfiguration(db,await value);}catch(error){cached.delete(db);throw error;}
}
export function searchService(db:Db,observe?:(measurement:SearchDiagnostic)=>void):SearchService{const env=readSearchEnvironment(process.env);return new SearchService(env.SEARCH_PROVIDER==='atlas'?new AtlasSearchProvider(db,env):new LegacySearchProvider(db),()=>searchConfiguration(db),observe);}

async function visibleConfiguration(db:Db,configuration:SearchConfiguration):Promise<SearchConfiguration>{
 const navigation=configuration.navigation??[],categoryIds=navigation.flatMap(n=>n.categoryId?[new ObjectId(n.categoryId)]:[]),pageIds=navigation.flatMap(n=>n.sourceId?[n.sourceId]:[]),now=new Date().toISOString();
 const [categories,pages]=await Promise.all([
  categoryIds.length?db.collection('categories').find({_id:{$in:categoryIds},disabled:{$ne:true},archivedAt:{$exists:false}},{maxTimeMS:800,projection:{_id:1}}).limit(1000).toArray():[],
  pageIds.length?db.collection<Document&{_id:string}>('growth_pages').find({_id:{$in:pageIds},published:true,healthContent:{$ne:true},$and:[{$or:[{startsAt:null},{startsAt:{$lte:now}}]},{$or:[{endsAt:null},{endsAt:{$gt:now}}]}]},{maxTimeMS:800,projection:{_id:1}}).limit(200).toArray():[],
 ]);
 const visibleCategories=new Set(categories.map(c=>String(c._id))),visiblePages=new Set(pages.map(p=>p._id));
 return {...configuration,navigation:navigation.filter(n=>n.categoryId?visibleCategories.has(n.categoryId):n.sourceId?visiblePages.has(n.sourceId):true)};
}
