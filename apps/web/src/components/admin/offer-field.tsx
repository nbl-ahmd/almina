'use client';
import { useEffect, useRef, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from './shadcn/toggle-group';
import { inputClass } from './shadcn/styles';

type Mode = 'none' | 'percent' | 'amount' | 'price';
const labels: Record<Mode, string> = { none: 'No offer', percent: '% off', amount: 'AED off', price: 'Set price' };
const hints: Record<Mode, string> = { none: '', percent: 'Percentage taken off the price.', amount: 'Amount taken off the price.', price: 'The price customers pay while the offer is on.' };

/** Offer builder. The store keeps one value, the sale price; percent and amount are converted here so the admin never does the maths. */
export function OfferField({ name, label, initial }: { name: string; label: string; initial?: string | undefined }) {
  const [mode, setMode] = useState<Mode>(initial ? 'price' : 'none');
  const [value, setValue] = useState(initial ?? '');
  const [price, setPrice] = useState(Number.NaN);
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = anchor.current?.closest('form')?.querySelector<HTMLInputElement>('input[name="price"]');
    if (!input) return;
    const read = () => setPrice(Number(input.value));
    read();
    input.addEventListener('input', read);
    return () => input.removeEventListener('input', read);
  }, []);
  const amount = Number(value);
  const raw = mode === 'percent' ? price * (1 - amount / 100) : mode === 'amount' ? price - amount : amount;
  const sale = mode === 'none' || !value ? Number.NaN : Math.round(raw * 100) / 100;
  const valid = Number.isFinite(sale) && sale >= 0 && Number.isFinite(price) && sale < price;
  const off = valid ? Math.round((1 - sale / price) * 100) : 0;
  const problem = mode !== 'none' && value && !valid ? (Number.isFinite(price) ? 'The sale price must be lower than the price.' : 'Enter the price first.') : '';
  return (
    <div ref={anchor} className="grid min-w-0 gap-2 sm:col-span-2">
      <input type="hidden" name={name} value={valid ? sale.toFixed(2) : ''} />
      <span className="text-[13px] font-medium text-ink" id={`${name}-label`}>{label}</span>
      <ToggleGroup type="single" value={mode} onValueChange={next => { if (next) { setMode(next as Mode); setValue(''); } }} aria-labelledby={`${name}-label`} className="w-fit max-w-full flex-wrap">
        {(Object.keys(labels) as Mode[]).map(item => <ToggleGroupItem key={item} value={item}>{labels[item]}</ToggleGroupItem>)}
      </ToggleGroup>
      {mode !== 'none' ? (
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-40">
              <input type="number" inputMode="decimal" min={0} step={mode === 'percent' ? '1' : '0.01'} max={mode === 'percent' ? 99 : undefined} value={value} onChange={event => setValue(event.target.value)}
                aria-label={labels[mode]} aria-invalid={problem ? true : undefined} placeholder={mode === 'percent' ? '20' : '0.00'} className={`${inputClass} pr-12`} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[13px] text-mute">{mode === 'percent' ? '%' : 'AED'}</span>
            </div>
            {valid ? <p className="m-0 text-[13px] text-ink-2" role="status">Customers pay <strong>AED {sale.toFixed(2)}</strong> <span className="text-mute">· {off}% off</span></p> : null}
          </div>
          {problem ? <p role="alert" className="m-0 text-xs font-medium text-bad">{problem}</p> : <p className="m-0 text-xs text-mute">{hints[mode]}</p>}
        </div>
      ) : null}
    </div>
  );
}
