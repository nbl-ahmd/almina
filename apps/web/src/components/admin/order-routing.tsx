'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { orderRoutingSchema, rakDeliveryAreas, type OrderRouting } from '@almina/contracts';
import { adminRequest } from './controls';
import { Card } from './ui';
import Link from '../app-link';
export function OrderRoutingSetup({ initial, staffing = [], legacyStaff = 0 }: { initial: OrderRouting; staffing?: { branchId: string; count: number }[]; legacyStaff?: number }) {
  const router = useRouter();
  const [policy, setPolicy] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [search, setSearch] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    const parsed = orderRoutingSchema.safeParse(policy);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the routing setup.'); return; }
    setBusy(true);
    try { const result = await adminRequest('auth/order-routing', 'PUT', parsed.data) as OrderRouting; setPolicy(orderRoutingSchema.parse({ revision: result.revision, active: result.active, branches: result.branches, fallbackBranchId: result.fallbackBranchId })); setMessage('Routing saved. The same rules now control order access and push recipients.'); router.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Routing could not be saved.'); }
    finally { setBusy(false); }
  }
  return <Card title="Order routing" description="Create operational branches, assign each RAK area once, then choose who receives every other address. This setup is separate from the public branch directory.">
    <p className="admin-alert">{policy.active ? 'Branch routing is active.' : 'Legacy city access remains active until you enable branch routing.'} Administrators always retain access to every order.</p>
    {legacyStaff > 0 ? <p className="admin-alert admin-alert--danger">{legacyStaff} staff account(s) need a valid branch assignment before routing can be activated. Save branches first, assign the accounts below, then activate.</p> : null}
    <form onSubmit={save} className="grid gap-5">
      <label className="grid gap-2">Find a RAK area<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search English or Arabic area names" /></label>
      {policy.branches.map((branch, index) => <fieldset key={branch.id} className="grid min-w-0 gap-3 rounded-xl border border-border p-4"><legend className="px-2 font-semibold">Branch {index + 1}</legend>
        <label className="grid gap-1">Branch name<input required maxLength={100} value={branch.name} onChange={event => setPolicy({ ...policy, branches: policy.branches.map(row => row.id === branch.id ? { ...row, name: event.target.value } : row) })} /></label>
        <p className="m-0 text-sm text-muted">{branch.areaIds.length} area(s) · {staffing.find(row => row.branchId === branch.id)?.count ?? 0} staff account(s). Multiple staff may serve the same branch.</p>
        <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">Choose RAK areas · {branch.areaIds.length} selected</summary><div role="group" aria-label={`Assigned RAK areas for ${branch.name || `branch ${index + 1}`}`} className="mt-3 grid max-h-64 gap-1 overflow-y-auto">
          {rakDeliveryAreas.filter(area => branch.areaIds.includes(area.id) || (area.name + ' ' + area.aliases.join(' ')).toLowerCase().includes(search.toLowerCase())).map(area => {
            const owner = policy.branches.find(row => row.id !== branch.id && row.areaIds.includes(area.id));
            return <label key={area.id} className={`admin-routing-choice min-h-11 items-center gap-3 rounded-md p-2 text-sm ${owner ? 'text-muted' : ''}`}><input type="checkbox" className="size-5 min-h-0 w-5 shrink-0" checked={branch.areaIds.includes(area.id)} disabled={!!owner} onChange={event => setPolicy({ ...policy, branches: policy.branches.map(row => row.id === branch.id ? { ...row, areaIds: event.target.checked ? [...row.areaIds, area.id] : row.areaIds.filter(id => id !== area.id) } : row) })} /><span>{area.name}{owner ? ` — assigned to ${owner.name}` : ''}</span></label>;
          })}
        </div></details><p className="m-0 text-xs text-muted">An area can belong to one branch only. Unselected areas go to the fallback branch. Save after changing selections.</p>
        <button type="button" className="admin-btn--secondary justify-self-start" onClick={() => setPolicy({ ...policy, branches: policy.branches.filter(row => row.id !== branch.id), fallbackBranchId: policy.fallbackBranchId === branch.id ? null : policy.fallbackBranchId })}>Remove branch from routing</button>
      </fieldset>)}
      <button type="button" className="admin-btn--secondary justify-self-start" disabled={policy.branches.length >= 20} onClick={() => setPolicy({ ...policy, branches: [...policy.branches, { id: crypto.randomUUID(), name: '', areaIds: [] }] })}>Add routing branch</button>
      <label className="grid gap-1">Fallback branch<select value={policy.fallbackBranchId ?? ''} onChange={event => setPolicy({ ...policy, fallbackBranchId: event.target.value || null })}><option value="">Choose a branch</option>{policy.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name || 'Unnamed branch'}</option>)}</select></label>
      <p className="m-0 text-sm text-muted">Receives all unassigned areas, other emirates and unrecognized names, including spelling mistakes. Unrecognized addresses also stay in Address review. No fuzzy name guesses.</p>
      <label className="admin-routing-choice"><input type="checkbox" className="size-5 min-h-0 w-5" checked={policy.active} onChange={event => setPolicy({ ...policy, active: event.target.checked })} />Enable branch routing</label>
      {error ? <p role="alert" className="admin-alert admin-alert--danger">{error}</p> : null}{message ? <p role="status" className="admin-alert admin-alert--success">{message}</p> : null}
      <button disabled={busy} className="justify-self-start">{busy ? 'Saving…' : 'Save routing setup'}</button>
    </form>
    <p className="mt-4 text-xs text-muted">Area names: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>. This delivery list is a saved reference, not live boundary coverage. Missing names always reach the fallback branch.</p>
  </Card>;
}
export function StaffBranchAssignment({ id, branchId, branches }: { id: string; branchId: string | null; branches: OrderRouting['branches'] }) {
  const router = useRouter(), [selected, setSelected] = useState(branchId ?? ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <form className="grid min-w-48 gap-2" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await adminRequest(`auth/users/${id}/assignment`, 'PUT', { branchId: selected || null, expectedBranchId: branchId, reason: 'Administrator updated branch responsibility' }); router.refresh(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Assignment failed.'); } finally { setBusy(false); } }}><label className="grid gap-1 text-sm">Branch assignment<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">No branch / legacy access</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><button disabled={busy || selected === (branchId ?? '')} className="admin-btn--secondary">{busy ? 'Saving…' : 'Save branch'}</button>{error ? <p role="alert">{error}</p> : null}</form>;
}
export function OrderAreaReview({ orderId, revision, currentArea }: { orderId: string; revision: number; currentArea: string | null }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <details className="admin-create-panel"><summary>Review or correct delivery area</summary><form className="grid gap-3 p-4" onSubmit={async event => { event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(''); try { await adminRequest(`orders/${orderId}/routing`, 'PUT', { areaId: data.get('areaId') === '__fallback__' ? null : data.get('areaId'), reason: data.get('reason'), revision }); router.refresh(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Review failed.'); } finally { setBusy(false); } }}><label className="grid gap-1">Verified delivery area<select name="areaId" required defaultValue={currentArea ?? ''}><option value="">Choose after checking the address</option><option value="__fallback__">Verified other / unlisted area — keep fallback branch</option>{rakDeliveryAreas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="grid gap-1">Reason<input name="reason" required minLength={5} maxLength={500} placeholder="Confirmed area with customer" /></label><p className="m-0 text-sm text-muted">Updates branch routing only. The customer’s original address and order totals are preserved.</p><button disabled={busy}>{busy ? 'Saving…' : 'Confirm delivery area'}</button>{error ? <p role="alert">{error}</p> : null}</form></details>;
}
export function ReceivingSummary({ pendingCount, reviewCount, oldestPendingAt }: { pendingCount: number; reviewCount: number; oldestPendingAt: string | null }) {
  return <div className="admin-alert grid gap-2 sm:grid-cols-2"><div><strong>{pendingCount} awaiting confirmation</strong><p className="m-0 text-sm">Check payment and address, then confirm the order to start fulfilment.{oldestPendingAt ? ` Oldest waiting since ${new Date(oldestPendingAt).toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}.` : ''}</p></div><div><Link href="/admin/orders?review=1&status=pending">Address review · {reviewCount} awaiting confirmation</Link><p className="m-0 text-sm">Unrecognized addresses remain visible to administrators and the fallback branch.</p></div></div>;
}
