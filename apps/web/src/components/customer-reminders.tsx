'use client';
import { accountText } from '../lib/account/copy';
import { useAccountCopy } from "./account-locale";
import { NativeSelect } from './ui/native-select';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Field, FieldLabel, FieldGroup } from './ui/field';

import { useEffect, useState, type FormEvent } from 'react';
import Link from './app-link';
import { reminderDtoSchema, retentionPolicySchema, type RetentionPolicy } from '@almina/contracts';
import { BellIcon } from './storefront-icons';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import { checkAddition } from '../app/(storefront)/cart/actions';
import { t, tf, type Locale } from '../lib/i18n';
import { z } from 'zod';

async function request(path: string, body?: unknown, locale: Locale = 'en') {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json() as { data?: unknown; error?: { message?: string } };
  if (!response.ok) throw new Error(response.status === 401 ? t(locale,'reminderSignIn') : (locale === 'en' ? data.error?.message : undefined) || t(locale,'reminderError'));
  return data.data;
}
const optionsSchema = retentionPolicySchema.extend({ deliveryReady: z.boolean() });
export function ReminderSignup({ productId, stock = 0, items, locale = 'en' }: { productId?: string; stock?: number; locale?: Locale; items?: { id: string; quantity: number }[] }) {
 const a=(text:string|undefined)=>accountText(locale,text??'');

  const [policy, setPolicy] = useState<RetentionPolicy | null>(null), [kind, setKind] = useState(items ? 'cart' : stock > 0 ? 'price-drop' : 'restock'), [days, setDays] = useState(30), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { let active = true; void request('/api/growth/reminder-options').then(value => { const options = optionsSchema.parse(value); if (active && options.enabled && options.deliveryReady) setPolicy(options); }).catch(() => undefined); return () => { active = false; }; }, []);
  const choices = policy ? (items ? policy.cartRecovery ? [['cart', t(locale,'reminderBasketChoice')]] : [] : [...(stock <= 0 && policy.restock ? [['restock', t(locale,'reminderRestock')]] : []), ...(policy.priceDrop ? [['price-drop', t(locale,'reminderPriceDrop')]] : []), ...(policy.replenishment ? [['replenishment', t(locale,'reminderReplenishment')]] : [])]) : [];
  if (!choices.length) return null;
  async function subscribe(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await request('/api/customer/reminders', { operation: 'subscribe', kind: choices.some(item => item[0] === kind) ? kind : choices[0]![0], consent: true, ...(items ? { items } : { productId }), ...(kind === 'replenishment' ? { days } : {}) }, locale); setMessage(t(locale,'reminderSaved')); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <details className="my-4 rounded-xl border p-4"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><BellIcon className="size-5 shrink-0" />{items ? t(locale,'reminderBasketTitle') : t(locale,'reminderProductTitle')}</summary><form className="mt-3" onSubmit={subscribe}><FieldGroup className="grid gap-4"><p className="m-0 text-xs leading-5">{t(locale,'reminderNote')}</p>{!items ? <Field><FieldLabel htmlFor="customer-reminders-field-1">{t(locale,'reminderLabel')}</FieldLabel><NativeSelect id="customer-reminders-field-1" value={choices.some(item => item[0] === kind) ? kind : choices[0]![0]} onChange={event => setKind(event.target.value)}>{choices.map(([value, label]) => <option key={value} value={value}>{a(label)}</option>)}</NativeSelect></Field> : <p className="m-0 text-sm">{tf(locale,'reminderBasketDelay',{hours:policy!.cartDelayHours})}</p>}{kind === 'replenishment' ? <Field><FieldLabel htmlFor="customer-reminders-field-2">{t(locale,'reminderIn')}</FieldLabel><NativeSelect id="customer-reminders-field-2" value={days} onChange={event => setDays(Number(event.target.value))}>{[14, 30, 60, 90].map(value => <option key={value} value={value}>{tf(locale,'reminderDays',{days:value})}</option>)}</NativeSelect></Field> : null}<Field orientation="horizontal" className="min-h-11"><Checkbox id="customer-reminders-field-3" required className="shrink-0" /><FieldLabel htmlFor="customer-reminders-field-3" className="min-h-11 flex-1 cursor-pointer">{t(locale,'reminderConsent')}</FieldLabel></Field><Button variant="default" size="default" shape="pill" type="submit" disabled={busy} className="w-fit">{busy ? t(locale,'reminderSaving') : t(locale,'reminderSave')}</Button><p role="status" className="m-0 text-xs">{a(message)}</p>{message === t(locale,'reminderSignIn') ? <Link href="/account" className="inline-flex min-h-11 items-center text-sm">{t(locale,'reminderSignInLink')}</Link> : null}</FieldGroup></form></details>;
}
const listSchema = z.array(reminderDtoSchema);
export function CustomerReminders() {
 const {a,locale}=useAccountCopy();

  const [rows, setRows] = useState<z.infer<typeof listSchema>>([]), [message, setMessage] = useState('Loading your reminders…'), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; void request('/api/customer/reminders').then(value => { if (active) { setRows(listSchema.parse(value)); setMessage(''); } }).catch(error => { if (active) setMessage(error.message); }); return () => { active = false; }; }, []);
  async function cancel(id: string) { setBusy(true); try { setRows(listSchema.parse(await request('/api/customer/reminders', { operation: 'cancel', id }))); setMessage('Reminder cancelled.'); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }
  async function restore(id: string) {
    setBusy(true);
    try { const items = z.array(z.object({ id: z.string(), quantity: z.number().int().positive() })).parse(await request('/api/customer/recovery-cart', { id })); const before = storedCart();
      const eligible: { id: string; quantity: number }[] = []; for (const item of items) if (!await checkAddition(item.id, Math.max(item.quantity, before.find(line => line.id === item.id)?.quantity ?? 0))) eligible.push({ id: item.id, quantity: Math.max(item.quantity, before.find(line => line.id === item.id)?.quantity ?? 0) });
      if (JSON.stringify(before) !== JSON.stringify(storedCart())) throw new Error('Your basket changed. Please try again.');
      saveCart([...before.filter(line => !eligible.some(item => item.id === line.id)), ...eligible]); setMessage(`${eligible.length} available products restored. Current prices apply at checkout.`);
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <section id="reminders" className="my-6 rounded-2xl border bg-white p-5"><h2 className="mb-2 text-xl">{a("Your reminders")}</h2><p className="text-sm">{a("Reminders you requested. Each sends once; your marketing preferences are separate.")}</p>{message ? <p role="status" className="text-sm">{a(message)}</p> : null}{!rows.length && !message ? <p className="text-sm">{a("Choose a reminder from an eligible product page or save a basket for later.")}</p> : <ul className="m-0 list-none divide-y p-0">{rows.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><h3 className="mb-1 text-sm font-medium">{row.productName}</h3><p className="m-0 text-xs">{a(row.kind)} · {row.state === 'uncertain' ? a("Delivery unconfirmed; request again if needed") : a(row.state)}{row.kind === 'replenishment' ? ` · ${row.dueAt.toLocaleDateString(locale==='ar'?'ar-AE':'en-AE')}` : ''}</p></div><div className="flex flex-wrap gap-2">{row.kind === 'cart' && !['cancelled', 'expired'].includes(row.state) ? <Button variant="outline" size="default" type="button" disabled={busy} onClick={() => void restore(row.id)}>{a("Restore available items")}</Button> : null}{!['cancelled', 'expired'].includes(row.state) ? <Button variant="outline" size="default" type="button" disabled={busy} onClick={() => void cancel(row.id)}>{a("Cancel reminder")}</Button> : null}</div></li>)}</ul>}</section>;
}
export function UnsubscribeReminder({ token }: { token: string }) {
 const {a}=useAccountCopy();

  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  return <section className="mx-auto max-w-lg rounded-2xl border bg-white p-6"><h1 className="mb-3 text-2xl">{a("Cancel this reminder")}</h1><p className="text-sm">{a("This cancels only the requested reminder. It does not affect your orders or other account preferences.")}</p><Button variant="default" size="default" type="button" disabled={busy || message === 'Reminder cancelled.'} onClick={() => { setBusy(true); void request('/api/growth/unsubscribe', { token }).then(() => setMessage('Reminder cancelled.')).catch(error => setMessage(error.message)).finally(() => setBusy(false)); }}>{busy ? a("Cancelling…") : a("Cancel reminder")}</Button><p role="status" className="mt-4 text-sm">{a(message)}</p></section>;
}
