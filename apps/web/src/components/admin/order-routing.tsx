'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type OrderRouting } from '@almina/contracts';
import { adminRequest } from './controls';
import Link from '../app-link';
export function StaffBranchAssignment({ id, branchId, branches }: { id: string; branchId: string | null; branches: OrderRouting['branches'] }) {
  const router = useRouter(), [selected, setSelected] = useState(branchId ?? ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <form className="grid min-w-48 gap-2" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await adminRequest(`auth/users/${id}/assignment`, 'PUT', { branchId: selected || null, expectedBranchId: branchId, reason: 'Administrator updated branch responsibility' }); router.refresh(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Assignment failed.'); } finally { setBusy(false); } }}><label className="grid gap-1 text-sm">Branch assignment<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">No branch / legacy access</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><button disabled={busy || selected === (branchId ?? '')} className="admin-btn--secondary">{busy ? 'Saving…' : 'Save branch'}</button>{error ? <p role="alert">{error}</p> : null}</form>;
}
export function ReceivingSummary({ pendingCount, reviewCount, oldestPendingAt }: { pendingCount: number; reviewCount: number; oldestPendingAt: string | null }) {
  return <div className="admin-alert grid gap-2 sm:grid-cols-2"><div><strong>{pendingCount} awaiting confirmation</strong><p className="m-0 text-sm">Check payment and address, then confirm the order to start fulfilment.{oldestPendingAt ? ` Oldest waiting since ${new Date(oldestPendingAt).toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}.` : ''}</p></div><div><Link href="/admin/orders?review=1&status=pending">Address review · {reviewCount} awaiting confirmation</Link><p className="m-0 text-sm">Orders needing address review always remain visible to administrators.</p></div></div>;
}
