import assert from 'node:assert/strict';
import {test} from 'node:test';
import {catalogueLineMinor,catalogueSubtotal} from '../apps/web/src/lib/catalog/cart-display';
test('catalogue estimates use integer minor-unit multiplication and preserve zero prices',()=>{
 assert.equal(catalogueLineMinor(19.99,3),5997);
 assert.equal(catalogueLineMinor(0,4),0);
 assert.equal(catalogueSubtotal([{lineTotalMinor:5997},{lineTotalMinor:0},{lineTotalMinor:1250}]),7247);
});
test('unknown or unsafe catalogue amounts never become misleading zero subtotals',()=>{
 for(const price of [null,NaN,Infinity,-1,Number.MAX_SAFE_INTEGER])assert.equal(catalogueLineMinor(price,2),null);
 for(const qty of [0,-1,1.5,Infinity])assert.equal(catalogueLineMinor(20,qty),null);
 assert.equal(catalogueSubtotal([]),null);
 assert.equal(catalogueSubtotal([{lineTotalMinor:100},{lineTotalMinor:null}]),null);
 assert.equal(catalogueSubtotal([{lineTotalMinor:Number.MAX_SAFE_INTEGER},{lineTotalMinor:1}]),null);
});
