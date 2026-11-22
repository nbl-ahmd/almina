'use client';
import { selectClass } from './shadcn/styles';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type OrderRouting } from '@almina/contracts';
import { adminRequest } from './controls';
export function StaffBranchAssignment({ id, branchId, branches }: { id: string; branchId: string | null; branches: OrderRouting['branches'] }) {
  const router = useRouter(), [selected, setSelected] = useState(branchId ?? ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <form className="grid min-w-48 gap-2" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await adminRequest(`auth/users/${id}/assignment`, 'PUT', { branchId: selected || null, expectedBranchId: branchId, reason: 'Administrator updated branch responsibility' }); router.refresh(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Assignment failed.'); } finally { setBusy(false); } }}><label className="grid gap-1 text-sm">Branch assignment<select className={selectClass} value={selected} onChange={event => setSelected(event.target.value)}><option value="">No branch / legacy access</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><button disabled={busy || selected === (branchId ?? '')} className="inline-flex h-9 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-ink no-underline hover:bg-soft">{busy ? 'Saving…' : 'Save branch'}</button>{error ? <p role="alert">{error}</p> : null}</form>;
}
