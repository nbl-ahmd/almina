import { createHash } from 'node:crypto';
import { ObjectId, BSON, type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { productContentSchema, storePublicationIssues } from '@almina/contracts';
import { moneyMinor } from '../../apps/api/src/modules/orders/commerce';

export function catalogueRevision(document: Document): string {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])) : value;
  return createHash('sha256').update(JSON.stringify(canonical(BSON.EJSON.serialize(document,{relaxed:false})))).digest('hex');
}
const id = z.string().regex(/^[a-f0-9]{24}$/i);
const rowSchema = z.object({id, name:z.string().min(1).max(500), categoryId:id, expectedRevision:z.string().regex(/^[a-f0-9]{64}$/), fields:productContentSchema.extend({description:z.string().max(4000)}).strict()}).strict();
const manifestSchema = z.object({runId:z.string().regex(/^[a-z0-9-]{8,100}$/),approvalReference:z.string().min(10).max(500),rows:z.array(rowSchema).min(1).max(25)}).strict();

/** Operator-only, additive backfill. No HTTP endpoint; requires a reviewed immutable manifest. */
export async function publishReviewedCatalogue(db: Db, input: unknown, actor: string) {
  const manifest = manifestSchema.parse(input);
  if(!ObjectId.isValid(actor)||new Set(manifest.rows.map(row=>row.id)).size!==manifest.rows.length)throw new Error('Invalid review manifest');
  const session=db.client.startSession();let applied=0,replayed=0;
  try{
    await session.withTransaction(async()=>{
      applied=0;replayed=0;
      const administrator=await db.collection('users').findOne({_id:new ObjectId(actor),role:'admin'},{session});
      if(!administrator)throw new Error('Administrator required');
      const receipts=db.collection<Document & {_id:string}>('catalog_publication_changes');
      for(const row of manifest.rows){
        const receiptId=manifest.runId+':'+row.id,digest=catalogueRevision(row);
        const receipt=await receipts.findOne({_id:receiptId},{session});
        if(receipt){if(receipt.digest!==digest||receipt.actor!==actor)throw new Error('Publication replay conflict');replayed++;continue;}
        const product=await db.collection('products').findOne({_id:new ObjectId(row.id)},{session});
        if(!product||catalogueRevision(product)!==row.expectedRevision||product.name!==row.name)throw new Error('Product changed since review');
        if(product.catalogManaged!==true||product.published!==false||product.disabled!==true||'archivedAt' in product||product.active===false||product.stockVerified!==true||!Number.isSafeInteger(product.stock)||product.stock<=0)throw new Error('Reviewed active draft required');
        const next: Document={...product,...row.fields};
        const price=moneyMinor(next.price);
        if(next.sale===true&&(next.salePrice===undefined||moneyMinor(next.salePrice)>price))throw new Error('Invalid catalogue price');
        if(storePublicationIssues(next).length)throw new Error('Publication review incomplete');
        const category=await db.collection('categories').findOne({_id:new ObjectId(row.categoryId),archivedAt:{$exists:false}},{session});
        if(!category)throw new Error('Reviewed category missing');
        if(category.disabled!==undefined&&typeof category.disabled!=='boolean')throw new Error('Invalid category state');
        if(category.disabled===true){await db.collection('categories').updateOne({_id:category._id},{$set:{disabled:false}},{session});await db.collection('catalog_audit').insertOne({entityId:category._id,collection:'categories',actor,before:{disabled:true},after:{disabled:false},reason:manifest.approvalReference,createdAt:new Date()},{session});}
        const fields={...row.fields,category:category._id,published:true,disabled:false,updatedAt:new Date()};
        await db.collection('products').updateOne({_id:product._id},{$set:fields},{session});
        const after=await db.collection('products').findOne({_id:product._id},{session});
        if(!after||after.price!==product.price||after.stock!==product.stock||after.vat!==product.vat)throw new Error('Commercial verification failed');
        await receipts.insertOne({_id:receiptId,digest,actor,before:product,afterRevision:catalogueRevision(after),createdAt:new Date()},{session});
        await db.collection('catalog_audit').insertOne({entityId:product._id,collection:'products',actor,before:Object.fromEntries(Object.keys(fields).map(key=>[key,product[key]??null])),after:fields,reason:manifest.approvalReference,createdAt:new Date()},{session});
        applied++;
      }
    },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
    return {applied,replayed};
  }finally{await session.endSession();}
}
