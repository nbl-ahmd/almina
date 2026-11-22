'use client';
import styles from './coupon-manager.module.css';

import { useEffect, useState, type FormEvent } from 'react';
import { couponListSchema, couponRecordSchema, couponSaveSchema, type CouponRecord } from '@almina/contracts';

const endpoint = '/api/growth/admin/coupons';
const dubaiOffset = 4 * 3600000;

function dateInput(value: string | null | undefined) {
  return value ? new Date(Date.parse(value) + dubaiOffset).toISOString().slice(0, 16) : '';
}
function dateValue(value: string) {
  return value ? new Date(value + '+04:00').toISOString() : null;
}

async function list(after?: string) {
  const response = await fetch(after ? endpoint+'?after='+encodeURIComponent(after) : endpoint);
  if (!response.ok) throw new Error('Could not load coupons.');
  return couponListSchema.parse((await response.json()).data);
}

function status(coupon: CouponRecord) {
  const now = Date.now();
  if (!coupon.enabled) return 'Disabled';
  if (coupon.endsAt && Date.parse(coupon.endsAt) <= now) return 'Expired';
  if (coupon.startsAt && Date.parse(coupon.startsAt) > now) return 'Scheduled';
  if (coupon.maximumUses !== null && coupon.uses >= coupon.maximumUses) return 'Limit reached';
  return 'Active';
}

export function CouponManager() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [editing, setEditing] = useState<CouponRecord | null>(null);
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [issue, setIssue] = useState('');
  const [version, setVersion] = useState(0);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void list().then(page => {
      if (active) { setCoupons(page.items); setNext(page.next); }
    }).catch(() => { if (active) setIssue('Could not load coupons. Try Reload.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [version]);

  function edit(coupon: CouponRecord | null) {
    setEditing(coupon);
    setType(coupon?.discount.type ?? 'percent');
    setIssue('');
    setFormVersion(value => value + 1);
  }

  async function loadMore() {
    if (!next) return;
    setBusy(true);
    setIssue('');
    try {
      const page = await list(next);
      setCoupons(items => [...items, ...page.items.filter(item => !items.some(existing => existing.code === item.code))]);
      setNext(page.next);
    } catch { setIssue('Could not load more coupons. Try again.'); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setIssue(''); setMessage('');
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? '');
    try {
      const parsed = couponSaveSchema.safeParse({
        code: editing?.code ?? value('code'), revision: editing?.revision ?? 0, enabled: data.has('enabled'),
        discount: type === 'fixed'
          ? { type, amountMinor: Math.round(Number(value('amount')) * 100) }
          : { type, basisPoints: Math.round(Number(value('amount')) * 100), capMinor: value('cap') ? Math.round(Number(value('cap')) * 100) : null },
        minimumMinor: Math.round(Number(value('minimum')) * 100), maximumUses: value('limit') ? Number(value('limit')) : null,
        startsAt: dateValue(value('start')), endsAt: dateValue(value('end')),
      });
      if (!parsed.success) { setIssue('Check the code, amount and dates. Use 3–32 letters, digits or hyphens and an end date after the start.'); return; }
      setBusy(true);
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify(parsed.data) });
      if (response.status === 409) { setIssue(editing ? 'This coupon was edited elsewhere. Reload before editing again.' : 'That coupon code already exists.'); return; }
      if (!response.ok) throw new Error('Save failed');
      const saved = couponRecordSchema.parse((await response.json()).data);
      setCoupons(items => [...items.filter(item => item.code !== saved.code), saved].sort((a, b) => a.code < b.code ? -1 : 1));
      edit(saved);
      setMessage(`Saved ${saved.code}.`);
    } catch { setIssue('Could not save the coupon. Check the values and try again.'); }
    finally { setBusy(false); }
  }

  return <section className={styles.layout}>
    <div className={styles.panel}>
      <h2 className={styles.heading}>Coupon codes</h2>
      <p className={styles.description}>Campaign discounts on reviewed general-sale products. Customers can use one code per retail order.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={busy} onClick={() => edit(null)}>Create coupon</button>
        <button type="button" className={styles.button} disabled={busy} onClick={() => { setBusy(true); setIssue(''); edit(null); setVersion(value => value + 1); }}>Reload</button>
      </div>
      <ul className={styles.list}>
        {coupons.map(coupon => <li key={coupon.code}>
          <button type="button" className={styles.item} aria-pressed={editing?.code === coupon.code} disabled={busy} onClick={() => edit(coupon)}>
            <span className={styles.code}>{coupon.code}</span>
            <span className={styles.usage}>{status(coupon)} · {coupon.uses}{coupon.maximumUses !== null ? ` / ${coupon.maximumUses}` : ''} used</span>
          </button>
        </li>)}
      </ul>
      {coupons.length > 0 && <p className={styles.count}>{coupons.length} {coupons.length === 1 ? 'coupon' : 'coupons'} {next ? 'shown' : 'total'}</p>}
      {!busy && coupons.length === 0 && <p className={styles.description}>No coupons yet.</p>}
      {next && <button className={styles.loadMore} type="button" disabled={busy} onClick={() => void loadMore()}>Load more</button>}
    </div>
    <form key={formVersion} onSubmit={submit} className={styles.panel}>
      <h3 className={styles.heading}>{editing ? `Edit ${editing.code}` : 'New coupon'}</h3>
      <fieldset disabled={busy} className={styles.fields}>
        <label className={styles.field}>Code<input className={styles.input} name="code" defaultValue={editing?.code} disabled={!!editing} minLength={3} maxLength={32} required placeholder="WELCOME10" /></label>
        <label className={styles.field}>Discount type<select className={styles.input} value={type} onChange={event => setType(event.target.value === 'fixed' ? 'fixed' : 'percent')}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
        <label className={styles.field}>{type === 'percent' ? 'Discount (%)' : 'Discount (AED)'}<input className={styles.input} key={type} name="amount" type="number" min={type === 'percent' ? 1 : 0.01} max={type === 'percent' ? 100 : 1_000_000} step="0.01" defaultValue={editing?.discount.type === type ? ('basisPoints' in editing.discount ? editing.discount.basisPoints : editing.discount.amountMinor) / 100 : ''} required /></label>
        {type === 'percent' && <label className={styles.field}>Maximum discount (AED)<input className={styles.input} name="cap" type="number" min="0.01" max={1_000_000} step="0.01" defaultValue={editing?.discount.type === 'percent' && editing.discount.capMinor !== null ? editing.discount.capMinor / 100 : ''} placeholder="No cap" /></label>}
        <label className={styles.field}>Minimum eligible spend (AED)<input className={styles.input} name="minimum" type="number" min="0" max={1_000_000} step="0.01" defaultValue={(editing?.minimumMinor ?? 0) / 100} required /></label>
        <label className={styles.field}>Total usage limit<input className={styles.input} name="limit" type="number" min="1" max={1_000_000} defaultValue={editing?.maximumUses ?? ''} placeholder="Unlimited" /></label>
        <label className={styles.field}>Starts (UAE time)<input className={styles.input} name="start" type="datetime-local" defaultValue={dateInput(editing?.startsAt)} /></label>
        <label className={styles.field}>Ends (UAE time)<input className={styles.input} name="end" type="datetime-local" defaultValue={dateInput(editing?.endsAt)} /></label>
        <label className={styles.toggle}><input name="enabled" type="checkbox" defaultChecked={editing?.enabled ?? false} /> Enable coupon</label>
        <button type="submit" className={styles.button}>Save coupon</button>
      </fieldset>
      {issue && <p role="alert" className={styles.message}>{issue}</p>}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </form>
  </section>;
}
