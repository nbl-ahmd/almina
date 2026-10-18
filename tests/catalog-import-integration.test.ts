import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {MongoClient,ObjectId} from 'mongodb';
import {previewCatalogImport,commitCatalogImport,rollbackCatalogImport,catalogImportColumns,catalogImportReport} from '../apps/api/src/modules/catalog/import';
import {toggleCatalogVisibility} from '../apps/api/src/modules/media/metadata';
import {updateProductInventory} from '../apps/api/src/modules/inventory/adjustments';
import {catalogExportPage} from '../apps/api/src/modules/catalog/export';
import {retainedProductList} from '../apps/api/src/modules/catalog/compatibility-reads';
import {catalogueNeedsAction} from '../apps/api/src/modules/catalog/needs-action';
import {migrateCommerce} from '../scripts/migrations/commerce';
const uri=process.env.COMMERCE_TEST_URI;
test('needs action paginates drafts, separates identity/classification/Rx and excludes live or archived products',{skip:!uri},async()=>{
  assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client=await new MongoClient(uri!).connect(),db=client.db('almina_review_'+randomUUID().replaceAll('-',''));
  try{
    const base={name:'Synthetic product',published:false,disabled:true,brand:'Example',saleUnit:'Bottle',packLabel:'100 ml',description:'Verified synthetic information',contentReviewed:true,stockVerified:true,imageRights:'authorized',cloudinaryImages:['https://res.cloudinary.com/synthetic/image/upload/v1/item.webp']};
    await db.collection('products').insertMany([
      {...base,product_id:'PD1',name:'...Mxmn',productType:'unreviewed'},
      {...base,product_id:'PD2',name:'Synthetic Rx',productType:'prescription'},
      {...base,product_id:'PD3',name:'Synthetic [brackets]',productType:'general',contentReviewed:false,cloudinaryImages:[]},
      {...base,product_id:'PD4',productType:'general',published:true,disabled:false},
      {...base,product_id:'PD5',archivedAt:new Date()},
    ]);
    const first=await catalogueNeedsAction(db,{limit:'2'});assert.equal(first.total,3);assert.equal(first.items.length,2);
    const second=await catalogueNeedsAction(db,{limit:'2',offset:'2'});assert.equal(second.items.length,1);assert.notEqual(String(second.items[0]._id),String(first.items[0]._id));
    for(const [reason,id] of [['identity','PD1'],['classification','PD1'],['prescription','PD2'],['content','PD3'],['images','PD3']] as const){
      const result=await catalogueNeedsAction(db,{reason});assert.equal(result.total,1,reason);assert.equal(result.items[0].product_id,id);
    }
    const exact=await catalogueNeedsAction(db,{q:'[brackets]'});assert.equal(exact.total,1);assert.equal(exact.items[0].product_id,'PD3');
    assert.equal((await catalogueNeedsAction(db,{q:'PD1'})).items[0].product_id,'PD1');
    assert.ok((await catalogueNeedsAction(db,{reason:'identity'})).items[0].reasons.includes('Complete product name / identity'));
    for(const raw of [{limit:'101'},{limit:['2']},{offset:'10001'},{reason:'$where'},{filter:'{}'},{q:['bad']}])await assert.rejects(catalogueNeedsAction(db,raw),{status:400});
    assert.equal(await db.collection('products').countDocuments(),5); // Read-only queue.
  }finally{await db.dropDatabase();await client.close();}
});
assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1','Disposable DB required');
test('draft import validates gross VAT, source identity, replay, stale edits, publication review and rollback against real MongoDB',{skip:!uri},async()=>{
  assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client=await new MongoClient(uri!).connect(),db=client.db('almina_catalog_import_'+randomUUID().replaceAll('-',''));
  const actor=String(new ObjectId()),category=new ObjectId();
  const row={sourceKey:'erp-row-1',name:'Synthetic sample',categoryId:String(category),barcode:'',sourcePrice:'10.00',vatPercent:'5',price:'10.50',websiteStockProposed:4,description:'Verified synthetic product',brand:'Synthetic',saleUnit:'One bottle',packLabel:'100 ml',productType:'general',condition:'new',identifierStatus:'not-assigned'};
  const input=(rows:unknown[])=>({namespace:'synthetic-erp',format:'json',content:JSON.stringify(rows)});
  try{
    await db.collection('stores').insertOne({status:'open'});await db.collection('categories').insertOne({_id:category,name:'Synthetic'});await migrateCommerce(db);
    const bad=await previewCatalogImport(db,input([{...row,price:'10.00'}]),actor);assert.equal(bad.errors[0]!.field,'price');assert.equal(await db.collection('products').countDocuments(),0);
    const missing=await previewCatalogImport(db,input([{...row,categoryId:'',sourceCategory:'ERP group'}]),actor);assert.deepEqual(missing.unmappedCategories,['ERP group']);
    const badStock=await previewCatalogImport(db,input([{...row,sourceStock:'0'}]),actor);assert.equal(badStock.errors[0]!.field,'websiteStockProposed');
    const family={familyKey:'sample-family',familyName:'Sample',familyBrand:'Synthetic',familyForm:'Bottle',familyStrength:'not-applicable',variantSize:'100 ml'};
    const duplicateFamily=await previewCatalogImport(db,input([{...row,...family},{...row,...family,sourceKey:'another-row'}]),actor);assert.equal(duplicateFamily.errors[0]!.field,'familyKey');assert.equal(await db.collection('products').countDocuments(),0);
    const preview=await previewCatalogImport(db,input([row]),actor);assert.ok(preview.previewId);
    await Promise.all([commitCatalogImport(db,{previewId:preview.previewId},actor),commitCatalogImport(db,{previewId:preview.previewId},actor)]);
    assert.equal(await db.collection('products').countDocuments(),1);let product=(await db.collection('products').findOne())!;
    assert.equal(product.disabled,true);assert.equal(product.published,false);assert.equal(product.stock,4);assert.equal(product.websiteStockProposed,4);assert.equal(product.price,10.5);assert.equal(product.vat,true);assert.equal(product.barcode,'');
    await assert.rejects(toggleCatalogVisibility(db,'products',String(product._id),actor),{code:'CATALOG_REVIEW_REQUIRED'});
    const again=await previewCatalogImport(db,input([{...row,summary:'Updated draft'}]),actor);assert.equal(again.rows[0]!.action,'update');
    await commitCatalogImport(db,{previewId:again.previewId},actor);assert.equal(await db.collection('products').countDocuments(),1);
    const updated=(await db.collection('products').findOne())!;
    assert.ok(updated.category instanceof ObjectId);assert.equal(String(updated.category),String(category));
    const listing=await retainedProductList(db,{filter:{},limit:10,offset:0,q:undefined,disabledCategory:undefined},true);
    assert.equal(String(listing[0]!.category._id),String(category));
    await rollbackCatalogImport(db,{previewId:again.previewId},actor);assert.equal((await db.collection('products').findOne())!.summary,undefined);
    const stale=await previewCatalogImport(db,input([{...row,summary:'Stale change'}]),actor);
    await updateProductInventory(db,String(product._id),{description:'Staff edited description'},actor);
    await assert.rejects(commitCatalogImport(db,{previewId:stale.previewId},actor),{code:'STOCK_CHANGED'});
    await assert.rejects(rollbackCatalogImport(db,{previewId:preview.previewId},actor),{code:'STOCK_CHANGED'});
    assert.equal((await catalogExportPage(db,{channel:'google'})).products.length,0);
    await updateProductInventory(db,String(product._id),{stock:4,expectedStock:4,stockReason:'Physical count verified',inventoryKey:randomUUID(),stockVerified:true,contentReviewed:true,imageRights:'authorized',googleApproved:true,metaApproved:true},actor);
    await db.collection('products').updateOne({_id:product._id},{$set:{cloudinaryImages:['https://res.cloudinary.com/synthetic/image/upload/v1/item.webp']}});
    await toggleCatalogVisibility(db,'products',String(product._id),actor);
    product=(await db.collection('products').findOne())!;assert.equal(product.disabled,false);assert.equal(product.published,true);
    assert.equal((await catalogExportPage(db,{channel:'google'})).products.length,1);
    const live=await previewCatalogImport(db,input([row]),actor);assert.equal(live.errors[0]!.field,'sourceKey');
    const second=await previewCatalogImport(db,input([{...row,sourceKey:'erp-row-2'}]),actor);await commitCatalogImport(db,{previewId:second.previewId},actor);
    await rollbackCatalogImport(db,{previewId:second.previewId},actor);assert.equal(await db.collection('products').countDocuments({archivedAt:{$exists:true}}),1);
    assert.equal((await rollbackCatalogImport(db,{previewId:second.previewId},actor))!.complete,true);
    const fullCsv=catalogImportColumns.join(',')+'\r\n'+Array.from({length:7137},(_,index)=>catalogImportColumns.map(key=>String(({...row,sourceKey:`scale-${index}`,sourceStock:'4'} as Record<string,unknown>)[key]??'')).join(',')).join('\r\n');
    const full=await previewCatalogImport(db,{namespace:'scale-test',format:'csv',content:fullCsv},actor);assert.ok(full.previewId);assert.equal(full.total,7137);assert.equal(full.rows.length,50);assert.ok(Buffer.byteLength(JSON.stringify(full))<1024*1024);
    const report=await catalogImportReport(db,{previewId:full.previewId},actor);assert.equal(report.report.length,500);assert.equal(report.nextOffset,500);
    const bulk=await previewCatalogImport(db,input(Array.from({length:205},(_,index)=>({...row,sourceKey:`bulk-${index}`}))),actor);assert.ok(bulk.previewId);
    const chunks=await Promise.all([commitCatalogImport(db,{previewId:bulk.previewId},actor),commitCatalogImport(db,{previewId:bulk.previewId},actor)]);assert.deepEqual(chunks.map(chunk=>chunk!.processed).sort((a,b)=>a-b),[100,200]);
    assert.equal((await commitCatalogImport(db,{previewId:bulk.previewId},actor))!.processed,205);assert.equal(await db.collection('catalog_sources').countDocuments({namespace:'synthetic-erp'}),206);
    let rollbackCalls=0;while(!(await rollbackCatalogImport(db,{previewId:bulk.previewId},actor))!.complete){rollbackCalls++;assert.ok(rollbackCalls<5);}assert.equal(rollbackCalls,2);
    assert.equal(await db.collection('catalog_sources').countDocuments({namespace:'synthetic-erp'}),1);

    const blankChoices=await previewCatalogImport(db,input(['blank-choices','blank-choices-2'].map(sourceKey=>({...row,sourceKey,condition:'',identifierStatus:'',imageRights:'',productType:''}))),actor);
    assert.ok(blankChoices.previewId);
    await assert.rejects(commitCatalogImport(db,{previewId:blankChoices.previewId},actor,undefined,101),{code:'INVALID_REQUEST'});
    const smallChunk=await commitCatalogImport(db,{previewId:blankChoices.previewId},actor,undefined,1);
    assert.equal(smallChunk!.complete,false);assert.equal(smallChunk!.processed,1);
    assert.equal((await commitCatalogImport(db,{previewId:blankChoices.previewId},actor))!.complete,true);
    const blankMapping=await db.collection('catalog_sources').findOne({sourceKey:'blank-choices'});
    const blankProduct=await db.collection('products').findOne({_id:blankMapping!.productId});
    assert.equal(blankProduct!.condition,undefined);assert.equal(blankProduct!.productType,undefined);
    assert.equal(blankProduct!.published,false);assert.equal(blankProduct!.stockVerified,false);
    const openingLedger=await db.collection('inventory_adjustments').find({productId:blankProduct!._id}).toArray();
    assert.equal(openingLedger.length,1);assert.equal(openingLedger[0]!.before,0);assert.equal(openingLedger[0]!.after,4);assert.equal(openingLedger[0]!.delta,4);
    await rollbackCatalogImport(db,{previewId:blankChoices.previewId},actor);

  }finally{await db.dropDatabase();await client.close();}
});
