import type { Db, ClientSession, Document } from 'mongodb';
import { productFamilySchema, familyProfile, familyFieldNames, optionFields, sameFamilyIdentity } from '@almina/contracts';
import { HttpError } from '../../errors.js';
/** Serialize family edits with catalog creation; never use barcodes as identity. */
export async function validateFamilyMembership(db: Db, next: Document, session: ClientSession) {
  const fields = Object.fromEntries(familyFieldNames.filter(key=>next[key]!==undefined).map(key=>[key,next[key]]));
  if (!productFamilySchema.safeParse(fields).success) throw new HttpError(400, 'INVALID_REQUEST');
  const profile = familyProfile(next);
  if (!profile) return;
  if(next.brand && String(next.brand).normalize('NFKC').trim().toLowerCase()!==profile.familyBrand!.normalize('NFKC').trim().toLowerCase()) throw new HttpError(409,'PRODUCT_FAMILY_CONFLICT');
  const store = await db.collection('stores').findOne({}, { session });
  if (!store) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  await db.collection('stores').updateOne({_id:store._id}, {$inc:{familyRevision:1}}, {session});
  const members = await db.collection('products').find({familyKey:profile.familyKey,archivedAt:{$exists:false}}, {session, projection:Object.fromEntries(['_id','name','category',...familyFieldNames].map(key=>[key,1]))}).limit(61).toArray();
  const others = members.filter(member=>String(member._id)!==String(next._id));
  if (others.length>=60) throw new HttpError(400,'INVALID_REQUEST');
  for (const member of others) {
    const other = familyProfile(member);
    if (!other || String(member.category)!==String(next.category) || !sameFamilyIdentity({...profile,name:next.name},{...other,name:member.name})
      || optionFields.some(key=>Boolean(profile[key])!==Boolean(other[key]))
      || optionFields.every(key=>(profile[key]??'').toLowerCase()===(other[key]??'').toLowerCase())) throw new HttpError(409,'PRODUCT_FAMILY_CONFLICT');
  }
}
