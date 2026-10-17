import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ObjectId } from 'mongodb';
import { familyProfile, productFamilySchema, sameFamilyIdentity, strengthSignature } from '@almina/contracts';
import { readProduct } from '../apps/web/src/lib/catalog/model';
import { productData, serializeJsonLd } from '../apps/web/src/lib/seo';
import { calculateQuote } from '../apps/api/src/modules/orders/commerce';
import { legacyOrderDto } from '../apps/api/src/modules/orders/legacy-dto';
import { approvedPolicy } from '../scripts/migrations/commerce';

const family = { familyKey:'support-knee', familyName:'Synthetic knee support', familyBrand:'Synthetic', familyForm:'Support', familyStrength:'not-applicable', variantSize:'Small' };
const sku = { _id:'b'.repeat(24), product_id:'PD1', name:'Synthetic knee support', price:25, stock:4, category:{_id:'a'.repeat(24),name:'Supports'}, ...family };
test('families require verified identity and options; legacy products remain readable',()=>{
  assert.ok(productFamilySchema.safeParse(family).success);
  for(const key of ['familyKey','familyName','familyBrand','familyForm','familyStrength','variantSize']) {
    const invalid={...family,[key]:''}; assert.equal(productFamilySchema.safeParse(invalid).success,false,key);
  }
  assert.equal(familyProfile({familyKey:'broken'}),null);
  assert.equal(readProduct({...sku,familyKey:'broken',familyBrand:''})?.product_id,'PD1');
  assert.equal(readProduct({...sku,familyKey:'broken',familyBrand:''})?.familyKey,undefined);
  assert.equal(strengthSignature('Medicine 25 µg'),strengthSignature('Medicine 25 mcg'));
  for(const name of ['Medicine 20mg','Medicine 10mcg','Medicine 10mg/5ml']) {
    assert.equal(sameFamilyIdentity({...family,name:'Medicine 10mg'},{...family,name}),false,name);
  }
  assert.equal(sameFamilyIdentity({...family,name:'Support Small'},{...family,variantSize:'Large',name:'Support Large'}),true);
});
test('variant SEO retains individual URLs, actual images and prices, and excludes different strengths',()=>{
  const second={...sku,_id:'c'.repeat(24),product_id:'PD2',variantSize:'Large',price:30,stock:0};
  const wrong={...sku,_id:'d'.repeat(24),product_id:'PD3',familyStrength:'10mg',name:'Medicine 10mg'};
  const data=productData('https://shop.example.invalid',sku,['https://cdn.example.invalid/small.jpg'],[sku,second,wrong],{[second._id]:['https://cdn.example.invalid/large.jpg']});
  assert.ok('isVariantOf' in data);
  const group=data.isVariantOf!;
  assert.equal(group.hasVariant.length,2);
  assert.equal(group.hasVariant[1]!.offers.price,'30.00');
  assert.deepEqual(group.hasVariant[1]!.image,['https://cdn.example.invalid/large.jpg']);
  assert.notEqual(group.hasVariant[0]!.url,group.hasVariant[1]!.url);
  assert.equal(group.productGroupID,'support-knee');
  assert.equal(data.size,'Small');
  assert.equal(JSON.parse(serializeJsonLd(data)).offers.price,'25.00');
  assert.equal('gtin' in data,false);
});
test('order snapshots retain selected options independently of later catalog edits',()=>{
  const product={...sku,_id:new ObjectId(sku._id),vat:false};
  const customer={name:'Synthetic',mobile:'0501234567',email:'synthetic@example.invalid',emirate:'Ras al-Khaimah',city:'City A',address:'Synthetic address',payment:'cash' as const,note:'',maplink:'',buildingname:'',flatno:''};
  const quote=calculateQuote({customer,items:[{productId:sku._id,quantity:1}]},[product],approvedPolicy);
  product.variantSize='Large'; product.price=99;
  const snapshot=quote.lines[0]!;
  assert.equal(snapshot.variantLabel,'Size: Small'); assert.equal(snapshot.familyKey,'support-knee');
  assert.equal(snapshot.unitPriceMinor,2500);
  const view=legacyOrderDto({schemaVersion:2,lines:quote.lines});
  assert.equal(view.cartItems[0].variantLabel,'Size: Small');
  assert.equal(view.cartItems[0]._id.price,25);
});
