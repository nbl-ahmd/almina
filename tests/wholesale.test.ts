import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ObjectId } from 'mongodb';
import { wholesalePriceSchema,wholesaleTermsSchema,wholesaleAccountInputSchema,productDtoSchema } from '@almina/contracts';
import { permittedWholesaleProduct,wholesalePrice,decimalMinor } from '../apps/api/src/modules/wholesale/policy.js';
const product={_id:new ObjectId(),category:new ObjectId(),name:'Reviewed body wash',productType:'general',contentReviewed:true,published:true};
const type={_id:'salon',active:true,allowMedicines:false};
const account={approval:'approved',acceptedAt:new Date(),typeId:'salon',scope:'assigned',productIds:[String(product._id)],categoryIds:[]};
const price={typeId:'salon',unitPriceMinor:1234,minimumQuantity:6,quantityMultiple:3,maximumQuantity:60};
test('wholesale access is deny-by-default, profile-bound and publication-bound',()=>{
 assert.equal(permittedWholesaleProduct(account,type,product),true);
 for(const patch of [{approval:'suspended'},{acceptedAt:undefined},{scope:'assigned',productIds:[]},{typeId:'pharmacy'},{scope:'invalid'}])assert.equal(permittedWholesaleProduct({...account,...patch},type,product),false);
 assert.equal(permittedWholesaleProduct(account,{...type,active:false},product),false);
 for(const patch of [{productType:'otc'},{productType:'prescription'},{productType:'unreviewed'},{productType:undefined},{contentReviewed:false},{published:false},{disabled:true},{archivedAt:new Date()}])assert.equal(permittedWholesaleProduct(account,type,{...product,...patch}),false);
 assert.equal(permittedWholesaleProduct({...account,scope:'type'},type,product,{disabled:true}),false);
 assert.equal(permittedWholesaleProduct({...account,scope:'type',productIds:[]},type,product),true);
 assert.equal(permittedWholesaleProduct({...account,productIds:[],categoryIds:[String(product.category)]},type,product),true);
 assert.equal(permittedWholesaleProduct(account,{...type,allowMedicines:true},{...product,productType:'otc'}),true);
 assert.equal(permittedWholesaleProduct(account,{...type,allowMedicines:true},{...product,productType:'unreviewed'}),false);
});
test('case quantities and explicit profile price are mandatory; no retail fallback',()=>{
 assert.deepEqual(wholesalePrice({enabled:true,prices:[price]},'salon',6),price);
 for(const quantity of [0,3,7,61,6.5,NaN])assert.throws(()=>wholesalePrice({enabled:true,prices:[price]},'salon',quantity));
 assert.throws(()=>wholesalePrice({enabled:true,prices:[price]},'pharmacy',6));
 assert.throws(()=>wholesalePrice({enabled:false,prices:[price]},'salon',6));
 assert.throws(()=>wholesalePrice(undefined,'salon',6));
 assert.equal(decimalMinor(1234),'12.34');assert.equal(decimalMinor(1),'0.01');
});
test('wholesale configuration validates exact minor amounts, case minimums and duplicate tiers',()=>{
 assert.equal(wholesalePriceSchema.safeParse({...price,minimumQuantity:5}).success,false);
 for(const amount of [0,12.34,-1])assert.equal(wholesalePriceSchema.safeParse({...price,unitPriceMinor:amount}).success,false);
 assert.equal(wholesaleTermsSchema.safeParse({productId:String(product._id),enabled:true,prices:[price,price],revision:0}).success,false);
 assert.equal(wholesaleAccountInputSchema.safeParse({...account,email:'buyer@example.invalid',businessName:'Salon',verificationReference:'Checked',revision:0,role:'admin'}).success,false);
 assert.equal('wholesalePrice' in productDtoSchema.shape,false);
});

test('product audiences preserve legacy access and restrict each business type',async()=>{
 const {visibleToRetail,visibleToWholesale,productContentSchema}=await import('@almina/contracts');
 for(const audience of [undefined,'all']){assert.equal(visibleToRetail({audience}),true);assert.equal(visibleToWholesale({audience},'salon'),true);}
 assert.equal(visibleToRetail({audience:'wholesale'}),false);
 assert.equal(visibleToWholesale({audience:'retail'},'salon'),false);
 for(const audience of [null,'invalid',['all']]){assert.equal(visibleToRetail({audience}),false);assert.equal(visibleToWholesale({audience},'salon'),false);}
 const selected={...product,audience:'wholesale',wholesaleAudience:'selected',wholesaleTypeIds:['salon']};
 assert.equal(permittedWholesaleProduct(account,type,selected),true);
 assert.equal(permittedWholesaleProduct(account,type,{...selected,wholesaleTypeIds:['pharmacy']}),false);
 assert.equal(permittedWholesaleProduct(account,type,{...selected,wholesaleTypeIds:[]}),false);
 assert.equal(permittedWholesaleProduct(account,type,{...selected,audience:'retail'}),false);
 assert.equal(productContentSchema.parse({wholesaleTypeIds:'["salon"]'}).wholesaleTypeIds?.[0],'salon');
 for(const ids of ['salon','["salon","salon"]','["$ne"]'])assert.equal(productContentSchema.safeParse({wholesaleTypeIds:ids}).success,false);
});
test('business registration fields remain optional and reject malformed details',async()=>{
 const {wholesaleAccountInputSchema}=await import('@almina/contracts');
 const base={email:'salon@example.invalid',businessName:'Salon',typeId:'salon',approval:'approved',verificationReference:'Checked',scope:'type',productIds:[],categoryIds:[],revision:0};
 assert.equal(wholesaleAccountInputSchema.safeParse(base).success,true);
 assert.equal(wholesaleAccountInputSchema.safeParse({...base,taxRegistrationNumber:'100000000000003',phone:'+971 50 123 4567'}).success,true);
 assert.equal(wholesaleAccountInputSchema.safeParse({...base,taxRegistrationNumber:'123'}).success,false);
 assert.equal(wholesaleAccountInputSchema.safeParse({...base,phone:'unknown'}).success,false);
});
