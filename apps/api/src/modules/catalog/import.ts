import { createHash, randomUUID } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { productContentFields, productFamilyFields, validateProductFamily, publicationIssues, cloudinaryImage, familyFieldNames, familyProfile, sameFamilyIdentity, optionFields } from '@almina/contracts';
import { boundedCsvRecords } from '../imports/csv.js';
import { allocateCatalogIds, insertCatalogProduct, catalogCreationInput, catalogProductDocument } from './creation.js';
import { validateFamilyMembership } from './families.js';
import { HttpError } from '../../errors.js';
const cash=z.string().regex(/^\d{1,7}(?:\.\d{1,2})?$/);
const rowSchema=z.object({...productContentFields,...productFamilyFields,sourceKey:z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/),name:z.string().trim().min(1).max(200),categoryId:z.string().regex(/^[a-f0-9]{24}$/i).transform(value=>value.toLowerCase()),sourceCategory:z.string().max(200).optional(),sourcePacking:z.string().max(200).optional(),sourceStock:z.preprocess(value=>value===''?undefined:value,z.string().max(100).regex(/^\d+(?:\.\d+)?$/).optional()),barcode:z.string().max(500).default(''),sourcePrice:cash,vatPercent:z.enum(['0','5']),price:cash,websiteStockProposed:z.coerce.number().int().min(1).max(10),description:z.string().max(4000).default(''),imageUrls:z.string().max(8000).default('')}).strict().superRefine(validateProductFamily);
type Row=z.infer<typeof rowSchema>;
function canonical(value:unknown):unknown {
  if(value instanceof Date)return value.toISOString();
  // Retained and workspace servers can load separate MongoDB driver copies.
  // BSON identity must remain stable across those constructors and DB round trips.
  if(value&&typeof value==='object'&&'_bsontype' in value&&value._bsontype==='ObjectId'&&'toHexString' in value&&typeof value.toHexString==='function')return value.toHexString();
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));return value;
}
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const sourceId=(namespace:string,key:string)=>digest([namespace,key]);
const asMinor=(value:string)=>{const [whole,fraction='']=value.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));};
const previewInput=z.object({namespace:z.string().regex(/^[a-z0-9][a-z0-9_-]{2,79}$/),categoryMapping:z.record(z.string().max(200),z.string().regex(/^[a-f0-9]{24}$/i)).default({}),format:z.enum(['csv','json']),content:z.string().max(4*1024*1024)}).strict();
function inputValue<T extends z.ZodType>(schema:T,raw:unknown):z.infer<T>{const parsed=schema.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');return parsed.data;}
const command=z.object({previewId:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const catalogImportColumns=['sourceKey','name','categoryId','sourceCategory','sourcePacking','sourceStock','barcode','sourcePrice','vatPercent','price','websiteStockProposed','description','brand','saleUnit','packLabel','productType','condition','gtin','identifierStatus','mpn','manufacturer','productForm','strength','summary','ingredients','usage','warnings','storage','seoTitle','seoDescription','familyKey','familyName','familyBrand','familyForm','familyStrength','variantSize','variantFlavour','variantPackSize','imageUrls','imageSource','imageRights','googleProductCategory'];
export const catalogImportTemplate=catalogImportColumns.join(',')+'\r\n';
export function parseCatalogImport(content:string,format:'csv'|'json') {
  if(Buffer.byteLength(content)>4*1024*1024)throw new HttpError(413,'PAYLOAD_TOO_LARGE');
  if(format==='json')return JSON.parse(content) as unknown;
  const records=boundedCsvRecords(content,{bytes:4*1024*1024,columns:60,rows:10000});
  const header=records.shift();
  if(!header||new Set(header).size!==header.length||header.some(key=>!catalogImportColumns.includes(key))||records.some(row=>row.length!==header.length))throw new HttpError(400,'INVALID_REQUEST');
  return records.map(values=>Object.fromEntries(header.map((key,index)=>[key,values[index]??''])));
}
function productValues(row:Row) {
  const {sourceKey:_,sourcePrice:__,vatPercent,price,categoryId,websiteStockProposed, imageUrls:____,sourceCategory:_____,sourcePacking:______,sourceStock:_______,...rest}=row;
  void _;void __;void ____;void _____;void ______;void _______;
  // Review flags and channel approvals can never be imported as permission to publish.
  const parsed=catalogCreationInput({...rest,category:categoryId,price,stock:websiteStockProposed,vat:vatPercent==='5',sale:false,featured:false,contentReviewed:false,stockVerified:false,googleApproved:false,metaApproved:false});
  return Object.fromEntries(Object.entries(parsed).filter(([,value])=>value!==undefined)) as typeof parsed;
}
function images(row:Row,cloudName?:string) {
  const urls=row.imageUrls.split('|').map(value=>value.trim()).filter(Boolean);
  if(urls.length>8||urls.some(url=>!cloudinaryImage(url,cloudName)))throw new HttpError(400,'INVALID_REQUEST');
  return urls;
}
export async function previewCatalogImport(db:Db,raw:unknown,actor:string,cloudName?:string) {
  const input=inputValue(previewInput,raw);
  if(!ObjectId.isValid(actor))throw new HttpError(400,'INVALID_REQUEST');
  let source:unknown;try{source=parseCatalogImport(input.content,input.format);}catch{return {errors:[{row:0,field:'file',message:'Invalid CSV/JSON or file bounds.'}],warnings:[],rows:[]};}
  const unmappedCategories=Array.isArray(source)?[...new Set(source.flatMap(value=>value&&typeof value==='object'&&typeof value.sourceCategory==='string'&&!value.categoryId&&!input.categoryMapping[value.sourceCategory]?[value.sourceCategory]:[]))]:[];
  if(unmappedCategories.length)return {errors:[],warnings:[],rows:[],unmappedCategories};
  if(Array.isArray(source))source=source.map(value=>value&&typeof value==='object'?{...value,categoryId:value.categoryId||input.categoryMapping[value.sourceCategory]}:value);
  const parsed=z.array(rowSchema).min(1).max(10000).safeParse(source);
  if(!parsed.success)return {errors:parsed.error.issues.slice(0,500).map(issue=>({row:Number(issue.path[0]??-1)+1,field:String(issue.path[1]??'row'),message:issue.message})),warnings:[],rows:[]};
  const policy=await db.collection('commerce_policies').findOne({active:true});
  if(!policy||policy.vatMode!=='inclusive'||policy.vatRateBps!==500) throw new HttpError(409,'COMMERCE_UNAVAILABLE');
  const rows=parsed.data, errors:{row:number;field:string;message:string}[]=[], warnings:{row:number;field:string;message:string}[]=[],seen=new Set<string>();
  const categories=await db.collection('categories').find({_id:{$in:[...new Set(rows.map(row=>row.categoryId))].map(id=>new ObjectId(id))},archivedAt:{$exists:false}},{projection:{_id:1},maxTimeMS:3000}).toArray();
  const categoryIds=new Set(categories.map(value=>String(value._id)));
  const mappings=await db.collection<Document & {_id:string}>('catalog_sources').find({_id:{$in:rows.map(row=>sourceId(input.namespace,row.sourceKey))}},{maxTimeMS:5000}).toArray();
  const bySource=new Map(mappings.map(value=>[String(value._id),value]));
  const products=await db.collection('products').find({_id:{$in:mappings.map(value=>value.productId)}},{maxTimeMS:5000}).toArray();
  const byId=new Map(products.map(value=>[String(value._id),value]));
  const baseline:Record<string,string|null>={};
  const report=rows.map((row,index)=>{
    const issue=(field:string,message:string)=>errors.push({row:index+1,field,message});
    if(row.sourceStock!==undefined&&(!Number.isFinite(Number(row.sourceStock))||!(Number(row.sourceStock)>0)||row.websiteStockProposed!==Math.max(1,Math.min(10,Math.floor(Number(row.sourceStock))))))issue('websiteStockProposed','Use 1–10 units from positive ERP stock with the approved floor/cap rule.');
    if(seen.has(row.sourceKey))issue('sourceKey','Duplicate source key.');seen.add(row.sourceKey);
    if(!categoryIds.has(row.categoryId))issue('categoryId','Map to an existing category.');
    const gross=asMinor(row.sourcePrice)+Math.floor((asMinor(row.sourcePrice)*Number(row.vatPercent)+50)/100);
    if(gross!==asMinor(row.price))issue('price','Gross price must equal source price plus VAT rounded once to fils.');
    try{images(row,cloudName);}catch{issue('imageUrls','Use at most eight approved Cloudinary raster image URLs from this account, separated by |.');}
    const mapping=bySource.get(sourceId(input.namespace,row.sourceKey)),existing=mapping?byId.get(String(mapping.productId)):undefined;
    baseline[row.sourceKey]=existing?digest(existing):null;
    if(mapping&&(!existing||existing.catalogManaged!==true||existing.published!==false||existing.disabled!==true||existing.stockVerified===true||existing.stock!==existing.websiteStockProposed||existing.archivedAt))issue('sourceKey','Mapped product is no longer an untouched draft. Use its product editor; do not overwrite reviewed stock or live listings.');
    const missing=publicationIssues({...row,images:row.imageUrls?[row.imageUrls]:[],stockVerified:false,contentReviewed:false});
    if(missing.length)warnings.push({row:index+1,field:'review',message:missing.join('; ')});
    const incoming={...productValues(row),websiteStockProposed:row.websiteStockProposed,cloudinaryImages:row.imageUrls.split('|').filter(Boolean)};
    const changedFields=existing?Object.keys(incoming).filter(key=>JSON.stringify(canonical(existing[key]))!==JSON.stringify(canonical(incoming[key as keyof typeof incoming]))):Object.keys(incoming);
    return {sourceKey:row.sourceKey,name:row.name,changedFields,previousPrice:existing?Number(existing.price).toFixed(2):'',previousStock:existing?.stock??null,action:mapping?'update':'create',productId:existing?.product_id??'',price:row.price,websiteStockProposed:row.websiteStockProposed};
  });
  const familyKeys=[...new Set(rows.map(row=>row.familyKey).filter((key):key is string=>!!key))];
  if(familyKeys.length){
    const replacedIds=new Set(mappings.map(value=>String(value.productId)));
    const retained=await db.collection('products').find({familyKey:{$in:familyKeys},archivedAt:{$exists:false}},{projection:Object.fromEntries(['_id','name','category','brand',...familyFieldNames].map(key=>[key,1])),maxTimeMS:5000}).limit(10001).toArray();
    if(retained.length>10000)errors.push({row:0,field:'familyKey',message:'Split this review into smaller family batches.'});
    const groups=new Map<string,Document[]>();
    for(const item of retained.filter(item=>!replacedIds.has(String(item._id))))groups.set(item.familyKey,[...(groups.get(item.familyKey)??[]),item]);
    rows.forEach((row,index)=>{if(row.familyKey)groups.set(row.familyKey,[...(groups.get(row.familyKey)??[]),{...row,category:row.categoryId,inputRow:index+1}]);});
    const normalize=(value:unknown)=>String(value??'').normalize('NFKC').trim().toLowerCase();
    for(const members of groups.values()){
      const first=members[0]!,identity=familyProfile(first),combinations=new Set<string>();let invalid=members.length>60||!identity;
      for(const member of members){const profile=familyProfile(member),combination=JSON.stringify(optionFields.map(key=>normalize(member[key])));
        if(!profile||!identity||!sameFamilyIdentity({...identity,name:first.name},{...profile,name:member.name})||String(first.category)!==String(member.category)||optionFields.some(key=>Boolean(first[key])!==Boolean(member[key]))||combinations.has(combination)||member.brand&&normalize(member.brand)!==normalize(profile.familyBrand))invalid=true;
        combinations.add(combination);
      }
      if(invalid)for(const member of members.filter(item=>item.inputRow))errors.push({row:member.inputRow,field:'familyKey',message:'Family exceeds 60 SKUs, has duplicate combinations, or mixes category, brand, form, strength or option axes.'});
    }
  }
  if(errors.length)return {errors:errors.slice(0,500),warnings:warnings.slice(0,500),rows:report.slice(0,50),total:rows.length};
  const previewId=digest([actor,input.namespace,rows,baseline,randomUUID()]);
  // Blank optional CSV choices parse to undefined. Preserve their absence through
  // BSON storage so a later commit does not receive invalid null enum values.
  await db.collection<Document & {_id:string}>('catalog_imports').updateOne({_id:previewId},{$setOnInsert:{actor,namespace:input.namespace,rows,baseline,report,offset:0,createdAt:new Date(),expiresAt:new Date(Date.now()+86400000),status:'preview'}},{upsert:true,ignoreUndefined:true});
  return {previewId,errors:[],warnings:warnings.slice(0,500),rows:report.slice(0,50),total:rows.length};
}
export async function commitCatalogImport(db:Db,raw:unknown,actor:string,cloudName?:string,chunkSize=100) {
  // Remote maintenance callers can reduce round trips per transaction without
  // changing the public endpoint's bounded default or resumable offset logic.
  const limit=inputValue(z.number().int().min(1).max(100),chunkSize);
  const {previewId}=inputValue(command,raw); if(!ObjectId.isValid(actor))throw new HttpError(400,'INVALID_REQUEST');
  const session=db.client.startSession();let result:Document|undefined;
  try{await session.withTransaction(async()=>{
    const batch=await db.collection<Document & {_id:string}>('catalog_imports').findOne({_id:previewId,actor},{session});
    if(!batch||(batch.offset===0&&batch.expiresAt<new Date()))throw new HttpError(409,'INVALID_REQUEST');
    if(['rolled-back','rolling-back'].includes(batch.status))throw new HttpError(409,'INVALID_REQUEST');
    if(batch.offset>=batch.rows.length){result={previewId,processed:batch.offset,total:batch.rows.length,complete:true};return;}
    const store=await db.collection('stores').findOne({},{session});if(!store)throw new HttpError(503,'SERVICE_UNAVAILABLE');
    await db.collection('stores').updateOne({_id:store._id},{$inc:{catalogRevision:1}},{session});
    const policy=await db.collection('commerce_policies').findOne({active:true},{session});
    if(!policy||policy.vatMode!=='inclusive'||policy.vatRateBps!==500)throw new HttpError(409,'COMMERCE_UNAVAILABLE');
    const chunk=(batch.rows as Row[]).slice(batch.offset,batch.offset+limit);
    const ids=chunk.some(row=>batch.baseline[row.sourceKey]===null)?await allocateCatalogIds(db,chunk.filter(row=>batch.baseline[row.sourceKey]===null).length,0,session):[];
    // Initial, independent drafts can be validated and inserted together. Keep
    // family membership and updates on the existing per-product path. This
    // avoids hundreds of network round trips inside Atlas's transaction limit.
    const bulkInitial=chunk.every(row=>batch.baseline[row.sourceKey]===null&&!row.familyKey);
    if(bulkInitial){
      const keys=chunk.map(row=>sourceId(batch.namespace,row.sourceKey));
      if(await db.collection<Document & {_id:string}>('catalog_sources').findOne({_id:{$in:keys}},{session}))throw new HttpError(409,'STOCK_CHANGED');
      const categoryIds=[...new Set(chunk.map(row=>row.categoryId))].map(id=>new ObjectId(id));
      const categories=await db.collection('categories').find({_id:{$in:categoryIds},archivedAt:{$exists:false}},{session,projection:{_id:1}}).toArray();
      if(categories.length!==categoryIds.length)throw new HttpError(400,'INVALID_REQUEST');
      const products=chunk.map((row,index)=>{
        const values=productValues(row);
        return {...catalogProductDocument(values,ids[index]!,new ObjectId(row.categoryId)),catalogManaged:true,published:false,disabled:true,websiteStockProposed:row.websiteStockProposed,cloudinaryImages:images(row,cloudName),updatedAt:new Date()};
      });
      // Still validate family fields (including partial/invalid metadata) before
      // any write; an independent product performs no family query.
      for(const product of products)await validateFamilyMembership(db,product,session);
      await db.collection('products').insertMany(products,{session});
      await db.collection<Document & {_id:string}>('inventory_adjustments').insertMany(products.map((product,index)=>({_id:randomUUID(),productId:product._id,product_id:product.product_id,actor,reason:'Initial catalog stock',delta:chunk[index]!.websiteStockProposed,before:0,after:chunk[index]!.websiteStockProposed,createdAt:new Date()})),{session});
      await db.collection<Document & {_id:string}>('catalog_sources').insertMany(products.map((product,index)=>({_id:keys[index]!,namespace:batch.namespace,sourceKey:chunk[index]!.sourceKey,productId:product._id,createdAt:new Date()})),{session});
      await db.collection<Document & {_id:string}>('catalog_import_changes').insertMany(products.map((product,index)=>{const row=chunk[index]!;return {_id:digest([previewId,row.sourceKey]),previewId,sourceId:keys[index]!,productId:product._id,actor,previous:null,afterDigest:digest(product),sourcePrice:row.sourcePrice,vatPercent:row.vatPercent,sourcePacking:row.sourcePacking??null,sourceStock:row.sourceStock??null,createdAt:new Date()};}),{session});
    }else for(const row of chunk){
      const key=sourceId(batch.namespace,row.sourceKey),mapping=await db.collection<Document & {_id:string}>('catalog_sources').findOne({_id:key},{session});
      const previous=mapping?await db.collection('products').findOne({_id:mapping.productId},{session}):null;
      if((previous?digest(previous):null)!==batch.baseline[row.sourceKey])throw new HttpError(409,'STOCK_CHANGED');
      const values=productValues(row),cloudinaryImages=images(row,cloudName);
      const managed={catalogManaged:true,published:false,disabled:true,websiteStockProposed:row.websiteStockProposed,cloudinaryImages,updatedAt:new Date()};
      let product:Document;
      if(previous){
        if(previous.stockVerified===true||previous.stock!==previous.websiteStockProposed||previous.published!==false||!previous.disabled||previous.archivedAt)throw new HttpError(409,'STOCK_CHANGED');
        product={...previous,...values,category:new ObjectId(row.categoryId),...managed};await validateFamilyMembership(db,product,session);
        await db.collection('products').replaceOne({_id:previous._id},product,{session});
        if(product.stock!==previous.stock)await db.collection<Document & {_id:string}>('inventory_adjustments').insertOne({_id:randomUUID(),productId:product._id,product_id:product.product_id,actor,reason:'Reviewed draft import proposed stock',before:previous.stock,after:product.stock,delta:product.stock-previous.stock,createdAt:new Date()},{session});
      }else{
        product=await insertCatalogProduct(db,values,ids.shift()!,actor,session);
        product={...product,...managed};await db.collection('products').updateOne({_id:product._id},{$set:managed},{session});
        await db.collection<Document & {_id:string}>('catalog_sources').insertOne({_id:key,namespace:batch.namespace,sourceKey:row.sourceKey,productId:product._id,createdAt:new Date()},{session});
      }
      await db.collection<Document & {_id:string}>('catalog_import_changes').insertOne({_id:digest([previewId,row.sourceKey]),previewId,sourceId:key,productId:product._id,actor,previous,afterDigest:digest(product),sourcePrice:row.sourcePrice,vatPercent:row.vatPercent,sourcePacking:row.sourcePacking??null,sourceStock:row.sourceStock??null,createdAt:new Date()},{session});
    }
    const offset=batch.offset+chunk.length;
    await db.collection<Document & {_id:string}>('catalog_imports').updateOne({_id:previewId},{$set:{offset,status:offset===batch.rows.length?'complete':'importing'}},{session});
    result={previewId,processed:offset,total:batch.rows.length,complete:offset===batch.rows.length};
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});return result;}finally{await session.endSession();}
}
export async function catalogImportReport(db:Db,raw:unknown,actor:string) {
  const {previewId,offset}=inputValue(z.object({previewId:z.string().regex(/^[a-f0-9]{64}$/),offset:z.number().int().min(0).max(10000).default(0)}).strict(),raw);
  const batch=await db.collection<Document & {_id:string}>('catalog_imports').findOne({_id:previewId,actor},{projection:{rows:0,baseline:0},maxTimeMS:3000});
  if(!batch)throw new HttpError(404,'NOT_FOUND');
  return {previewId,namespace:batch.namespace,status:batch.status,total:batch.report.length,processed:batch.offset,report:batch.report.slice(offset,offset+500),nextOffset:offset+500<batch.report.length?offset+500:null};
}
export async function rollbackCatalogImport(db:Db,raw:unknown,actor:string) {
  const {previewId}=inputValue(command,raw),session=db.client.startSession();let result:Document|undefined;
  try{await session.withTransaction(async()=>{
    const batch=await db.collection<Document & {_id:string}>('catalog_imports').findOne({_id:previewId,actor},{session});if(!batch)throw new HttpError(404,'NOT_FOUND');
    if(batch.status==='rolled-back'){result={complete:true,rolledBack:0};return;}
    const store=await db.collection('stores').findOne({},{session});if(!store)throw new HttpError(503,'SERVICE_UNAVAILABLE');
    await db.collection('stores').updateOne({_id:store._id},{$inc:{catalogRevision:1}},{session});
    const changes=await db.collection<Document & {_id:string}>('catalog_import_changes').find({previewId,rolledBack:{$ne:true}},{session}).sort({_id:1}).limit(100).toArray();
    for(const change of changes){
      const current=await db.collection('products').findOne({_id:change.productId},{session});
      if(!current||digest(current)!==change.afterDigest||current.stockVerified===true||current.stock!==current.websiteStockProposed||current.published!==false||!current.disabled)throw new HttpError(409,'STOCK_CHANGED');
      if(change.previous){if(change.previous.stock!==current.stock)await db.collection<Document & {_id:string}>('inventory_adjustments').insertOne({_id:randomUUID(),productId:current._id,product_id:current.product_id,actor,reason:'Draft catalog import rollback',before:current.stock,after:change.previous.stock,delta:change.previous.stock-current.stock,createdAt:new Date()},{session});await validateFamilyMembership(db,change.previous,session);await db.collection('products').replaceOne({_id:current._id},change.previous,{session});}
      else{await db.collection('products').updateOne({_id:current._id},{$set:{archivedAt:new Date(),disabled:true,published:false}},{session});await db.collection<Document & {_id:string}>('catalog_sources').deleteOne({_id:change.sourceId,productId:current._id},{session});}
      await db.collection<Document & {_id:string}>('catalog_import_changes').updateOne({_id:change._id},{$set:{rolledBack:true,rolledBackAt:new Date()}},{session});
    }
    const left=await db.collection<Document & {_id:string}>('catalog_import_changes').countDocuments({previewId,rolledBack:{$ne:true}},{session});
    await db.collection<Document & {_id:string}>('catalog_imports').updateOne({_id:previewId},{$set:{status:left?'rolling-back':'rolled-back'}},{session});result={complete:left===0,rolledBack:changes.length};
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});return result;}finally{await session.endSession();}
}
