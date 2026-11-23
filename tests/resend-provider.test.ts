import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationEmailRequest, customerEmailReady, resendReady, oneClickUrl, emailHash } from '../apps/api/src/modules/notifications/provider';

test('Resend configuration is fail-closed and keeps account/order senders separate from reminder senders', () => {
  const names = ['EMAIL_PROVIDER','RESEND_API_KEY','RESEND_MARKETING_API_KEY','EMAIL_TRANSACTIONAL_DOMAIN','EMAIL_MARKETING_DOMAIN','EMAIL_REPLY_TO','EMAIL_PUBLIC_API_ORIGIN'] as const;
  const before = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    process.env.EMAIL_PROVIDER = 'resend'; delete process.env.RESEND_API_KEY;
    assert.equal(customerEmailReady(), false);
    Object.assign(process.env, { RESEND_API_KEY:'re_synthetic_only', RESEND_MARKETING_API_KEY:'re_synthetic_marketing', EMAIL_TRANSACTIONAL_DOMAIN:'notify.example.invalid', EMAIL_MARKETING_DOMAIN:'news.example.invalid', EMAIL_REPLY_TO:'support@example.invalid', EMAIL_PUBLIC_API_ORIGIN:'https://api.example.invalid' });
    assert.equal(resendReady(), true); assert.equal(resendReady(true), true);
    const account = applicationEmailRequest({kind:'signin',to:'customer@example.invalid',eventId:'attempt',variables:{CODE:'123456'}});
    assert.equal(account.from,'Al Mina Accounts <noreply@notify.example.invalid>'); assert.equal(account.replyTo,'support@example.invalid'); assert.equal(account.headers,undefined);
    assert.equal((account as { template?: { id: string } }).template?.id,'almina-signin-v1');
    const order = applicationEmailRequest({kind:'order',to:'customer@example.invalid',eventId:'OD5050',variables:{ORDER_ID:'OD5050',TOTAL:'AED 20.00'}});
    assert.equal(order.from,'Al Mina Orders <orders@notify.example.invalid>');
    const cart = applicationEmailRequest({kind:'cart',to:'customer@example.invalid',eventId:'reminder',variables:{ACCOUNT_URL:'https://example.invalid/account',CANCEL_URL:'https://example.invalid/unsubscribe?token='+'a'.repeat(43)}});
    assert.equal(cart.from,'Al Mina Pharmacy <offers@news.example.invalid>');
    assert.equal(cart.headers!['List-Unsubscribe'],'<https://api.example.invalid/api/v1/email/unsubscribe/'+'a'.repeat(43)+'>');
    assert.equal(cart.headers!['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
    assert.throws(()=>oneClickUrl('https://example.invalid/unsubscribe?token=short'));
    process.env.EMAIL_PUBLIC_API_ORIGIN='http://api.example.invalid'; assert.throws(()=>oneClickUrl('https://example.invalid/unsubscribe?token='+'a'.repeat(43)));
    assert.throws(()=>applicationEmailRequest({kind:'signin',to:'customer@example.invalid\r\nBcc:other@example.invalid',eventId:'attempt',variables:{}}));
    process.env.EMAIL_TRANSACTIONAL_DOMAIN='notify.example.invalid\r\nBcc:other@example.invalid'; assert.equal(resendReady(),false);
    assert.equal(emailHash(' Customer@Example.invalid '),emailHash('customer@example.invalid'));
  } finally { for (const name of names) { if (before[name] === undefined) delete process.env[name]; else process.env[name] = before[name]; } }
});
