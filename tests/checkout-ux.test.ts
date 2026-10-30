import test from 'node:test';
import assert from 'node:assert/strict';
import { detailErrors, detailError, normalizeCheckoutMobile } from '../apps/web/src/lib/checkout/validation';
const valid = {name:'Synthetic shopper',mobile:'+971501234567',email:'shopper@example.invalid',emirate:'Ras al-Khaimah',city:'City A',address:'Synthetic street'};
test('checkout detail validation follows contract constraints before advancing',()=>{
  assert.deepEqual(detailErrors(valid,'en'),{});
  const errors=detailErrors({...valid,name:'  ',mobile:'abc',email:'not an email',city:'',address:' '},'en');
  assert.deepEqual(Object.keys(errors),['name','mobile','email','city','address']);
  assert.match(errors.email!,/confirmation/);
  assert.ok(detailError('name','a'.repeat(201),'en'));
});
test('checkout errors localize and optional delivery details do not block progress',()=>{
  assert.deepEqual(detailErrors({...valid,buildingname:'',flatno:'',note:''},'ar'),{});
  assert.match(detailErrors({...valid,email:''},'ar').email!,/بريد/);
  assert.notEqual(detailError('mobile','','en'),detailError('mobile','','ar'));
});

test('mobile keyboard formatting preserves a canonical phone number without accepting letters',()=>{
 assert.equal(normalizeCheckoutMobile('+971 (50) 123-4567'),'+971501234567');
 assert.equal(normalizeCheckoutMobile('٠٥٠١٢٣٤٥٦٧'),'0501234567');
 assert.equal(detailError('mobile','+971 (50) 123-4567','en'),undefined);
 assert.ok(detailError('mobile','050ABC4567','en'));
});
