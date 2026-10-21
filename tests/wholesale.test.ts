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
