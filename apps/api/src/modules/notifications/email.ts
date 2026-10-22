import type { Db } from 'mongodb';
import { usesResend, sendApplicationEmail } from './provider.js';
import { z } from 'zod';
import { HttpError } from '../../errors.js';

const address = z.string().max(254).regex(/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/);
export type MailMessage = { from?: string | undefined; to: string; subject: string; text?: string; html?: string; messageId?: string };
export type MailTransport = { sendMail: (message: MailMessage) => Promise<unknown>; close: () => void };
export type SmtpOptions = { host: string; port: number; secure: boolean; requireTLS: boolean;
  auth: { user: string; pass: string }; tls: { rejectUnauthorized: boolean; minVersion: string };
  connectionTimeout: number; greetingTimeout: number; socketTimeout: number; dnsTimeout: number;
  disableFileAccess: boolean; disableUrlAccess: boolean; logger: boolean; debug: boolean };
export type SmtpCredentials = { user?: string | undefined; password?: string | undefined };
export function confirmationMessage(raw: unknown, from?: string): MailMessage {
  const value = z.object({ orderId: z.string().max(80).regex(/^OD[0-9]+$/), customer: z.object({ email: address }).passthrough() }).passthrough().safeParse(raw);
  if (!value.success) throw new HttpError(400, 'INVALID_REQUEST');
  return { messageId: `<almina-order-${value.data.orderId}@alminapharmacy.com>`, from,
    to: value.data.customer.email, subject: 'Your order has been received',
    text: `Al Mina Pharmacy has received order ${value.data.orderId}. Our team will contact you about fulfillment.` };
}
export function administrativeEmail(raw: unknown): MailMessage {
  const value = z.object({ recipient: address, htmlContent: z.string().min(1).max(65536)
    .refine(value => Buffer.byteLength(value) <= 65536) }).strict().safeParse(raw);
  if (!value.success) throw new HttpError(400, 'INVALID_REQUEST');
  return { from: '"Al Mina Pharmacy" <info@alminapharmacy.com>', to: value.data.recipient,
    subject: 'Your order has been placed successfully', html: value.data.htmlContent };
}
// Provider success means SMTP acceptance, not inbox delivery. No automatic resend
// happens here; durable order jobs retain the existing at-least-once retry policy.
export async function deliverEmail(message: MailMessage, credentials: SmtpCredentials,
  factory: (options: SmtpOptions) => MailTransport, signal?: AbortSignal, deadlineMs = 15000): Promise<void> {
  if (!address.safeParse(credentials.user).success || typeof credentials.password !== 'string'
    || !credentials.password.length || credentials.password.length > 4096) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  if (!Number.isInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 30000) throw new Error('Invalid mail deadline');
  if (signal?.aborted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  let transport: MailTransport;
  try { transport = factory({ host: 'smtp.office365.com', port: 587, secure: false, requireTLS: true,
    auth: { user: credentials.user!, pass: credentials.password }, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000, dnsTimeout: 5000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false }); }
  catch { throw new HttpError(503, 'SERVICE_UNAVAILABLE'); }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  try {
    const result = await Promise.race([Promise.resolve().then(() => {
      if (signal?.aborted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
      return transport.sendMail(message);
    }), new Promise<never>((_resolve, reject) => {
      cancel = () => reject(new HttpError(503, 'SERVICE_UNAVAILABLE'));
      timer = setTimeout(cancel, deadlineMs);
      signal?.addEventListener('abort', cancel, { once: true });
      if (signal?.aborted) cancel();
    })]);
    const accepted = z.object({ accepted: z.array(z.string()).max(1), rejected: z.array(z.unknown()).max(0) }).passthrough().safeParse(result);
    if (!accepted.success || accepted.data.accepted.length !== 1
      || accepted.data.accepted[0]!.toLowerCase() !== message.to.toLowerCase()) throw new Error('Mail acceptance unavailable');
  } catch {
    // Never expose SMTP errors containing recipients, message content or credentials.
    throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  } finally {
    if (timer) clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
    try { transport.close(); } catch { /* Cleanup never exposes provider diagnostics. */ }
  }
}

/** Both retained and modular adapters use the persisted order, never a caller-supplied recipient. */
export async function sendOrderEmail(db: Db, order: unknown, signal?: AbortSignal) {
  if (!usesResend()) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const message = confirmationMessage(order);
  const persisted = z.object({ orderId: z.string().regex(/^OD[0-9]+$/), totals: z.object({ totalMinor: z.number().int().nonnegative().safe() }).passthrough().optional() }).passthrough().parse(order);
  const orderId = persisted.orderId;
  const total = persisted.totals ? `AED ${(persisted.totals.totalMinor / 100).toFixed(2)}` : 'See your order details';
  await sendApplicationEmail(db, { kind: 'order', to: message.to, eventId: orderId, variables: { ORDER_ID: orderId, TOTAL: total } }, signal);
}
