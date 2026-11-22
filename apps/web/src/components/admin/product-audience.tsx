'use client';
import { selectClass } from './shadcn/styles';
import { useId, useState } from 'react';
import type { TradeType } from './product-pricing';
export type ProductAudience = { audience?: string | undefined; wholesaleAudience?: string | undefined; wholesaleTypeIds?: string[] | undefined };
export function ProductAudienceFields({ initial, types }: { initial: ProductAudience; types: TradeType[] }) {
  const fieldId = useId();
  const [scope, setScope] = useState(initial.wholesaleAudience ?? 'all');
  const [ids, setIds] = useState(initial.wholesaleTypeIds ?? []);
  /* Grouped by a real heading rather than a fieldset legend: the legend used to
     sit on the panel border inside an already bordered card, which read as two
     nested boxes with a duplicated title. */
  return <>
    <div className="[&_h2]:m-0 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:m-0 [&_p]:text-xs [&_p]:text-mute">
      <div>
        <h2 id={`${fieldId}-title`}>Wholesale access</h2>
        <p>Choose which businesses may order at the rates above.</p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby={`${fieldId}-title`}>
      <div className="grid gap-1.5 text-[13px] font-medium">
        <label htmlFor={fieldId + '-scope'}>Wholesale business types</label>
        <select className={selectClass} id={fieldId + '-scope'} name="wholesaleAudience" value={scope} onChange={event => setScope(event.target.value)}>
          <option value="all">All business types</option>
          <option value="selected">Selected business types only</option>
        </select>
      </div>
      <input type="hidden" name="wholesaleTypeIds" value={JSON.stringify(ids)} />
      {scope === 'selected' ? (
        <div className="grid gap-1.5 text-[13px] font-medium sm:col-span-2">
          <span className="text-[13px] font-medium">Business types with access</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {types.map(type => (
              <label key={type.id} className="flex items-center gap-2.5 rounded-lg bg-soft p-3 text-[13px] font-medium" htmlFor={fieldId + '-' + type.id}>
                <input id={fieldId + '-' + type.id} type="checkbox" checked={ids.includes(type.id)} onChange={event => setIds(current => event.target.checked ? [...current, type.id] : current.filter(id => id !== type.id))} />
                <span>{type.name}{type.active ? '' : ' (paused)'}</span>
              </label>
            ))}
            {ids.filter(id => !types.some(type => type.id === id)).map(id => (
              <p key={id} className="m-0 text-xs text-mute">Saved business type: {id}</p>
            ))}
          </div>
        </div>
      ) : null}
      <p className="m-0 grid gap-1.5 text-xs text-mute sm:col-span-2">
        Wholesale access also requires an approved business, catalogue assignment and an enabled price for its business type. Selecting no business types under “Selected” hides the product from every wholesale business. Retail-only products never appear in wholesale.
      </p>
    </div>
  </>;
}
