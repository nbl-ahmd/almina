import assert from 'node:assert/strict';
import { test } from 'node:test';
import { customerOrderEmail, staffOrderEmail, emailOrder, emailImage } from '../apps/api/src/modules/notifications/order-email-html';
import { staffOrderMessage } from '../apps/api/src/modules/notifications/staff-email';
import { applicationEmailRequest } from '../apps/api/src/modules/notifications/provider';

const order = {
  orderId: 'OD7001', createdAt: new Date('2026-11-23T16:51:47Z'),
  customer: { name: 'Sara <b>Ali</b>', mobile: '0501234567', email: 'sara@example.com', city: 'Al Ghubb', address: 'Al Ghubb, RAK', flatno: '12', buildingname: 'Sea View', note: 'Call "at" gate', maplink: 'https://www.google.com/maps/search/?api=1&query=25.8,55.9' },
  lines: [{ productId: 'p1', name: 'CeraVe <script>x</script> 473 ml', quantity: 2 }, { productId: 'p2', name: 'Soap', quantity: 1 }],
  totals: { subtotalMinor: 25000, discountMinor: 0, taxMinor: 1190, deliveryFeeMinor: 0, totalMinor: 25000,
    lines: [{ productId: 'p1', unitPriceMinor: 9975, lineTotalMinor: 19950 }, { productId: 'p2', unitPriceMinor: 3045, salePriceMinor: 2500, lineTotalMinor: 2500 }] },
};
const images = new Map([['p1', 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg']]);

test('the customer confirmation lists photos, prices and totals, escapes content and never contains phone or e-mail', () => {
  const mail = customerOrderEmail(emailOrder(order, images), { origin: 'https://alminapharmacy.com', supportEmail: 'info@alminapharmacy.com' });
  assert.equal(mail.subject, 'We received your Al Mina order OD7001');
  for (const expected of ['OD7001', 'AED 99.75 each', 'AED 199.50', 'AED 25.00 each', 'Total', 'AED 250.00', 'Free', 'Cash on delivery', 'https://alminapharmacy.com/logo.png', 'res.cloudinary.com/demo/image/upload/v1/a.jpg']) assert.ok(mail.html.includes(expected), expected);
  assert.ok(!mail.html.includes('<script>') && !mail.html.includes('<b>Ali'));
  for (const secret of ['0501234567', 'sara@example.com']) assert.ok(!mail.html.includes(secret) && !mail.text.includes(secret));
  assert.match(mail.text, /2 x CeraVe/);
});

test('the staff alert adds customer, address, photos and totals, marks reminders, and still leaves out phone and e-mail', () => {
  const view = emailOrder(order, images);
  const mail = staffOrderEmail(view, { adminOrigin: 'https://admin.example.com', storefrontOrigin: 'https://alminapharmacy.com' });
  for (const expected of ['New order', 'OD7001', 'Sea View', 'Open location in Maps', 'https://admin.example.com/admin/orders?status=pending', 'Items (3)', 'AED 250.00']) assert.ok(mail.html.includes(expected), expected);
  for (const secret of ['0501234567', 'sara@example.com']) assert.ok(!mail.html.includes(secret) && !mail.text.includes(secret));
  assert.ok(!mail.html.includes('<script>'));
  const reminder = staffOrderEmail(view, { adminOrigin: 'https://admin.example.com', reminder: { stage: 2, waitingMinutes: 15 } });
  assert.ok(reminder.html.includes('Reminder 2') && reminder.html.includes('15 min'));
  // Unsafe links are dropped rather than rendered.
  const hostile = staffOrderEmail(emailOrder({ ...order, customer: { ...order.customer, maplink: 'javascript:alert(1)' } }), { adminOrigin: 'http://not-https' });
  assert.ok(!hostile.html.includes('javascript:') && !hostile.html.includes('http://not-https'));
  assert.equal(staffOrderMessage({ ...order, orderId: 'OD7001' }, 'a@b.co').subject.startsWith('New order OD7001 · AED 250.00 · Al Ghubb'), true);
});

test('e-mail photos are resized only for the image CDN and must be https', () => {
  assert.equal(emailImage('http://res.cloudinary.com/x/image/upload/a.jpg'), undefined);
  assert.equal(emailImage('javascript:alert(1)'), undefined);
  assert.equal(emailImage('https://example.com/a.png'), 'https://example.com/a.png');
  assert.match(emailImage('https://res.cloudinary.com/x/image/upload/v1/a.webp')!, /upload\/w_160,h_160,c_pad,b_white,f_jpg,q_auto\/v1\/a\.webp$/);
});

test('rendered order content is sent as html and text instead of the hosted template', () => {
  Object.assign(process.env, { EMAIL_TRANSACTIONAL_DOMAIN: 'notify.example.invalid', EMAIL_REPLY_TO: 'support@example.invalid' });
  const request = applicationEmailRequest({ kind: 'order', to: 'c@example.invalid', eventId: 'OD7001', variables: { ORDER_ID: 'OD7001', TOTAL: 'AED 1.00' }, content: { subject: 'S', html: '<p>h</p>', text: 't' } }) as Record<string, unknown>;
  assert.equal(request.subject, 'S'); assert.equal(request.html, '<p>h</p>'); assert.equal('template' in request, false);
});
