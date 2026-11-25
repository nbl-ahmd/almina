'use client';
import { inputClass, selectClass } from './shadcn/styles';

import { useEffect, useState, type FormEvent } from 'react';
import { couponListSchema, couponRecordSchema, couponSaveSchema, type CouponRecord } from '@almina/contracts';
import { GrowthProductPicker } from './growth-product-picker';

const field = 'grid min-w-0 gap-1.5 text-sm font-medium text-ink';
const secondary = 'min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink';
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

type Scope = CouponRecord['scope'];
function scopeSummary(scope: Scope) {
  return scope.type === 'all' ? 'All eligible products' : scope.type === 'products' ? `${scope.productIds.length} selected ${scope.productIds.length === 1 ? 'product' : 'products'}` : `${scope.categoryIds.length} ${scope.categoryIds.length === 1 ? 'category' : 'categories'}`;
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
  const [scopeType, setScopeType] = useState<Scope['type']>('all');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let active = true;
    void fetch('/api/growth/admin/categories').then(response => response.ok ? response.json() : null)
      .then(body => { if (active && Array.isArray(body?.data)) setCategories(body.data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

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
    const scope = coupon?.scope ?? { type: 'all' as const };
    setScopeType(scope.type);
    setProductIds(scope.type === 'products' ? scope.productIds : []);
    setCategoryIds(scope.type === 'categories' ? scope.categoryIds : []);
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
        title: value('title'), description: value('description'), listed: data.has('listed'),
        scope: scopeType === 'products' ? { type: 'products', productIds } : scopeType === 'categories' ? { type: 'categories', categoryIds } : { type: 'all' },
      });
      if (!parsed.success) {
        setIssue(scopeType !== 'all' && (scopeType === 'products' ? !productIds.length : !categoryIds.length)
          ? `Choose at least one ${scopeType === 'products' ? 'product' : 'category'}, or apply the coupon to all products.`
          : 'Check the code, amount and dates. Use 3–32 letters, digits or hyphens and an end date after the start.');
        return;
      }
      if (data.has('listed') && !value('title').trim()) { setIssue('Add a customer-facing title before showing this coupon in the offers list.'); return; }
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

  return <section className="my-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
    <div className="min-w-0 rounded-xl bg-surface p-4 shadow-card sm:p-5">
      <h2 className="mb-3 text-base font-semibold text-ink">Coupon codes</h2>
      <p className="mb-4 max-w-prose text-sm leading-relaxed text-mute">Campaign discounts on reviewed general-sale products. Customers can use one code per retail order.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-2" disabled={busy} onClick={() => edit(null)}>Create coupon</button>
        <button type="button" className={secondary} disabled={busy} onClick={() => { setBusy(true); setIssue(''); edit(null); setVersion(value => value + 1); }}>Reload</button>
      </div>
      <ul className="m-0 list-none space-y-2 p-0">
        {coupons.map(coupon => <li key={coupon.code}>
          <button type="button" className="flex min-h-11 w-full cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-soft px-3 py-2 text-start text-sm text-ink aria-pressed:bg-fill" aria-pressed={editing?.code === coupon.code} disabled={busy} onClick={() => edit(coupon)}>
            <span className="min-w-0 font-semibold wrap-anywhere">{coupon.code}</span>
            <span className="text-xs tabular-nums text-mute">{status(coupon)} · {coupon.uses}{coupon.maximumUses !== null ? ` / ${coupon.maximumUses}` : ''} used</span>
            <span className="basis-full text-xs text-mute">{coupon.title ? `${coupon.title} · ` : ''}{scopeSummary(coupon.scope)}{coupon.listed ? ' · Shown in offers' : ''}</span>
          </button>
        </li>)}
      </ul>
      {coupons.length > 0 && <p className="mt-3 text-xs text-mute">{coupons.length} {coupons.length === 1 ? 'coupon' : 'coupons'} {next ? 'shown' : 'total'}</p>}
      {!busy && coupons.length === 0 && <p className="mb-4 max-w-prose text-sm leading-relaxed text-mute">No coupons yet.</p>}
      {next && <button className="mt-3 min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink" type="button" disabled={busy} onClick={() => void loadMore()}>Load more</button>}
    </div>
    <form key={formVersion} onSubmit={submit} className="min-w-0 rounded-xl bg-surface border border-line p-5">
      <h3 className="mb-3 text-base font-semibold text-ink">{editing ? `Edit ${editing.code}` : 'New coupon'}</h3>
      <fieldset disabled={busy} className="m-0 grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2">
        <label className={field}>Code<input className={inputClass} name="code" defaultValue={editing?.code} disabled={!!editing} minLength={3} maxLength={32} required placeholder="WELCOME10" /></label>
        <label className={field}>Discount type<select className={selectClass} value={type} onChange={event => setType(event.target.value === 'fixed' ? 'fixed' : 'percent')}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
        <label className={field}>{type === 'percent' ? 'Discount (%)' : 'Discount (AED)'}<input className={inputClass} key={type} name="amount" type="number" min={type === 'percent' ? 1 : 0.01} max={type === 'percent' ? 100 : 1_000_000} step="0.01" defaultValue={editing?.discount.type === type ? ('basisPoints' in editing.discount ? editing.discount.basisPoints : editing.discount.amountMinor) / 100 : ''} required /></label>
        {type === 'percent' && <label className={field}>Maximum discount (AED)<input className={inputClass} name="cap" type="number" min="0.01" max={1_000_000} step="0.01" defaultValue={editing?.discount.type === 'percent' && editing.discount.capMinor !== null ? editing.discount.capMinor / 100 : ''} placeholder="No cap" /></label>}
        <label className={field}>Minimum eligible spend (AED)<input className={inputClass} name="minimum" type="number" min="0" max={1_000_000} step="0.01" defaultValue={(editing?.minimumMinor ?? 0) / 100} required /></label>
        <label className={field}>Total usage limit<input className={inputClass} name="limit" type="number" min="1" max={1_000_000} defaultValue={editing?.maximumUses ?? ''} placeholder="Unlimited" /></label>
        <label className={field}>Starts (UAE time)<input className={inputClass} name="start" type="datetime-local" defaultValue={dateInput(editing?.startsAt)} /></label>
        <label className={field}>Ends (UAE time)<input className={inputClass} name="end" type="datetime-local" defaultValue={dateInput(editing?.endsAt)} /></label>
        <label className={`${field} sm:col-span-2`}>Customer-facing title<input className={inputClass} name="title" maxLength={80} defaultValue={editing?.title ?? ''} placeholder="e.g. 15% off skincare" /><span className="text-xs font-normal text-mute">Shown in the cart’s offers list and when the code is applied.</span></label>
        <label className={`${field} sm:col-span-2`}>Description and terms<textarea className={inputClass} name="description" maxLength={400} rows={3} defaultValue={editing?.description ?? ''} placeholder="e.g. Valid on skincare products. Minimum spend AED 50. One code per order." /></label>
        <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0 sm:col-span-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">Applies to</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Applies to">
            {([['all', 'All eligible products'], ['categories', 'Selected categories'], ['products', 'Selected products']] as const).map(([option, label]) =>
              <label key={option} className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm"><input type="radio" name="scope" checked={scopeType === option} onChange={() => setScopeType(option)} />{label}</label>)}
          </div>
          {scopeType === 'categories' ? <div className="grid gap-2">
            <p className="m-0 text-xs text-mute">Choose the categories whose products this code can discount. Medicines and unreviewed products never qualify.</p>
            <div className="flex flex-wrap gap-2">{categories.map(category => <label key={category.id} className="flex min-h-10 items-center gap-2 rounded-full bg-soft px-3 text-sm"><input type="checkbox" checked={categoryIds.includes(category.id)} onChange={event => setCategoryIds(ids => event.target.checked ? [...ids, category.id].slice(0, 50) : ids.filter(id => id !== category.id))} />{category.name}</label>)}</div>
            {!categories.length ? <p className="m-0 text-xs text-mute">Categories could not be loaded. Reload the page to try again.</p> : null}
          </div> : null}
          {scopeType === 'products' ? <GrowthProductPicker ids={productIds} onChange={setProductIds} limit={200} label="Products this code can discount" hint="Only reviewed general-sale products qualify, even if chosen here." /> : null}
        </fieldset>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input name="listed" type="checkbox" defaultChecked={editing?.listed ?? false} /> Show in the customer offers list (cart “View offers”)</label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input name="enabled" type="checkbox" defaultChecked={editing?.enabled ?? false} /> Enable coupon</label>
        <button type="submit" className="min-h-11 w-fit rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-2">Save coupon</button>
      </fieldset>
      {issue && <p role="alert" className="mt-3 mb-0 text-sm">{issue}</p>}
      {message && <p role="status" className="mt-3 mb-0 text-sm">{message}</p>}
    </form>
  </section>;
}
