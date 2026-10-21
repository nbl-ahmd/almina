import test from 'node:test';
import assert from 'node:assert/strict';
import { locales, parseLocale, isRtl, t, tf, messages } from '../apps/web/src/lib/i18n';
test('locale parsing fails back to English and only Arabic is RTL',()=>{assert.equal(parseLocale('ar'),'ar');assert.equal(parseLocale('fr'),'en');assert.equal(parseLocale(null),'en');assert.equal(isRtl('ar'),true);assert.equal(isRtl('en'),false);});
test('every locale exposes the same keys',()=>{const keys=Object.keys(messages.en).sort();for(const locale of locales)assert.deepEqual(Object.keys(messages[locale]).sort(),keys);});
test('placeholders interpolate in any order and unknown tokens are preserved',()=>{assert.equal(tf('en','cartRemoveAria',{name:'Daily Care'}),'Remove Daily Care from cart');assert.equal(tf('ar','cartQuantityAria',{name:'Daily Care',count:3}),'كمية Daily Care: 3');assert.equal(tf('en','cartReadyBanner',{name:'ignored'}),t('en','cartReadyBanner'));});
test('English cart copy stays byte-identical for existing browser assertions',()=>{assert.equal(t('en','cartEmptyTitle'),'A little room for your everyday essentials.');assert.equal(t('en','cartProceed'),'Proceed to checkout');assert.equal(t('en','cartOrderSummary'),'Order summary');assert.equal(t('en','cartInStock'),'In stock');assert.equal(t('en','cartPerItem'),'per item');assert.equal(tf('en','cartCheckoutLine',{price:'AED 20.00',quantity:2}),'AED 20.00 per item · Quantity: 2');assert.equal(tf('en','cartItemsInCart',{count:1,unit:t('en','cartProductOne')}),'1 product in your cart');});
test('English checkout copy keeps the exact e2e button and heading names',()=>{assert.equal(t('en','checkoutReview'),'Review order');assert.equal(t('en','checkoutOrderReceived'),'Order received');assert.equal(tf('en','checkoutPlaceOrder',{total:'AED 40.00'}),'Place order — AED 40.00');assert.equal(t('en','checkoutPaymentOnDelivery'),'Payment on delivery');assert.equal(t('en','checkoutErrorCommerceUnavailable'),'Ordering is currently unavailable. Your cart is saved.');assert.equal(t('ar','checkoutReview'),'مراجعة الطلب');});
test('delivery and reminder copy retains English and interpolates Arabic values',()=>{
 assert.equal(tf('en','freeDeliveryMore',{amount:'22.50'}),'Add AED 22.50 more for free delivery');
 assert.equal(tf('en','reminderBasketDelay',{hours:24}),'Send one reminder after 24 hours if I have not ordered.');
 assert.equal(t('en','reminderSaved'),'Reminder saved. Manage or cancel it in your account.');
 assert.equal(tf('ar','reminderDays',{days:30}),'30 يوماً');
});

import { arabicShopCopy, shopText } from '../apps/web/src/lib/i18n-storefront';
import { money } from '../apps/web/src/lib/catalog/model';
test('shop interface whitelist preserves every English label byte-for-byte and leaves staff content alone',()=>{
 for(const english of Object.keys(arabicShopCopy)) { assert.equal(shopText('en',english),english); assert.ok(shopText('ar',english).length); }
 assert.equal(shopText('ar','Daily Care 10mg'),'Daily Care 10mg');
 assert.equal(shopText('en','Explore now '),'Explore now ');
 assert.equal(shopText('ar','Explore now '),'استكشف الآن ');
 assert.equal(money(24.5),'AED 24.50');
 assert.equal(money(24.5,'ar'),new Intl.NumberFormat('ar-AE',{style:'currency',currency:'AED',minimumFractionDigits:2,maximumFractionDigits:2}).format(24.5));
});

import { emirateLabel } from '../apps/web/src/lib/i18n';
import { deliveryEmirates } from '@almina/contracts';
test('all canonical emirates have Arabic display labels without altering stored contract values',()=>{
 for(const value of deliveryEmirates){assert.equal(emirateLabel('en',value),value);assert.notEqual(emirateLabel('ar',value),value);}
 assert.equal(emirateLabel('ar','Dubai'),'دبي');assert.equal(emirateLabel('ar','Unknown area'),'Unknown area');
 assert.equal(t('en','cartLowStock'),'Stock is low. Please choose a smaller quantity.');
 assert.equal(t('en','cartStoreClosed'),'The store is currently closed.');
 for(const key of Object.keys(messages.en) as (keyof typeof messages.en)[]){
  const tokens=(value:string)=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
  assert.deepEqual(tokens(messages.en[key]!),tokens(messages.ar[key]!),`Placeholder mismatch: ${key}`);
 }
});
