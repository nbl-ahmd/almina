'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { reminderDtoSchema, retentionPolicySchema, type RetentionPolicy } from '@almina/contracts';
import { BellIcon } from '@heroicons/react/24/outline';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import { checkAddition } from '../app/(storefront)/cart/actions';
import { z } from 'zod';

async function request(path: string, body?: unknown) {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json() as { data?: unknown; error?: { message?: string } };
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to request a reminder.' : data.error?.message || 'Unable to save your reminder. Please try again.');
  return data.data;
}
const optionsSchema = retentionPolicySchema.extend({ deliveryReady: z.boolean() });
export function ReminderSignup({ productId, stock = 0, items }: { productId?: string; stock?: number; items?: { id: string; quantity: number }[] }) {
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null), [kind, setKind] = useState(items ? 'cart' : stock > 0 ? 'price-drop' : 'restock'), [days, setDays] = useState(30), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { let active = true; void request('/api/growth/reminder-options').then(value => { const options = optionsSchema.parse(value); if (active && options.enabled && options.deliveryReady) setPolicy(options); }).catch(() => undefined); return () => { active = false; }; }, []);
  const choices = policy ? (items ? policy.cartRecovery ? [['cart', 'Remind me about this basket']] : [] : [...(stock <= 0 && policy.restock ? [['restock', 'Back in stock']] : []), ...(policy.priceDrop ? [['price-drop', 'Price drop']] : []), ...(policy.replenishment ? [['replenishment', 'Time to buy again']] : [])]) : [];
  if (!choices.length) return null;
  async function subscribe(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await request('/api/customer/reminders', { operation: 'subscribe', kind: choices.some(item => item[0] === kind) ? kind : choices[0]![0], consent: true, ...(items ? { items } : { productId }), ...(kind === 'replenishment' ? { days } : {}) }); setMessage('Reminder saved. Manage or cancel it in your account.'); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <details className="my-4 rounded-xl border border-border bg-surface p-4"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><BellIcon className="size-5 shrink-0" />{items ? 'Save this basket for later' : 'Get a product reminder'}</summary><form className="mt-3 grid gap-3" onSubmit={subscribe}><p className="m-0 text-xs leading-5 text-muted">One email for the reminder you choose. General care products only. No prescription or medicine reminders.</p>{!items ? <label className="grid gap-1 text-sm">Reminder<select value={choices.some(item => item[0] === kind) ? kind : choices[0]![0]} onChange={event => setKind(event.target.value)}>{choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : <p className="m-0 text-sm">Send one reminder after {policy!.cartDelayHours} hours if I have not ordered.</p>}{kind === 'replenishment' ? <label className="grid gap-1 text-sm">Remind me in<select value={days} onChange={event => setDays(Number(event.target.value))}>{[14, 30, 60, 90].map(value => <option key={value} value={value}>{value} days</option>)}</select></label> : null}<label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" required className="mt-1 size-4 min-h-0 w-4 shrink-0" />Email this reminder to my verified account email. I can cancel anytime.</label><button type="submit" disabled={busy} className="w-fit rounded-full text-sm">{busy ? 'Saving…' : 'Save reminder'}</button><p role="status" className="m-0 text-xs text-muted">{message}</p>{message.startsWith('Sign in') ? <Link href="/account" className="inline-flex min-h-11 items-center text-sm text-brand">Sign in to your account</Link> : null}</form></details>;
}
const listSchema = z.array(reminderDtoSchema);
export function CustomerReminders() {
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
  return <section id="reminders" className="my-6 rounded-2xl border border-border bg-white p-5"><h2 className="mb-2 text-xl">Your reminders</h2><p className="text-sm text-muted">Reminders you requested. Each sends once; your marketing preferences are separate.</p>{message ? <p role="status" className="text-sm">{message}</p> : null}{!rows.length && !message ? <p className="text-sm text-muted">Choose a reminder from an eligible product page or save a basket for later.</p> : <ul className="m-0 list-none divide-y divide-border p-0">{rows.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><h3 className="mb-1 text-sm font-medium">{row.productName}</h3><p className="m-0 text-xs text-muted">{row.kind.replace('-', ' ')} · {row.state === 'uncertain' ? 'Delivery unconfirmed; request again if needed' : row.state}{row.kind === 'replenishment' ? ` · ${row.dueAt.toLocaleDateString('en-AE')}` : ''}</p></div><div className="flex flex-wrap gap-2">{row.kind === 'cart' && !['cancelled', 'expired'].includes(row.state) ? <button type="button" disabled={busy} onClick={() => void restore(row.id)} className="button-secondary text-xs">Restore available items</button> : null}{!['cancelled', 'expired'].includes(row.state) ? <button type="button" disabled={busy} onClick={() => void cancel(row.id)} className="button-secondary text-xs">Cancel reminder</button> : null}</div></li>)}</ul>}</section>;
}
export function UnsubscribeReminder({ token }: { token: string }) {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  return <section className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-6"><h1 className="mb-3 text-2xl">Cancel this reminder</h1><p className="text-sm text-muted">This cancels only the requested reminder. It does not affect your orders or other account preferences.</p><button type="button" disabled={busy || message === 'Reminder cancelled.'} onClick={() => { setBusy(true); void request('/api/growth/unsubscribe', { token }).then(() => setMessage('Reminder cancelled.')).catch(error => setMessage(error.message)).finally(() => setBusy(false)); }}>{busy ? 'Cancelling…' : 'Cancel reminder'}</button><p role="status" className="mt-4 text-sm">{message}</p></section>;
}
