import { retailAudienceFilter } from '../catalog/audience.js';
import { ObjectId,type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
import { suggestProducts } from './search.js';

const mongoId=z.string().regex(/^[a-f0-9]{24}$/i);
export async function growthProductOptions(db:Db,raw:unknown){
 const input=z.object({q:z.string().trim().min(2).max(80).optional(),ids:z.string().max(24*20+19).optional()}).strict().refine(value=>Boolean(value.q) !== Boolean(value.ids)).safeParse(raw);
 if(!input.success)throw new HttpError(400,'INVALID_REQUEST');
 if(input.data.q)return suggestProducts(db,input.data.q);
 const ids=[...new Set(input.data.ids!.split(',').map(value=>mongoId.safeParse(value).success?value.toLowerCase():'' ).filter(Boolean))].slice(0,20);
 if(!ids.length)return [];
 const rows=await db.collection('products').aggregate<Document>([{$match:{_id:{$in:ids.map(value=>new ObjectId(value))},archivedAt:{$exists:false},disabled:{$ne:true},...retailAudienceFilter,published:{$ne:false},active:{$ne:false}}},{$lookup:{from:'categories',localField:'category',foreignField:'_id',pipeline:[{$match:{archivedAt:{$exists:false},disabled:{$ne:true}}},{$project:{name:1}}],as:'category'}},{$match:{'category.0':{$exists:true}}},{$project:{_id:1,product_id:1,name:1,'category.name':1}},{$limit:20}],{maxTimeMS:2000}).toArray();
 const byId=new Map(rows.map(row=>[String(row._id),{id:String(row._id),name:String(row.name),productId:String(row.product_id),category:String(row.category?.[0]?.name??'')} ]));return ids.flatMap(id=>{const row=byId.get(id);return row?[row]:[];});
}
export async function growthCategoryOptions(db:Db){return db.collection('categories').find({disabled:{$ne:true},archivedAt:{$exists:false}},{maxTimeMS:2000,projection:{name:1}}).sort({name:1,_id:1}).limit(200).toArray().then(rows=>rows.map(row=>({id:String(row._id),name:String(row.name)})));}
