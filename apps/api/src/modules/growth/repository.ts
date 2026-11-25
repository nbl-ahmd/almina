import { retailAudienceFilter } from '../catalog/audience.js';
import { ObjectId, type Db, type Document } from 'mongodb';
import { growthPageSchema, pharmacyProfileSchema, campaignImageUrl, type GrowthPage } from '@almina/contracts';
import { HttpError } from '../../errors.js';
const key=(page:Pick<GrowthPage,'kind'|'locale'|'slug'>)=>`${page.locale}:${page.kind}:${page.slug}`;
export async function saveGrowthPage(db:Db,raw:unknown,actor:string) {
  if(!ObjectId.isValid(actor))throw new HttpError(400,'INVALID_REQUEST');
  const parsed=growthPageSchema.safeParse(raw);
  if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
  const page=parsed.data;
  for(const image of [page.image,page.mobileImage])if(image&&!campaignImageUrl(image,process.env.CLOUDINARY_CLOUD_NAME))throw new HttpError(400,'INVALID_REQUEST');
  // A curated bundle must reference a real, visible set of products across at least two categories.
  if(page.bundle){
    const ids=[...new Set(page.productIds)];
    if(ids.length!==page.productIds.length)throw new HttpError(400,'INVALID_REQUEST');
    const rows=await db.collection('products').find({_id:{$in:ids.map(value=>new ObjectId(value))},...retailAudienceFilter,published:{$ne:false},disabled:{$ne:true},archivedAt:{$exists:false}},{maxTimeMS:3000,projection:{category:1}}).toArray();
    if(rows.length!==ids.length||new Set(rows.map(row=>String(row.category))).size<2)throw new HttpError(400,'INVALID_REQUEST');
  }
  const id=key(page),collection=db.collection<Document&{_id:string}>('growth_pages');
  // First creation is atomic through deterministic _id; edits require exact revision.
  try {
    const result=await collection.updateOne({_id:id,revision:page.revision},{$set:{...page,revision:page.revision+1,updatedAt:new Date(),updatedBy:actor}},{upsert:page.revision===0});
    if(!result.matchedCount&&!result.upsertedCount)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');
  } catch(error) { if(error instanceof Error&&'code' in error&&error.code===11000)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');throw error; }
  return {...page,revision:page.revision+1};
}
export async function growthPages(db:Db,admin=false,kind?:string,locale='en',offset=0,customPages=true) {
  // Older clients do not know custom pages, so their lists leave them out.
  const rows=await db.collection('growth_pages').find({...(!admin?{published:true}:{}),...(kind?{kind}:customPages?{}:{kind:{$ne:'page'}}),locale},{maxTimeMS:3000,projection:{_id:0,updatedBy:0,updatedAt:0}}).sort({updatedAt:-1}).skip(offset).limit(51).toArray();
  return {items:rows.slice(0,50).map(row=>growthPageSchema.parse(row)),hasNext:rows.length>50};
}
export async function growthPage(db:Db,kind:string,slug:string,locale:string,admin=false) {
  const row=await db.collection<Document&{_id:string}>('growth_pages').findOne({_id:`${locale}:${kind}:${slug}`,...(!admin?{published:true}:{})},{maxTimeMS:3000,projection:{_id:0,updatedBy:0,updatedAt:0}});
  if(!row)throw new HttpError(404,'NOT_FOUND');
  return growthPageSchema.parse(row);
}
export async function pharmacyProfile(db:Db,admin=false) {
  const row=await db.collection<Document&{_id:string}>('growth_settings').findOne({_id:'pharmacy'},{maxTimeMS:3000});
  const profile=pharmacyProfileSchema.parse(row?Object.fromEntries(Object.keys(pharmacyProfileSchema.shape).map(name=>[name,row[name]])):{});
  return admin||profile.verified?profile:pharmacyProfileSchema.parse({});
}
export async function savePharmacyProfile(db:Db,raw:unknown,actor:string) {
  if(!ObjectId.isValid(actor))throw new HttpError(400,'INVALID_REQUEST');
  const parsed=pharmacyProfileSchema.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
  const value=parsed.data;
  if(value.verified&&(!value.address||!value.openingHours||!value.licence))throw new HttpError(400,'INVALID_REQUEST');
  try {
    const result=await db.collection<Document&{_id:string}>('growth_settings').updateOne({_id:'pharmacy',revision:value.revision},{$set:{...value,revision:value.revision+1,updatedAt:new Date(),updatedBy:actor}},{upsert:value.revision===0});
    if(!result.matchedCount&&!result.upsertedCount)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');
  }catch(error){if(error instanceof Error&&'code' in error&&error.code===11000)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');throw error;}
  return {...value,revision:value.revision+1};
}

/** Old admin tabs edit existing content without silently clearing new merchandising fields. */
export async function saveLegacyGrowthPage(db:Db,raw:unknown,actor:string){
 const parsed=growthPageSchema.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
 const fields=['mobileImage','homepagePlacement','priority','ctaLabel','heroLayout','textTone','ctaHref','stripSlot','popupLayout','sections'] as const;
 if(fields.some(field=>raw&&typeof raw==='object'&&field in raw))throw new HttpError(400,'INVALID_REQUEST');
 const row=await db.collection<Document&{_id:string}>('growth_pages').findOne({_id:key(parsed.data)},{maxTimeMS:3000,projection:Object.fromEntries(fields.map(field=>[field,1]))});
 const kept=Object.fromEntries(fields.flatMap(field=>row?.[field]===undefined?[]:[[field,row[field]]]));
 return saveGrowthPage(db,{...parsed.data,...kept},actor);
}
