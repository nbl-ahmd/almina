import type { SearchEnvironment } from './config.js';
// Standard is Atlas's default; omit repeated defaults to fit the M0 definition budget.
const text={type:'string'};
const autocomplete={type:'autocomplete',tokenization:'edgeGram',minGrams:2,maxGrams:20,foldDiacritics:true};
export function searchIndexDefinitions(env:SearchEnvironment){return [
 {name:env.ATLAS_SEARCH_PRODUCT_INDEX,type:'search' as const,definition:{
  mappings:{dynamic:false,fields:{
   name:[{...text,multi:{arabic:{type:'string',analyzer:'lucene.arabic'}}},autocomplete],
   brand:[text,autocomplete,{type:'token',normalizer:'lowercase'}],familyBrand:[text,autocomplete],
   barcode:{type:'token'},gtin:{type:'token'},product_id:{type:'token'},description:text,summary:text,
   productForm:[text,{type:'token',normalizer:'lowercase'}],packLabel:text,
   category:{type:'objectId'},stock:{type:'number'},price:{type:'number'},salePrice:{type:'number'},sale:{type:'boolean'},
   featured:{type:'boolean'},disabled:{type:'boolean'},published:{type:'boolean'},active:{type:'boolean'},archivedAt:{type:'date'},
   audience:{type:'token'},productType:{type:'token'},contentReviewed:{type:'boolean'},
   searchDocument:{type:'document',dynamic:false,fields:{normalizedName:[{type:'token'},text,autocomplete],normalizedBrand:[{type:'token'},text],packLabel:text,categoryName:text,
    aliases:[text,autocomplete],searchKeywords:text,concerns:text,useCases:text,features:text,productKind:text,
    audience:text,bodyArea:text,semanticSearchText:text}},
  }},synonyms:[{name:'almina',analyzer:'lucene.standard',source:{collection:'search_synonyms_atlas'}}],
 }},
 {name:env.ATLAS_VECTOR_PRODUCT_INDEX,type:'vectorSearch' as const,definition:{fields:[
  {type:'vector',path:'searchEmbedding.vector',numDimensions:env.SEARCH_EMBEDDING_DIMENSIONS,similarity:'cosine'},
  ...['productType','contentReviewed','audience','category','stock','searchEmbedding.model','searchEmbedding.version'].map(path=>({type:'filter',path})),
 ]}},
];}
