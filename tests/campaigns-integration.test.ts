import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { growthPageSchema } from '@almina/contracts';
import { saveGrowthPage, saveLegacyGrowthPage } from '../apps/api/src/modules/growth/repository';
import { homepageCampaigns, reviewCampaign } from '../apps/api/src/modules/growth/campaigns';
const uri=process.env.COMMERCE_TEST_URI;
assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1','Disposable database required');
test('campaign merchandising on disposable replica set',{skip:!uri},async t=>{
 assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
 const client=await new MongoClient(uri!).connect(),db=client.db('campaign_test_'+randomUUID().replaceAll('-','')),actor=String(new ObjectId()),previousCloud=process.env.CLOUDINARY_CLOUD_NAME;
 process.env.CLOUDINARY_CLOUD_NAME='synthetic';
 const now=new Date('2026-10-20T12:00:00Z'),category=new ObjectId(),p1=new ObjectId(),p2=new ObjectId();
 const draft=growthPageSchema.parse({kind:'campaign',slug:'daily-care',title:'Daily care',description:'A useful selection',body:'Compare the current available products.',image:'https://res.cloudinary.com/synthetic/image/upload/desktop.webp',mobileImage:'https://res.cloudinary.com/synthetic/image/upload/mobile.webp',imageAlt:'Selected personal care',ctaLabel:'Explore care',terms:'Current prices apply. While stock is available.',homepagePlacement:'hero',productIds:[String(p1),String(p2)]});
 try {
  await db.collection('categories').insertOne({_id:category,name:'Care'});
  await db.collection('products').insertMany([{_id:p1,category,name:'Care one',stock:3,images:['https://res.cloudinary.com/synthetic/image/upload/product.webp']},{_id:p2,category,name:'Care two',stock:0,images:[]}]);
  await t.test('drafts default out, ownership of both artworks is checked and revisions prevent lost edits',async()=>{
   assert.equal(growthPageSchema.parse({kind:'guide',slug:'old-guide',title:'Old guide',description:''}).homepagePlacement,'none');
   const saved=await saveGrowthPage(db,draft,actor);
   assert.deepEqual(await homepageCampaigns(db,'en',now),[]);
   await assert.rejects(saveGrowthPage(db,{...saved,mobileImage:'https://res.cloudinary.com/other/image/upload/pic.webp'},actor),{code:'INVALID_REQUEST'});
   await saveGrowthPage(db,{...saved,published:true},actor);
   await assert.rejects(saveGrowthPage(db,{...saved,title:'Stale edit'},actor),{code:'IDEMPOTENCY_CONFLICT'});
   assert.deepEqual((await homepageCampaigns(db,'en',now))[0]!.productIds,[String(p1),String(p2)]);
   assert.deepEqual(await homepageCampaigns(db,'ar',now),[]);
  });
  await t.test('older admin payloads preserve merchandising, while stale edits still fail',async()=>{
   const current=(await homepageCampaigns(db,'en',now))[0]!;
   // An older admin client knows none of the merchandising fields, including the banner ones added later.
   const {mobileImage,homepagePlacement,priority,ctaLabel,heroLayout,textTone,ctaHref,stripSlot,popupLayout,...legacy}=current;void[mobileImage,homepagePlacement,priority,ctaLabel,heroLayout,textTone,ctaHref,stripSlot,popupLayout];
   const edited=await saveLegacyGrowthPage(db,{...legacy,body:'Legacy editor updates the useful description.'},actor);
   assert.equal(edited.homepagePlacement,'hero');assert.equal(edited.mobileImage,draft.mobileImage);assert.equal(edited.ctaLabel,draft.ctaLabel);
   await assert.rejects(saveLegacyGrowthPage(db,legacy,actor),{code:'IDEMPOTENCY_CONFLICT'});
  });
  await t.test('scheduled/expired pages are excluded, priorities are stable and secondary slots stay separate',async()=>{
   for(const [slug,priority,startsAt,endsAt,homepagePlacement] of [
    ['top',90,null,null,'hero'],['a-tie',20,null,null,'hero'],['z-tie',20,null,null,'hero'],
    ['future',100,'2026-10-21T00:00:00.000Z',null,'hero'],['expired',100,null,now.toISOString(),'hero'],['supporting',0,null,null,'secondary'],
   ] as const)await saveGrowthPage(db,{...draft,slug,priority,startsAt,endsAt,homepagePlacement,published:true},actor);
   const pages=await homepageCampaigns(db,'en',now);
   assert.deepEqual(pages.filter(page=>page.homepagePlacement==='hero').map(page=>page.slug),['top','a-tie','z-tie','daily-care']);
   assert.equal(pages.filter(page=>page.homepagePlacement==='secondary').length,1);
   await db.collection('products').updateOne({_id:p1},{$set:{stock:0}});assert.deepEqual(await homepageCampaigns(db,'en',now),[]);
   await db.collection('products').updateOne({_id:p1},{$set:{stock:3}});
   await db.collection('categories').updateOne({_id:category},{$set:{disabled:true}});assert.deepEqual(await homepageCampaigns(db,'en',now),[]);
   await db.collection('categories').updateOne({_id:category},{$set:{disabled:false}});
  });
  await t.test('readiness detects missing/hidden/out-of-stock products and photos without changing data',async()=>{
   const missing=String(new ObjectId()),before=await db.collection('products').find({}).toArray();
   const review=await reviewCampaign(db,{...draft,mobileImage:'',productIds:[String(p1),String(p2),missing],endsAt:now.toISOString()},now);
   assert.ok(review.warnings.some(w=>w.code==='expired'));
   assert.ok(review.warnings.some(w=>w.code==='missing-mobile-artwork'));
   assert.ok(review.warnings.some(w=>w.code==='out-of-stock'&&w.productId===String(p2)));
   assert.ok(review.warnings.some(w=>w.code==='missing-photo'&&w.productId===String(p2)));
   assert.ok(review.warnings.some(w=>w.code==='product-unavailable'&&w.productId===missing));
   assert.deepEqual(await db.collection('products').find({}).toArray(),before);
   await db.collection('products').updateOne({_id:p1},{$set:{published:false}});
   assert.ok((await reviewCampaign(db,draft,now)).warnings.some(w=>w.code==='product-unavailable'&&w.productId===String(p1)));
  });
  await t.test('homepage result and diagnostics stay bounded for a large campaign set',async()=>{
   await db.collection('products').updateOne({_id:p1},{$set:{published:true}});
   for(let i=0;i<15;i++)await saveGrowthPage(db,{...draft,slug:'extra-'+i,published:true},actor);
   const pages=await homepageCampaigns(db,'en',now);assert.equal(pages.filter(p=>p.homepagePlacement==='hero').length,8);assert.equal(pages.length,9);
  });
 } finally {if(previousCloud===undefined)delete process.env.CLOUDINARY_CLOUD_NAME;else process.env.CLOUDINARY_CLOUD_NAME=previousCloud;await db.dropDatabase();await client.close();}
});
