'use client';
import { useEffect, useId, useState } from 'react';
import { wholesaleRequest } from '../wholesale/request';
export type ProductAudience = { audience?: string | undefined; wholesaleAudience?: string | undefined; wholesaleTypeIds?: string[] | undefined };
export function ProductAudienceFields({ initial }: { initial: ProductAudience }) {
  const fieldId = useId();
  const [audience, setAudience] = useState(initial.audience ?? 'all');
  const [scope, setScope] = useState(initial.wholesaleAudience ?? 'all');
  const [ids, setIds] = useState(initial.wholesaleTypeIds ?? []);
  const [types, setTypes] = useState<{id:string;name:string;active:boolean}[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let active = true; void wholesaleRequest<typeof types>('admin/types').then(result => { if (active) setTypes(result.data); }).catch(() => { if (active) setFailed(true); }); return () => { active = false; }; }, []);
  return <fieldset className="grid gap-4 rounded-xl border border-border p-4 col-span-full">
    <legend className="px-2 font-semibold">Product visibility</legend>
    <div className="grid gap-2"><label htmlFor={fieldId+"-audience"}>Show this product to</label><select id={fieldId+"-audience"} name="audience" value={audience} onChange={event => setAudience(event.target.value)}><option value="all">All — retail and wholesale</option><option value="retail">Retail only</option><option value="wholesale">Wholesale only</option></select></div>
    <div className="grid gap-2"><label htmlFor={fieldId+"-scope"}>Wholesale business types</label><select id={fieldId+"-scope"} name="wholesaleAudience" value={scope} onChange={event => setScope(event.target.value)}><option value="all">All business types</option><option value="selected">Selected business types only</option></select></div>
    <input type="hidden" name="wholesaleTypeIds" value={JSON.stringify(ids)} />
    {scope === 'selected' ? <div className="grid gap-2 sm:grid-cols-2">{types.map(type => <div key={type.id} className="flex items-center gap-2"><input id={fieldId+"-"+type.id} type="checkbox" checked={ids.includes(type.id)} onChange={event => setIds(current => event.target.checked ? [...current, type.id] : current.filter(id => id !== type.id))} /><label htmlFor={fieldId+"-"+type.id} className="min-h-11 justify-center">{type.name}{type.active ? '' : ' (paused)'}</label></div>)}{ids.filter(id => !types.some(type => type.id === id)).map(id => <p key={id} className="text-sm">Saved business type: {id}</p>)}</div> : null}
    <p className="m-0 text-sm text-muted">Wholesale access also requires an approved business, catalogue assignment and an enabled price for its business type. Selecting no business types under “Selected” hides the product from every wholesale business. Retail-only products never appear in wholesale.</p>
    {audience === 'wholesale' ? <p className="m-0 text-sm">This product will be removed from the public store, search, sitemap and retail checkout.</p> : null}
    {failed ? <p role="status" className="m-0 text-sm">Business types could not load. Saved selections are preserved. Reload to change them, or manage types in Admin → Wholesale.</p> : !types.length ? <p className="m-0 text-sm">Create business types such as Salon or Pharmacy in Admin → Wholesale.</p> : null}
  </fieldset>;
}
