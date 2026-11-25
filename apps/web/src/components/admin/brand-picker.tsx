'use client';
import { useEffect, useId, useState } from 'react';
import { inputClass } from './shadcn/styles';

/** Brand pages attach to catalogue products by brand name, so staff choose the brand as it is written on products.
 *  Choosing one sets the page's URL name (/brands/<slug>) and starts the title and description. */
export function BrandPicker({ onPick }: { onPick: (name: string) => void }) {
  const id = useId();
  const [brands, setBrands] = useState<string[]>([]);
  const [value, setValue] = useState('');
  useEffect(() => {
    let active = true;
    void fetch('/api/growth/admin/brands').then(response => response.ok ? response.json() : { data: [] }).then(body => { if (active && Array.isArray(body.data)) setBrands(body.data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <label className="grid gap-1.5 text-sm font-medium">Catalogue brand
    <input className={inputClass} list={id} value={value} onChange={event => { setValue(event.target.value); if (brands.includes(event.target.value)) onPick(event.target.value); }} placeholder="Start typing a brand from your products" />
    <datalist id={id}>{brands.map(name => <option key={name} value={name} />)}</datalist>
    <span className="text-xs font-normal text-mute">Pick the brand exactly as it appears on products, so this page lists them. Then add the logo under Image, a description and the page text. A published brand page replaces the automatic one at the same address.</span>
  </label>;
}
