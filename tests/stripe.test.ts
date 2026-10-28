import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {test} from 'node:test';
import {stripeTestOptions} from '../apps/api/src/modules/payments/stripe.js';
import {readWebEnvironment} from '@almina/config/env';
test('Stripe is additive, opt-in, test-key-only and excluded from production',()=>{
  assert.equal(stripeTestOptions({}),undefined);
  const config={STRIPE_TEST_ENABLED:'true',APP_ENV:'development',WEB_ORIGIN:'http://127.0.0.1:3000',STRIPE_SECRET_KEY:'sk_test_'+randomBytes(20).toString('hex'),STRIPE_WEBHOOK_SECRET:'whsec_'+randomBytes(20).toString('hex')};
  assert.ok(stripeTestOptions(config));
  for(const override of [{APP_ENV:'production'},{DATABASE_ENV:'production'},{STRIPE_SECRET_KEY:'sk_live_'+randomBytes(20).toString('hex')},{STRIPE_WEBHOOK_SECRET:''},{WEB_ORIGIN:'http://untrusted.invalid'}])assert.throws(()=>stripeTestOptions({...config,...override}));
  assert.equal(readWebEnvironment({APP_ENV:'production',NODE_ENV:'production',WEB_ORIGIN:'https://shop.invalid',API_ORIGIN:'https://api.invalid',STRIPE_TEST_ENABLED:'true'}).STRIPE_TEST_ENABLED,false);
});
