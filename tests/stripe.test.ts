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

test('live configuration is account-bound, production-only, mutually exclusive and paused by default',()=>{
  const env={APP_ENV:'production',DATABASE_ENV:'production',WEB_ORIGIN:'https://shop.invalid',STRIPE_LIVE_ENABLED:'true',STRIPE_ACCOUNT_ID:'acct_synthetic',STRIPE_SECRET_KEY:'rk_live_'+randomBytes(20).toString('hex'),STRIPE_WEBHOOK_SECRET:'whsec_'+randomBytes(20).toString('hex')};
  const value=stripeTestOptions(env);assert.ok(value);assert.equal(value.testMode,false);assert.equal(value.acceptingPayments,false);
  assert.equal(stripeTestOptions({...env,STRIPE_LIVE_ACCEPTING_PAYMENTS:'true'})?.acceptingPayments,true);
  for(const override of [{APP_ENV:'development'},{DATABASE_ENV:'staging'},{STRIPE_ACCOUNT_ID:''},{STRIPE_TEST_ENABLED:'true'},{STRIPE_SECRET_KEY:'sk_test_'+randomBytes(20).toString('hex')}])assert.throws(()=>stripeTestOptions({...env,...override}));
});
