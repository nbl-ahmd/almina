import { createHash } from 'node:crypto';
import type { Document,Db } from 'mongodb';
import { searchEnrichmentSchema } from '@almina/contracts/search';
import { normalizeSearch } from './query-normalizer.js';
export function searchDocument(product:Document,categoryName:string){
 const parsed=searchEnrichmentSchema.safeParse({...product.searchEnrichment,productId:String(product._id)});
 const reviewed=parsed.success&&parsed.data.reviewed?parsed.data:null;
 // Unreviewed/AI draft fields never become searchable. Concern/use-case fields
 // are merchandising for pharmacy-reviewed general-sale products only.
 const general=product.productType==='general'&&product.contentReviewed===true;
 return {normalizedName:normalizeSearch(String(product.name??'')),normalizedBrand:normalizeSearch(String(product.brand??product.familyBrand??'')),categoryName,packLabel:normalizeSearch(String(product.packLabel??'')),
 aliases:reviewed?.aliases??[],searchKeywords:reviewed?.searchKeywords??[],
 concerns:general?reviewed?.concerns??[]:[],useCases:general?reviewed?.useCases??[]:[],features:general?reviewed?.features??[]:[],
 productKind:reviewed?.productKind??'',audience:general?reviewed?.audience??'':'',bodyArea:general?reviewed?.bodyArea??'':'',version:1};
}
export function semanticText(product:Document,categoryName:string){
 const metadata=searchDocument(product,categoryName);
 return [String(product.name??''),`Brand: ${product.brand??product.familyBrand??''}`,`Category: ${categoryName}`,`Form: ${product.productForm??''}`,
  `Pack: ${product.packLabel??''}`,...['aliases','searchKeywords','concerns','useCases','features','productKind','audience','bodyArea'].map(key=>`${key}: ${String(metadata[key as keyof typeof metadata])}`)]
 .join('. ').slice(0,4000);
}
export const semanticHash=(text:string)=>createHash('sha256').update(text).digest('hex');

/** Compatibility batch endpoint under Atlas: refresh additive metadata, never the retired token collection. */
export async function refreshSearchBatch(db:Db,cursor?:string){
 const {ObjectId}=await import('mongodb');
 const products=await db.collection('products').aggregate<Document>([{$match:{archivedAt:{$exists:false},...(cursor?{_id:{$gt:new ObjectId(cursor)}}:{})}},{$sort:{_id:1}},{$limit:200},
 {$lookup:{from:'categories',localField:'category',foreignField:'_id',as:'searchCategory',pipeline:[{$project:{name:1}}]}}],{maxTimeMS:3000}).toArray();
 if(products.length)await db.collection('products').bulkWrite(products.map(p=>({updateOne:{filter:{_id:p._id,updatedAt:p.updatedAt??{$exists:false},searchMetadataRevision:p.searchMetadataRevision??{$exists:false}},update:{$set:{searchDocument:searchDocument(p,String(p.searchCategory?.[0]?.name??''))}}}})),{ordered:false,maxTimeMS:3000});
 return {processed:products.length,nextCursor:products.length===200?String(products.at(-1)!._id):null};
}
