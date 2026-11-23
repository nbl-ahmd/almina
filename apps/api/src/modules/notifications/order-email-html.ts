import type { Db, Document } from 'mongodb';

/** Table-based, inline-styled HTML for the two order e-mails. Mail clients ignore most modern CSS, so layout uses nested
 *  tables, a 600px column that shrinks on phones, system fonts and light colours only. Every dynamic value is escaped and every
 *  URL is validated before it reaches the markup. */

const INK = '#1A241D', MUTED = '#59655D', SURFACE = '#F6F7F6', LINE = '#DCE3DC', FOREST = '#173C25', CORAL = '#FF6465', ACTION = '#D63D44', TINT = '#FFF0EE';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export const clean = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max) : '';
export const aed = (minor: unknown) => typeof minor === 'number' && Number.isFinite(minor) ? `AED ${(minor / 100).toFixed(2)}` : '';

const isOrigin = (value: unknown): value is string => typeof value === 'string' && /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/.test(value);
const safeUrl = (value: unknown) => { try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; } };

export type EmailLine = { name: string; quantity: number; unitMinor?: number; lineMinor?: number; image?: string };
export type EmailOrder = {
  orderId: string; placedAt?: Date; paymentLabel: string; online: boolean; lines: EmailLine[]; hiddenLines: number;
  subtotalMinor?: number; discountMinor?: number; deliveryFeeMinor?: number; taxMinor?: number; totalMinor?: number;
  customerName: string; area: string; address: string; note: string; mapLink?: string;
};

/** Photo URL sized for a 72px e-mail thumbnail. Cloudinary serves JPEG on request, which every mail client displays. */
export function emailImage(raw: unknown): string | undefined {
  const url = safeUrl(raw);
  if (!url) return undefined;
  const parsed = new URL(url);
  if (parsed.hostname === 'res.cloudinary.com' && parsed.pathname.includes('/image/upload/') && !parsed.pathname.includes('/upload/w_')) {
    parsed.pathname = parsed.pathname.replace('/image/upload/', '/image/upload/w_160,h_160,c_pad,b_white,f_jpg,q_auto/');
  }
  return parsed.href;
}

/** Product photos for the order lines, read at send time (order lines are price snapshots and carry no images). */
export async function productImages(db: Db, order: Document): Promise<Map<string, string>> {
  const ids = [...new Set((Array.isArray(order.lines) ? order.lines as Document[] : []).slice(0, 30).map((line) => line.productId).filter(Boolean))];
  const result = new Map<string, string>();
  if (!ids.length) return result;
  const products = await db.collection('products').find({ _id: { $in: ids as never[] } }, { projection: { cloudinaryImages: 1, images: 1 }, maxTimeMS: 3000 }).toArray();
  for (const product of products) {
    const candidate = [...(Array.isArray(product.cloudinaryImages) ? product.cloudinaryImages : []), ...(Array.isArray(product.images) ? product.images : [])]
      .map(emailImage).find(Boolean);
    if (candidate) result.set(String(product._id), candidate);
  }
  return result;
}

/** One normalised view of a committed order for both e-mails. Phone and e-mail are never part of it. */
export function emailOrder(order: Document, images: Map<string, string> = new Map()): EmailOrder {
  const all = Array.isArray(order.lines) ? order.lines as Document[] : [];
  const priced = new Map((Array.isArray(order.totals?.lines) ? order.totals.lines as Document[] : []).map((line) => [String(line.productId), line]));
  const lines = all.slice(0, 30).map((line) => {
    const price = priced.get(String(line.productId)) ?? line;
    const unit = typeof price.salePriceMinor === 'number' ? price.salePriceMinor : price.unitPriceMinor;
    const image = images.get(String(line.productId));
    return { name: clean(line.name, 120) || 'Item', quantity: Number.isInteger(line.quantity) && line.quantity > 0 ? Number(line.quantity) : 1,
      ...(typeof unit === 'number' ? { unitMinor: unit } : {}), ...(typeof price.lineTotalMinor === 'number' ? { lineMinor: price.lineTotalMinor } : {}), ...(image ? { image } : {}) };
  });
  const totals = (order.totals ?? {}) as Document, customer = (order.customer ?? {}) as Document;
  const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const area = clean(customer.city, 60) || clean(customer.emirate, 60);
  const address = [clean(customer.flatno, 40), clean(customer.buildingname, 80), clean(customer.address, 200)].filter(Boolean).join(', ');
  const placed = order.createdAt instanceof Date ? order.createdAt : undefined;
  return { orderId: String(order.orderId), ...(placed ? { placedAt: placed } : {}), online: order.payment?.provider === 'stripe',
    paymentLabel: order.payment?.provider === 'stripe' ? 'Paid online' : 'Cash on delivery', lines, hiddenLines: Math.max(0, all.length - lines.length),
    ...(num(totals.subtotalMinor) !== undefined ? { subtotalMinor: num(totals.subtotalMinor)! } : {}), ...(num(totals.discountMinor) !== undefined ? { discountMinor: num(totals.discountMinor)! } : {}),
    ...(num(totals.deliveryFeeMinor) !== undefined ? { deliveryFeeMinor: num(totals.deliveryFeeMinor)! } : {}), ...(num(totals.taxMinor) !== undefined ? { taxMinor: num(totals.taxMinor)! } : {}),
    ...(num(totals.totalMinor) !== undefined ? { totalMinor: num(totals.totalMinor)! } : {}),
    customerName: clean(customer.name, 80), area, address, note: clean(customer.note, 300), ...(safeUrl(customer.maplink) ? { mapLink: safeUrl(customer.maplink)! } : {}) };
}

const when = (date: Date | undefined) => date ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date) + ' (UAE)' : '';
const firstName = (name: string) => name.split(' ')[0] ?? '';

function shell(options: { preheader: string; origin?: string; header: string; body: string; footer: string }) {
  const logo = isOrigin(options.origin) ? `<img src="${escapeHtml(options.origin)}/logo.png" width="132" alt="Al Mina Pharmacy" style="display:block;border:0;height:auto;width:132px;max-width:132px">` : `<span style="font:700 18px ${FONT};color:${FOREST}">Al Mina Pharmacy</span>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>Al Mina Pharmacy</title></head>`
    + `<body style="margin:0;padding:0;background:${SURFACE};-webkit-text-size-adjust:100%">`
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(options.preheader)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE}"><tr><td align="center" style="padding:24px 12px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid ${LINE};overflow:hidden">`
    + `<tr><td style="height:4px;background:${CORAL};font-size:0;line-height:0">&nbsp;</td></tr>`
    + `<tr><td style="padding:22px 28px 6px">${logo}</td></tr>${options.header}${options.body}`
    + `<tr><td style="padding:20px 28px 28px;border-top:1px solid ${LINE};font:12px/18px ${FONT};color:${MUTED}">${options.footer}</td></tr>`
    + `</table></td></tr></table></body></html>`;
}

const pill = (text: string, background: string, color: string) => `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${background};color:${color};font:700 11px/16px ${FONT};letter-spacing:.06em;text-transform:uppercase">${escapeHtml(text)}</span>`;

function itemsTable(order: EmailOrder) {
  const rows = order.lines.map((line) => {
    const photo = line.image ? `<img src="${escapeHtml(line.image)}" width="64" height="64" alt="" style="display:block;border:0;border-radius:10px;background:${SURFACE};width:64px;height:64px;object-fit:contain">`
      : `<div style="width:64px;height:64px;border-radius:10px;background:${SURFACE}"></div>`;
    const each = line.unitMinor !== undefined ? ` &middot; ${escapeHtml(aed(line.unitMinor))} each` : '';
    return `<tr><td width="76" valign="top" style="padding:12px 12px 12px 0;border-bottom:1px solid ${LINE}">${photo}</td>`
      + `<td valign="top" style="padding:12px 0;border-bottom:1px solid ${LINE};font:600 14px/20px ${FONT};color:${INK}">${escapeHtml(line.name)}<br><span style="font:400 13px/20px ${FONT};color:${MUTED}">Qty ${line.quantity}${each}</span></td>`
      + `<td valign="top" align="right" style="padding:12px 0 12px 12px;border-bottom:1px solid ${LINE};font:700 14px/20px ${FONT};color:${INK};white-space:nowrap">${line.lineMinor !== undefined ? escapeHtml(aed(line.lineMinor)) : ''}</td></tr>`;
  }).join('');
  const more = order.hiddenLines ? `<tr><td colspan="3" style="padding:10px 0;font:13px/18px ${FONT};color:${MUTED}">and ${order.hiddenLines} more item${order.hiddenLines === 1 ? '' : 's'}</td></tr>` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${more}</table>`;
}

function summaryTable(order: EmailOrder, vatNote = true) {
  const row = (label: string, value: string, strong = false) => `<tr><td style="padding:4px 0;font:${strong ? 700 : 400} ${strong ? 16 : 14}px/22px ${FONT};color:${strong ? INK : MUTED}">${label}</td>`
    + `<td align="right" style="padding:4px 0;font:${strong ? 800 : 600} ${strong ? 18 : 14}px/22px ${FONT};color:${INK};white-space:nowrap">${value}</td></tr>`;
  const parts: string[] = [];
  if (order.subtotalMinor !== undefined) parts.push(row('Subtotal', escapeHtml(aed(order.subtotalMinor))));
  if (order.discountMinor) parts.push(row('Discount', '&minus; ' + escapeHtml(aed(order.discountMinor))));
  if (order.deliveryFeeMinor !== undefined) parts.push(row('Delivery', order.deliveryFeeMinor === 0 ? 'Free' : escapeHtml(aed(order.deliveryFeeMinor))));
  if (vatNote && order.taxMinor) parts.push(row('VAT (included)', escapeHtml(aed(order.taxMinor))));
  parts.push(`<tr><td colspan="2" style="padding-top:6px;border-bottom:1px solid ${LINE};font-size:0;line-height:0">&nbsp;</td></tr>`);
  parts.push(row('Total', escapeHtml(aed(order.totalMinor) || 'See your order'), true));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${parts.join('')}</table>`;
}

const section = (title: string, inner: string) => `<tr><td style="padding:22px 28px 0"><div style="font:700 12px/16px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${MUTED};padding-bottom:8px">${title}</div>${inner}</td></tr>`;
const panel = (inner: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};border-radius:12px"><tr><td style="padding:14px 16px;font:14px/22px ${FONT};color:${INK}">${inner}</td></tr></table>`;
const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${ACTION}"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;border-radius:999px;font:700 15px/20px ${FONT};color:#ffffff;text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;

/** Confirmation sent to the customer after checkout. */
export function customerOrderEmail(order: EmailOrder, options: { origin?: string; supportEmail?: string } = {}) {
  const name = firstName(order.customerName);
  const header = `<tr><td style="padding:14px 28px 4px">${pill('Order received', TINT, ACTION)}`
    + `<h1 style="margin:12px 0 8px;font:800 26px/32px ${FONT};color:${INK}">Thank you${name ? `, ${escapeHtml(name)}` : ''}!</h1>`
    + `<p style="margin:0;font:15px/24px ${FONT};color:${MUTED}">We have received your order and our team is getting it ready. We will contact you if we need anything to complete it.</p></td></tr>`;
  const meta = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>`
    + `<td valign="top" style="padding-right:8px"><div style="font:12px/16px ${FONT};color:${MUTED}">Order number</div><div style="font:700 15px/22px ${FONT};color:${INK}">${escapeHtml(order.orderId)}</div></td>`
    + `<td valign="top" style="padding-right:8px"><div style="font:12px/16px ${FONT};color:${MUTED}">Placed</div><div style="font:600 14px/22px ${FONT};color:${INK}">${escapeHtml(when(order.placedAt) || 'Just now')}</div></td>`
    + `<td valign="top"><div style="font:12px/16px ${FONT};color:${MUTED}">Payment</div><div style="font:600 14px/22px ${FONT};color:${INK}">${escapeHtml(order.paymentLabel)}</div></td></tr></table>`;
  const delivery = [order.customerName ? `<strong>${escapeHtml(order.customerName)}</strong>` : '', order.address ? escapeHtml(order.address) : escapeHtml(order.area)].filter(Boolean).join('<br>')
    + (order.note ? `<br><span style="color:${MUTED}">Note: ${escapeHtml(order.note)}</span>` : '');
  const payment = order.online ? 'Your payment has been received.' : 'Please have the amount ready. You pay when your order arrives.';
  const body = section('Order details', panel(meta)) + section('Your items', itemsTable(order) + summaryTable(order))
    + (delivery ? section('Delivering to', panel(delivery)) : '')
    + `<tr><td style="padding:18px 28px 0;font:14px/22px ${FONT};color:${MUTED}">${escapeHtml(payment)}</td></tr>`
    + (isOrigin(options.origin) ? `<tr><td style="padding:20px 28px 0">${button(options.origin, 'Continue shopping')}</td></tr>` : '');
  const help = options.supportEmail ? `Questions about your order? Reply to this email or write to ${escapeHtml(options.supportEmail)} and quote ${escapeHtml(order.orderId)}.` : `Questions about your order? Reply to this email and quote ${escapeHtml(order.orderId)}.`;
  const footer = `<div style="padding-bottom:8px;color:${INK};font-weight:600">${help}</div>Al Mina Pharmacy &middot; Ras Al Khaimah, United Arab Emirates<br>You are receiving this because an order was placed with this e-mail address at Al Mina Pharmacy.`;
  const text = [`Thank you${name ? `, ${name}` : ''}! Al Mina Pharmacy has received your order ${order.orderId}.`, '',
    ...order.lines.map((line) => `${line.quantity} x ${line.name}${line.lineMinor !== undefined ? `  ${aed(line.lineMinor)}` : ''}`),
    '', ...(order.subtotalMinor !== undefined ? [`Subtotal: ${aed(order.subtotalMinor)}`] : []),
    ...(order.deliveryFeeMinor !== undefined ? [`Delivery: ${order.deliveryFeeMinor === 0 ? 'Free' : aed(order.deliveryFeeMinor)}`] : []),
    `Total: ${aed(order.totalMinor) || 'see your order'}`, `Payment: ${order.paymentLabel}`, ...(order.address ? ['', `Delivering to: ${order.address}`] : []), '', payment,
    '', `Questions? Reply to this email and quote ${order.orderId}.`].join('\n');
  return { subject: `We received your Al Mina order ${order.orderId}`, html: shell({ preheader: `Order ${order.orderId} received — ${aed(order.totalMinor)}`, ...(options.origin ? { origin: options.origin } : {}), header, body, footer }), text };
}

/** Alert for the shop team. Phone number and e-mail are left out on purpose: staff open the order for contact details. */
export function staffOrderEmail(order: EmailOrder, options: { adminOrigin?: string; storefrontOrigin?: string; reminder?: { stage: number; waitingMinutes: number } } = {}) {
  const link = isOrigin(options.adminOrigin) ? `${options.adminOrigin}/admin/orders?status=pending` : undefined;
  const reminder = options.reminder;
  const banner = reminder ? `<tr><td style="padding:0"><div style="background:${ACTION};padding:12px 28px;font:700 14px/20px ${FONT};color:#ffffff">Reminder ${reminder.stage}: this order has waited ${reminder.waitingMinutes} min without confirmation</div></td></tr>` : '';
  const header = `${banner}<tr><td style="padding:14px 28px 4px">${pill(reminder ? 'Still unconfirmed' : 'New order', reminder ? TINT : FOREST, reminder ? ACTION : '#ffffff')}`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px"><tr>`
    + `<td valign="bottom"><div style="font:800 28px/34px ${FONT};color:${INK}">${escapeHtml(order.orderId)}</div><div style="font:13px/20px ${FONT};color:${MUTED}">${escapeHtml(when(order.placedAt))}</div></td>`
    + `<td valign="bottom" align="right"><div style="font:800 26px/34px ${FONT};color:${INK};white-space:nowrap">${escapeHtml(aed(order.totalMinor) || '—')}</div><div style="font:13px/20px ${FONT};color:${MUTED}">${escapeHtml(order.paymentLabel)}</div></td></tr></table></td></tr>`;
  const info = [`<strong>${escapeHtml(order.customerName || 'Customer')}</strong>`, escapeHtml(order.address || order.area || 'Delivery area not set'),
    order.area && order.address ? `<span style="color:${MUTED}">Area: ${escapeHtml(order.area)}</span>` : '',
    order.note ? `<span style="color:${MUTED}">Note: ${escapeHtml(order.note)}</span>` : '',
    order.mapLink ? `<a href="${escapeHtml(order.mapLink)}" style="color:${ACTION};font-weight:600">Open location in Maps</a>` : ''].filter(Boolean).join('<br>');
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const body = section('Deliver to', panel(info)) + section(`Items (${itemCount})`, itemsTable(order) + summaryTable(order))
    + `<tr><td style="padding:22px 28px 0">${link ? button(link, 'Open order inbox') : `<div style="font:14px/22px ${FONT};color:${MUTED}">Open the admin order inbox to confirm it.</div>`}</td></tr>`
    + `<tr><td style="padding:12px 28px 0;font:13px/20px ${FONT};color:${MUTED}">Phone number and e-mail are not included here. Open the order to contact the customer.</td></tr>`;
  const footer = `Al Mina staff alert &middot; sent to the shop order inbox${reminder ? ` &middot; reminder ${reminder.stage}` : ''}`;
  const area = order.area || 'delivery area not set';
  const text = [reminder ? `REMINDER: order ${order.orderId} has waited ${reminder.waitingMinutes} min without confirmation` : `New order ${order.orderId}: ${aed(order.totalMinor) || 'total unavailable'}`,
    ...(reminder ? [`Total: ${aed(order.totalMinor) || 'total unavailable'}`] : []), `Area: ${area}`, `Payment: ${order.paymentLabel}`,
    ...(order.customerName ? [`Customer: ${order.customerName}`] : []), ...(order.address ? [`Address: ${order.address}`] : []), ...(order.note ? [`Note: ${order.note}`] : []), ...(order.mapLink ? [`Map: ${order.mapLink}`] : []), '',
    ...order.lines.map((line) => `${line.quantity} x ${line.name}${line.lineMinor !== undefined ? `  ${aed(line.lineMinor)}` : ''}`),
    ...(order.hiddenLines ? [`and ${order.hiddenLines} more`] : []), '', link ? `Open the order inbox: ${link}` : 'Open the admin order inbox to confirm it.'].join('\n');
  return { html: shell({ preheader: `${order.orderId} · ${aed(order.totalMinor)} · ${area}`, ...(options.storefrontOrigin ? { origin: options.storefrontOrigin } : {}), header, body, footer }), text, area };
}
