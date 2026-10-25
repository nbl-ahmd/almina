import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MongoClient, ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { retainedCatalogQuery, retainedProductList } from '../apps/api/src/modules/catalog/compatibility-reads';
const uri=process.env.COMMERCE_TEST_URI;
test('catalogue ranks intent before merchandising, preserves explicit sorting and filters visibility before pagination',{skip:!uri},async()=>{
 assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
 const client=await new MongoClient(uri!).connect(),db=client.db(`almina_ranking_${randomUUID().replaceAll('-','')}`),category=new ObjectId();
 try{
  await db.collection('categories').insertOne({_id:category,name:'Personal care'});
  const common={category,disabled:false,published:true,price:20,stock:2};
  await db.collection('products').insertMany([
   {...common,name:'Daily wash',product_id:'PD9001'},
   {...common,name:'Daily wash gentle',product_id:'PD9002',featured:true,stock:10},
   {...common,name:'Care set',product_id:'PD9003',description:'Includes Daily wash',featured:true,stock:1000},
   {...common,name:'Daily wash',product_id:'PD9004',stock:0},
   {...common,name:'Care first',product_id:'PD9005',brand:'Clearbrand',barcode:'123456789',cloudinaryImages:['https://example.invalid/photo.webp']},
   {...common,name:'Cheap care',product_id:'PD9006',sale:true,salePrice:5},
   {...common,name:'Daily wash',product_id:'PD9007',published:false,featured:true},
   {...common,name:'Daily wash',product_id:'PD9008',audience:'wholesale',featured:true},
   {...common,name:'Literal [wash]',product_id:'PD9009',gtin:123},
  ]);
  const read=(params:Record<string,string>={},staff=false)=>retainedProductList(db,retainedCatalogQuery(params,params.q?'search':'products'),staff);
  const found=await read({q:'Daily wash'});
  assert.deepEqual(found.map(p=>p.product_id),['PD9001','PD9004','PD9002','PD9003']);
  assert.equal((await read({q:'Clearbrand'}))[0]!.product_id,'PD9005');
  assert.equal((await read({q:'123456789'}))[0]!.product_id,'PD9005');
  assert.equal((await read({q:'PD9005'}))[0]!.product_id,'PD9005');
  assert.equal((await read({q:'[wash]'}))[0]!.product_id,'PD9009');
  const browse=await read();assert.equal(browse[0]!.product_id,'PD9003'); // Both featured: stable name, not quantity.
  await db.collection('products').updateOne({product_id:'PD9002'},{$set:{stock:99999}});
  assert.deepEqual((await read()).map(p=>p.product_id),browse.map(p=>p.product_id));
  assert.equal((await read({sort:'price-asc'}))[0]!.product_id,'PD9006');
  assert.equal((await read({inStock:'true',q:'Daily wash'})).some(p=>p.product_id==='PD9004'),false);
  const first=await read({limit:'2'}),second=await read({limit:'2',offset:'2'});
  assert.equal(new Set([...first,...second].map(p=>String(p._id))).size,4);
  assert.equal((await read({},true))[0]!.product_id,'PD9002'); // Existing staff stock sort preserved.
 }finally{await db.dropDatabase();await client.close();}
});
