'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { deliveryEmirates, reverseLocationDtoSchema } from '@almina/contracts';
import { areaEvent, savedArea, saveArea, type DeliveryArea } from '../lib/location/browser';
import { Icon } from './icon';
const openEvent = 'almina-open-delivery-area';
const promptKey = 'almina.delivery-prompt.v1';
export function DeliveryAreaPrompt() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const sync = () => { try { setShow(!savedArea() && localStorage.getItem(promptKey) !== 'dismissed'); } catch { setShow(false); } };
    queueMicrotask(sync); window.addEventListener(areaEvent, sync);
    return () => window.removeEventListener(areaEvent, sync);
  }, []);
  if (!show) return null;
  return <aside className="border-t border-border bg-subtle" aria-label="Choose your delivery area"><div className="mx-auto flex max-w-[1344px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs text-ocean md:px-6 lg:px-8"><Icon name="pin" /><span>Where would you like your order delivered?</span><button type="button" className="min-h-9 rounded-full border-border bg-white px-3 py-1 text-xs text-teal hover:bg-accent hover:text-teal" onClick={() => window.dispatchEvent(new Event(openEvent))}>Choose area</button><button type="button" className="ml-auto min-h-9 rounded-full border-transparent bg-transparent px-3 py-1 text-xs font-normal text-ocean hover:bg-subtle hover:text-ink" onClick={() => { try { localStorage.setItem(promptKey, 'dismissed'); } catch { /* Dismiss for this visit when storage is unavailable. */ } setShow(false); }}>Not now</button></div></aside>;
}
export function DeliveryLocation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef(0);
  const [area, setArea] = useState<DeliveryArea | null>(null);
  const [emirate, setEmirate] = useState<DeliveryArea['emirate']>('Ras al-Khaimah');
  const [city, setCity] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const requestState = request;
    const sync = () => setArea(savedArea());
    const open = () => { const saved = savedArea(); setEmirate(saved?.emirate ?? 'Ras al-Khaimah'); setCity(saved?.city ?? ''); setMessage(''); dialog.current?.showModal(); };
    queueMicrotask(sync); window.addEventListener(areaEvent, sync); window.addEventListener('storage', sync); window.addEventListener(openEvent, open);
    return () => { requestState.current++; window.removeEventListener(areaEvent, sync); window.removeEventListener('storage', sync); window.removeEventListener(openEvent, open); };
  }, []);
  function close() { request.current++; setWorking(false); dialog.current?.close(); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { saveArea({ emirate, city }); close(); } catch { setMessage('Unable to save this area. Check your browser storage settings and try again.'); }
  }
  async function locate() {
    if (working) return;
    if (!navigator.geolocation || !window.isSecureContext) { setMessage('Location is unavailable. Choose your emirate and area below.'); return; }
    const id = ++request.current;
    setWorking(true); setMessage('Finding your area…');
    const timer = setTimeout(() => { if (id === request.current) { request.current++; setWorking(false); setMessage('Location timed out. You can choose your area below.'); } }, 20000);
    try { navigator.geolocation.getCurrentPosition(position => {
      if (id !== request.current) return;
      void fetch('/api/checkout/location', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }), signal: AbortSignal.timeout(15000) }).then(async response => {
        if (!response.ok) throw new Error('Lookup unavailable');
        const found = reverseLocationDtoSchema.parse(await response.json());
        if (id !== request.current) return;
        setEmirate(found.emirate); setCity(found.city); setMessage('Area found. Check the details below, then save.');
      }).catch(() => { if (id === request.current) setMessage('Unable to find your area right now. Choose it below.'); }).finally(() => { clearTimeout(timer); if (id === request.current) setWorking(false); });
    }, () => { clearTimeout(timer); if (id === request.current) { setWorking(false); setMessage('Location could not be accessed. Choose your area below.'); } }, { timeout: 15000, maximumAge: 60000 }); } catch { clearTimeout(timer); if (id === request.current) { setWorking(false); setMessage('Location is unavailable. Choose your area below.'); } }
  }
  return <><div className="header-location col-span-full row-start-2 min-w-0 md:col-auto md:row-auto max-md:group-has-[.pdp-page]/storefront:hidden max-md:group-has-[.cart-page]/storefront:hidden max-md:group-has-[.catalog-page]/storefront:col-auto max-md:group-has-[.catalog-page]/storefront:row-auto">
    <button type="button" className="flex min-h-11 w-full min-w-0 justify-start gap-2 rounded-xl border-border bg-subtle px-3 py-2 text-left text-xs font-normal text-ocean hover:bg-accent hover:text-ink md:max-w-48" onClick={() => window.dispatchEvent(new Event(openEvent))} aria-label="Choose delivery area"><Icon name="pin" /><span className="min-w-0"><span className="block text-[10px]">Deliver to</span><span className="block truncate font-semibold">{area ? `${area.city}, ${area.emirate}` : 'Choose your area'}</span></span></button></div>
    <dialog ref={dialog} aria-labelledby="delivery-area-heading" onCancel={close} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-5 text-ink shadow-raised backdrop:bg-ink/40 sm:p-7">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 id="delivery-area-heading" className="m-0 text-xl">Where are we delivering?</h2><button type="button" className="size-11 shrink-0 rounded-full border-border bg-page p-2 text-ocean hover:bg-subtle hover:text-ink" onClick={close} aria-label="Close delivery area"><Icon name="close" /></button></div>
      <p className="text-sm text-muted">Save your area for your next visit. You can add your full address at checkout.</p>
      <button type="button" className="mb-4 min-h-11 w-full border-border bg-subtle px-4 text-sm text-teal hover:bg-accent hover:text-teal" onClick={() => { void locate(); }} disabled={working}><Icon name="pin" />{working ? 'Finding area…' : 'Use current location'}</button>
      {message ? <p role="status" className="text-sm text-ocean">{message}</p> : null}
      <form onSubmit={submit} className="grid gap-4"><label className="grid gap-1.5 text-sm font-semibold">Delivery emirate<select value={emirate} onChange={event => setEmirate(event.target.value as DeliveryArea['emirate'])} autoComplete="address-level1" disabled={working}>{deliveryEmirates.map(value => <option key={value}>{value}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold">Delivery city / area<input value={city} onChange={event => setCity(event.target.value)} maxLength={200} autoComplete="address-level2" required placeholder="e.g. Al Nakheel" disabled={working} /></label><button className="mt-1 w-full" type="submit" disabled={working}>Save delivery area</button></form>
      <p className="mt-4 mb-0 text-xs text-muted">Stored on this device. Delivery options are confirmed at checkout.</p>
      <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer py-2">Location data</summary><p>Your coordinates are used only when you choose current location. Only your city and emirate are saved here. Address lookup uses <a className="text-ocean" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>.</p></details>
    </dialog>
  </>;
}
