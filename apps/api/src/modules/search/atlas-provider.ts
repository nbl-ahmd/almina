import {publicSearchProduct} from './serialization.js';
import { ObjectId,type Db,type Document } from 'mongodb';
import type { SearchInput,SearchSuggestions,SearchRule } from '@almina/contracts/search';
import { compatibilityProductProjection } from '../catalog/compatibility-reads.js';
import { searchLimits as limits,searchTuning as tuning,type SearchEnvironment } from './config.js';
import { currentFilter,publicSearchFilter,visibleCategoryStages,semanticAllowed,reviewedFacetMatch,searchFamilyKey } from './policy.js';
import { normalizeSearch,queryHashInput } from './query-normalizer.js';
import {searchDocument} from './enrichment.js';
import { semanticHash,semanticText } from './enrichment.js';
import type { SearchProvider,RetrievalInput,Candidate } from './search-types.js';
import { canonicalProductKind,type SearchIntent } from './query-intent.js';
const paths=['name','searchDocument.normalizedName','searchDocument.normalizedBrand','searchDocument.packLabel','brand','familyBrand','productForm','packLabel','summary','description','searchDocument.categoryName','searchDocument.aliases','searchDocument.searchKeywords','searchDocument.productKind','searchDocument.concerns','searchDocument.useCases','searchDocument.features','searchDocument.audience','searchDocument.bodyArea'];
export const emptySuggestions=():SearchSuggestions=>({products:[],categories:[],brands:[],collections:[],popular:[],related:[],unavailable:false});
export function atlasFilters(input:SearchInput,intent:SearchIntent):Document[]{return [
 ...(input.stock===undefined?[]:[{equals:{path:'stock',value:input.stock}}]),...(input.featured===undefined?[]:[{equals:{path:'featured',value:input.featured}}]),
 {compound:{mustNot:[{equals:{path:'disabled',value:true}},{equals:{path:'published',value:false}},{equals:{path:'active',value:false}},{exists:{path:'archivedAt'}}]}},
 {compound:{should:[{in:{path:'audience',value:['all','retail']}},{compound:{mustNot:[{exists:{path:'audience'}}]}}],minimumShouldMatch:1}},
 ...(input.category?[{equals:{path:'category',value:new ObjectId(input.category)}}]:[]),
 ...(input.brand?[{equals:{path:'brand',value:input.brand.toLowerCase()}}]:[]),
 ...((input.inStock??intent.inStock)===true?[{range:{path:'stock',gt:0}}]:[]),
 ...((input.inStock??intent.inStock)===false?[{range:{path:'stock',lte:0}}]:[]),
 ...((input.offers??intent.offers)?[{equals:{path:'sale',value:true}}]:[]),
 ...(['form','size'] as const).flatMap(key=>input[key]?[{text:{path:key==='form'?'productForm':'packLabel',query:input[key],matchCriteria:'all'}}]:[]),
 ...(['audience','bodyArea','concern','feature'] as const).flatMap(key=>input[key]?[{text:{path:'searchDocument.'+({audience:'audience',bodyArea:'bodyArea',concern:'concerns',feature:'features'})[key],query:input[key],matchCriteria:'all'}}]:[]),
 ...((input.minPrice??intent.minPrice)!==undefined||(input.maxPrice??intent.maxPrice)!==undefined?[{compound:{should:['price','salePrice'].map(path=>({range:{path,...((input.minPrice??intent.minPrice)===undefined?{}:{gte:input.minPrice??intent.minPrice}),...((input.maxPrice??intent.maxPrice)===undefined?{}:{lte:input.maxPrice??intent.maxPrice})}})),minimumShouldMatch:1}}]:[]),
 // Effective sale price is checked against the current MongoDB document below.
 ];}
export function lexicalStage(env:SearchEnvironment,request:RetrievalInput,mode:'strict'|'fuzzy'|'synonym'='strict'):Document{
 const {text,intent,input}=request;
 if(intent.identifier)return {$search:{index:env.ATLAS_SEARCH_PRODUCT_INDEX,compound:{filter:atlasFilters(input,intent),should:['product_id','barcode','gtin'].map(path=>({equals:{path,value:intent.identifier}})),minimumShouldMatch:1}}};
 const textQuery=mode==='synonym'?(request.expansions.length?request.expansions:[text]):text;
 const should:Document[]=[...['product_id','barcode','gtin'].map(path=>({equals:{path,value:input.q.trim(),score:{constant:{value:tuning.exactIdentifierScore}}}})),{text:{path:paths,query:textQuery,matchCriteria:'all',...(mode==='fuzzy'?{fuzzy:{maxEdits:text.split(' ').every(token=>token.length>=tuning.fuzzyMinimumTermLengthForTwoEdits)?2:1,prefixLength:tuning.fuzzyPrefixLength,maxExpansions:tuning.fuzzyMaxExpansions}}:{}),...(mode==='synonym'?{synonyms:'almina'}:{})}}];
 for(const [path,boost] of Object.entries(tuning.fieldBoosts))
 should.push({text:{path,query:textQuery,matchCriteria:'all',score:{boost:{value:boost}},...(mode==='fuzzy'?{fuzzy:{maxEdits:1,prefixLength:tuning.fuzzyPrefixLength,maxExpansions:tuning.autocompleteMaxExpansions}}:{})}});
 if(text&&mode==='strict')should.push({equals:{path:'searchDocument.normalizedName',value:normalizeSearch(input.q),score:{boost:{value:tuning.exactNameBoost}}}});
 if(text&&mode==='strict')should.push({phrase:{path:'name',query:text,slop:1,score:{boost:{value:tuning.phraseBoost}}}});
 if(input.locale==='ar'&&text)should.push({text:{path:{value:'name',multi:'arabic'},query:text,matchCriteria:'all'}});
 return {$search:{index:env.ATLAS_SEARCH_PRODUCT_INDEX,highlight:{path:['name','brand','familyBrand','productForm','searchDocument.aliases']},compound:{filter:[...atlasFilters(input,intent),...(mode==='fuzzy'&&!request.relaxed&&(intent.size||text.match(/\d+(?:\.\d+)?/g))?[{text:{path:['searchDocument.normalizedName','searchDocument.packLabel'],query:intent.size??text.match(/\d+(?:\.\d+)?/g)!.join(' '),matchCriteria:'all'}}]:[])],should,minimumShouldMatch:1}}};
}
export class AtlasSearchProvider implements SearchProvider{
 private time(deadline=Date.now()+limits.timeoutMs){const remaining=deadline-Date.now();if(remaining<30)throw Error('Search budget exceeded');return Math.min(limits.timeoutMs,remaining);}
 constructor(private db:Db,private env:SearchEnvironment){}
 async hydrate(ids:string[],input:SearchInput,intent:SearchIntent):Promise<Document[]>{if(!ids.length)return [];
 return this.db.collection('products').aggregate<Document>([{$match:{$and:[{_id:{$in:ids.slice(0,limits.candidates).map(id=>new ObjectId(id))}},currentFilter(input,intent)]}},...visibleCategoryStages,
 {$project:{...compatibilityProductProjection,active:1,audience:1,archivedAt:1,searchDocument:1,searchEnrichment:1,searchEmbedding:{model:1,version:1,semanticTextHash:1},searchSignals:1}}],{maxTimeMS:this.time(),allowDiskUse:false}).toArray().then(rows=>rows.map(row=>({...row,searchDocument:searchDocument(row,String(row.category.name))})).filter(row=>reviewedFacetMatch(row,input)));
 }
 async search(request:RetrievalInput){
 const mode:'strict'|undefined=request.input.literal||request.intent.identifier?'strict':undefined;
 let rows:Document[]=[];let tier=4;
 if(!request.text&&!request.intent.identifier){rows=await this.db.collection('products').aggregate<Document>([{$search:{index:this.env.ATLAS_SEARCH_PRODUCT_INDEX,compound:{filter:atlasFilters(request.input,request.intent)}}},{$match:currentFilter(request.input,request.intent)},...visibleCategoryStages,{$limit:limits.candidates},{$project:{_id:1}}],{maxTimeMS:this.time(request.deadline),allowDiskUse:false}).toArray();}
 else for(const channel of (mode?[mode]:['strict','synonym','fuzzy'] as const)){
 rows=await this.db.collection('products').aggregate<Document>([lexicalStage(this.env,request,channel),{$match:currentFilter(request.input,request.intent)},...visibleCategoryStages,{$limit:limits.candidates},{$project:{_id:1,score:{$meta:'searchScore'},highlights:{$meta:'searchHighlights'}}}],{maxTimeMS:this.time(request.deadline),allowDiskUse:false}).toArray();
 tier=channel==='strict'?4:channel==='synonym'?5:6;if(rows.length||request.intent.identifier)break;
 }
 const hydrated=await this.hydrate(rows.map(row=>String(row._id)),request.input,request.intent),byId=new Map(hydrated.map(row=>[String(row._id),row]));
 return rows.flatMap((row,index)=>{const product=byId.get(String(row._id));if(!product)return [];
 const name=normalizeSearch(String(product.name)),text=normalizeSearch(request.text);
 const exact=[product.product_id,product.barcode,product.gtin].includes(request.input.q.trim());
 return [{product,tier:exact?0:name===normalizeSearch(request.input.q)||name===text?1:request.intent.brand&&request.intent.productKind&&normalizeSearch(String(product.brand??product.familyBrand))===normalizeSearch(request.intent.brand)&&name.includes(request.intent.productKind)?2:name.includes(text)&&text?3:tier,
 lexicalRank:index+1,matchedFields:exact?['identifier']:Array.isArray(row.highlights)&&row.highlights.length?[...new Set(row.highlights.flatMap((h:Document)=>typeof h.path==='string'?[h.path]:[]))]:['atlas-text']}];});
 }
 async semanticSearch(request:RetrievalInput):Promise<Candidate[]>{
 if(!this.env.SEARCH_SEMANTIC_ENABLED||request.intent.identifier||request.input.literal||request.intent.size||request.intent.quantity||/\d/.test(request.text)||request.text.split(' ').length<tuning.semanticMinimumTerms)return [];
 const cached=await this.db.collection('search_query_vectors').findOne({queryHash:semanticHash(queryHashInput(request.input.q,request.input.locale)),model:this.env.EMBEDDING_MODEL,version:1,expiresAt:{$gt:new Date()}},{maxTimeMS:500,projection:{vector:1}});
 if(!cached||!Array.isArray(cached.vector)||cached.vector.length!==this.env.SEARCH_EMBEDDING_DIMENSIONS||cached.vector.some(v=>typeof v!=='number'||!Number.isFinite(v)))return [];
 const rows=await this.db.collection('products').aggregate<Document>([{$vectorSearch:{index:this.env.ATLAS_VECTOR_PRODUCT_INDEX,path:'searchEmbedding.vector',queryVector:cached.vector,numCandidates:limits.vectorCandidates,limit:limits.vectorLimit,
 filter:{$and:[{productType:'general'},{contentReviewed:true},{'searchEmbedding.model':this.env.EMBEDDING_MODEL},{'searchEmbedding.version':1},...(request.input.category?[{category:new ObjectId(request.input.category)}]:[])]}}},
 {$project:{_id:1,score:{$meta:'vectorSearchScore'}}},{$match:{score:{$gte:limits.semanticThreshold}}}],{maxTimeMS:this.time(request.deadline),allowDiskUse:false}).toArray();
 const hydrated=await this.hydrate(rows.map(row=>String(row._id)),request.input,request.intent),byId=new Map(hydrated.map(row=>[String(row._id),row]));
 return rows.flatMap((row,index)=>{const p=byId.get(String(row._id));if(!p||!semanticAllowed(p)||p.searchEmbedding?.model!==this.env.EMBEDDING_MODEL||p.searchEmbedding?.version!==1||p.searchEmbedding?.semanticTextHash!==semanticHash(semanticText(p,String(p.category.name))))return [];
 if(request.intent.productKind&&canonicalProductKind(String(p.searchDocument?.productKind??''))!==request.intent.productKind)return [];
 if(request.intent.brand&&normalizeSearch(String(p.brand??p.familyBrand))!==normalizeSearch(request.intent.brand))return [];
 if(request.intent.audience&&![request.intent.audience,'all'].includes(String(p.searchDocument?.audience??'')))return [];
 if(request.intent.bodyArea&&p.searchDocument?.bodyArea!==request.intent.bodyArea)return [];
 if(request.intent.concerns.some(term=>!p.searchDocument?.concerns?.includes(term))||request.intent.features?.some(term=>!p.searchDocument?.features?.includes(term)))return [];
 if(request.intent.form&&normalizeSearch(String(p.productForm??''))!==request.intent.form)return [];
 return [{product:p,tier:7,semanticRank:index+1,vectorScore:row.score as number,matchedFields:['reviewed-semantic']}];});
 }
 async autocompleteProducts(input:SearchInput,rules:SearchRule[]=[]):Promise<Document[]>{
 const text=normalizeSearch(input.q);if(text.length<2)return [];
 const rows=await this.db.collection('products').aggregate<Document>([{$search:{index:this.env.ATLAS_SEARCH_PRODUCT_INDEX,compound:{filter:atlasFilters(input,{concerns:[]}),should:['name','searchDocument.normalizedName','brand','familyBrand','searchDocument.aliases'].map(path=>({autocomplete:{path,query:text,tokenOrder:'sequential',...(text.length>=tuning.autocompleteFuzzyMinimumLength?{fuzzy:{maxEdits:1,prefixLength:tuning.fuzzyPrefixLength,maxExpansions:tuning.autocompleteMaxExpansions}}:{})}})),minimumShouldMatch:1}}},{$match:currentFilter(input,{concerns:[]})},...visibleCategoryStages,{$limit:24},{$project:{_id:1}}],{maxTimeMS:1000,allowDiskUse:false}).toArray();
 const products=await this.hydrate(rows.map(row=>String(row._id)),input,{concerns:[]}),byId=new Map(products.map(row=>[String(row._id),row]));
 const ordered=rows.flatMap(row=>{const p=byId.get(String(row._id));return p?[p]:[];});
 const hidden=new Set(rules.filter(r=>r.type==='hide').map(r=>r.productId));
 return ordered.filter(p=>!hidden.has(String(p._id))&&publicSearchProduct(p)!==null).slice(0,8);
 }
 async suggest(input:SearchInput,rules:SearchRule[]=[]){return groupedSuggestions(await this.autocompleteProducts(input,rules),normalizeSearch(input.q));}
 async alternatives(source:Document,input:SearchInput){
 if(!semanticAllowed(source))return [];
 const category=source.category?._id;if(!category)return [];
 const kind=source.searchDocument?.productKind,form=source.productForm;
 if(!source.familyKey&&!kind&&!form)return [];
 const {queryIntent}=await import('./query-intent.js');const audience=source.searchDocument?.audience||queryIntent(input).intent.audience;
 const match={$and:[currentFilter({...input,inStock:true},{concerns:[]}),{_id:{$ne:source._id},category,productType:'general',contentReviewed:true},
 {$or:[...(source.familyKey?[{familyKey:source.familyKey}]:[]),...(kind?[{'searchDocument.productKind':kind,...(form?{productForm:form}:{})}]:form?[{productForm:form}]:[])]}]};
 const rows=await this.db.collection('products').find(match,{projection:{_id:1},maxTimeMS:this.time()}).sort({stock:-1,_id:1}).limit(20).toArray();
 return (await this.hydrate(rows.map(p=>String(p._id)),{...input,inStock:true},{concerns:[]})).filter(p=>semanticAllowed(p)&&(!audience||[audience,'all'].includes(p.searchDocument?.audience))).slice(0,6);
 }
 async exactFallback(input:SearchInput){const {exactIdentifier}=await import('./query-normalizer.js');const identifier=exactIdentifier(input.q);if(!identifier)return [];
 const ids=await this.db.collection('products').find({$and:[{$or:['product_id','barcode','gtin'].map(path=>({[path]:identifier}))},publicSearchFilter]},{projection:{_id:1},maxTimeMS:500}).limit(8).toArray();return this.hydrate(ids.map(p=>String(p._id)),input,{concerns:[],identifier});}
}
export function categoryLink(category:Document){return `/categories/${String(category.name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'item'}--${String(category._id)}`;}
export function productLink(p:Document){return `/products/${String(p.name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'item'}--${encodeURIComponent(String(p.product_id))}`;}
export function groupedSuggestions(products:Document[],text:string):SearchSuggestions{
 const result=emptySuggestions(),categories=new Set<string>(),brands=new Set<string>(),families=new Set<string>();
 for(const p of products){const family=searchFamilyKey(p);if(!families.has(family)&&result.products.length<8){result.products.push({name:String(p.name).slice(0,160),href:productLink(p)});families.add(family);}
 const category=p.category;if(category&&normalizeSearch(String(category.name)).includes(text)&&!categories.has(String(category._id))&&result.categories.length<3){categories.add(String(category._id));result.categories.push({name:String(category.name),href:categoryLink(category)});}
 const brand=String(p.brand??p.familyBrand??'');if(brand&&normalizeSearch(brand).includes(text)&&!brands.has(brand)&&result.brands.length<3){brands.add(brand);result.brands.push({name:brand,href:'/search?'+new URLSearchParams({q:brand,brand})});}
 }return result;
}
