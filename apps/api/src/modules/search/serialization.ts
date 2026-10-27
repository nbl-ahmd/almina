import type {Document} from 'mongodb';
import {familyProfile,familyFieldNames} from '@almina/contracts';
import {searchProductSchema} from '@almina/contracts/search';
import {compatibilityProductProjection} from '../catalog/compatibility-reads.js';
export function publicSearchProduct(product:Document){
 const raw=Object.fromEntries(Object.keys(compatibilityProductProjection).filter(key=>product[key]!==undefined&&!['audience','wholesaleAudience','wholesaleTypeIds'].includes(key)&&!familyFieldNames.includes(key as typeof familyFieldNames[number])).map(key=>[key,key==='_id'?String(product[key]):key==='category'?{_id:String(product.category._id),name:String(product.category.name)}:product[key]]));
 const parsed=searchProductSchema.safeParse({...raw,...(familyProfile(product)??{})});return parsed.success?parsed.data:null;
}
