import assert from 'node:assert/strict';
import { test } from 'node:test';
import { googleCommerceConfiguration, reviewDeliveryDate, surveyPayload } from '../apps/web/src/lib/google/commerce';
const enabled={APP_ENV:'production',WEB_ORIGIN:'https://alminapharmacy.com',GOOGLE_CUSTOMER_REVIEWS_ELIGIBILITY_CONFIRMED:'true',GOOGLE_CUSTOMER_REVIEWS_ENABLED:'true',GOOGLE_MERCHANT_WIDGET_ENABLED:'true'};
test('Google commerce is off until production, canonical host, explicit eligibility and feature activation agree',()=>{
 assert.equal(googleCommerceConfiguration({}).survey,false);
 assert.equal(googleCommerceConfiguration({...enabled,GOOGLE_CUSTOMER_REVIEWS_ELIGIBILITY_CONFIRMED:'false'}).widget,false);
 for(const patch of [{APP_ENV:'development'},{APP_ENV:'staging'},{WEB_ORIGIN:'https://preview.invalid'}])assert.equal(googleCommerceConfiguration({...enabled,...patch}).survey,false);
 assert.equal(googleCommerceConfiguration(enabled).survey,true);
 assert.equal(googleCommerceConfiguration({...enabled,GOOGLE_CUSTOMER_REVIEWS_ENABLED:'false'}).survey,false);
 assert.throws(()=>googleCommerceConfiguration({...enabled,GOOGLE_MERCHANT_ACCOUNT_ID:'invalid'}));
 assert.throws(()=>googleCommerceConfiguration({...enabled,GOOGLE_REVIEWS_DELIVERY_BUSINESS_DAYS:'0'}));
});
test('estimated date uses original order time in UAE and skips weekends',()=>{
 assert.equal(reviewDeliveryDate('2026-10-23T10:00:00.000Z',6),'2026-11-02');
 assert.equal(reviewDeliveryDate('2026-10-29T21:00:00.000Z',1),'2026-11-02');
 assert.throws(()=>reviewDeliveryDate('not-a-date',6));
 assert.throws(()=>reviewDeliveryDate('2026-10-23T10:00:00.000Z',0));
});
test('survey is minimal, validates receipt, and never includes product, medical, payment or address data',()=>{
 const config=googleCommerceConfiguration(enabled);
 const receipt={orderId:'SYNTHETIC-1',email:'buyer@example.invalid',createdAt:'2026-10-23T10:00:00.000Z',deliveryCountry:'AE'};
 const payload=surveyPayload(config,receipt)!;
 assert.deepEqual(Object.keys(payload).sort(),['delivery_country','email','estimated_delivery_date','merchant_id','opt_in_style','order_id']);
 assert.equal(payload.estimated_delivery_date,'2026-11-02');
 assert.equal(surveyPayload({...config,survey:false},receipt),null);
 for(const patch of [{email:'invalid'},{deliveryCountry:'US'},{createdAt:undefined},{products:[{gtin:'synthetic'}]}])assert.equal(surveyPayload(config,{...receipt,...patch}),null);
});
