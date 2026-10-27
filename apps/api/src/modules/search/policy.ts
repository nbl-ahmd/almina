import {familyProfile,strengthSignature} from '@almina/contracts';
import { ObjectId,type Document } from 'mongodb';
import { retailAudienceFilter } from '../catalog/audience.js';
import type { SearchInput } from '@almina/contracts/search';
import type { SearchIntent } from './query-intent.js';
export const publicSearchFilter={archivedAt:{$exists:false},disabled:{$ne:true},published:{$ne:false},active:{$ne:false},...retailAudienceFilter};
export const currentPriceExpression={$cond:[{$and:[{$eq:['$sale',true]},{$isNumber:'$salePrice'},{$gte:['$salePrice',0]},{$lte:['$salePrice','$price']}]},'$salePrice','$price']};
export function currentPrice(product:Document){return product.sale===true&&typeof product.salePrice==='number'&&product.salePrice>=0&&product.salePrice<=product.price?product.salePrice:typeof product.price==='number'?product.price:Infinity;}
export function currentFilter(input:SearchInput,intent:SearchIntent={} as SearchIntent):Document{
 const min=input.minPrice??intent.minPrice,max=input.maxPrice??intent.maxPrice,stock=input.inStock??intent.inStock;
 return {$and:[publicSearchFilter,...(input.stock===undefined?[]:[{stock:input.stock}]),...(input.featured===undefined?[]:[{featured:input.featured}]),...(input.category?[{category:new ObjectId(input.category)}]:[]),
 ...(input.brand?[{$or:[{brand:input.brand},{familyBrand:input.brand}]}]:[]),...(input.form?[{productForm:input.form}]:[]),...(input.size?[{packLabel:input.size}]:[]),...((input.offers??intent.offers)?[{sale:true}]:[]),
 ...(stock===undefined?[]:[{stock:stock?{$gt:0}:{$lte:0}}]),
 ...(min===undefined&&max===undefined?[]:[{price:{$type:'number',$gte:0}},{$expr:{$and:[...(min===undefined?[]:[{$gte:[currentPriceExpression,min]}]),...(max===undefined?[]:[{$lte:[currentPriceExpression,max]}])]}}]) ]};
}
export const visibleCategoryStages:Document[]=[{$lookup:{from:'categories',localField:'category',foreignField:'_id',as:'category',pipeline:[{$match:{archivedAt:{$exists:false},disabled:{$ne:true}}},{$project:{_id:1,name:1}}]}},{$unwind:'$category'}];
export function semanticAllowed(product:Document){return product.productType==='general'&&product.contentReviewed===true;}

export function reviewedFacetMatch(product:Document,input:SearchInput){
 for(const [filter,field] of [['audience','audience'],['bodyArea','bodyArea'],['concern','concerns'],['feature','features']] as const){
  const wanted=input[filter];if(!wanted)continue;const actual=product.searchDocument?.[field];if(Array.isArray(actual)?!actual.includes(wanted):actual!==wanted)return false;
 }return true;
}

export function searchFamilyKey(product:Document){const profile=familyProfile(product);return profile?JSON.stringify([profile.familyKey,profile.familyName,profile.familyBrand,profile.familyForm,profile.familyStrength].map(v=>v?.normalize('NFKC').trim().toLowerCase()).concat(strengthSignature(String(product.name)))):String(product._id);}
