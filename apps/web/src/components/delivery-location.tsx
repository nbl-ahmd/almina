'use client';
import { Button } from './ui/button';
import { NativeSelect } from './ui/native-select';
import { Input } from './ui/input';
import { Field, FieldLabel, FieldGroup } from './ui/field';

import { t, emirateLabel, type Locale } from '../lib/i18n';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { deliveryEmirates, reverseLocationDtoSchema } from '@almina/contracts';
import { areaEvent, savedArea, saveArea, type DeliveryArea } from '../lib/location/browser';
import { Icon } from './icon';
import { ChevronDownIcon, MapPinIcon } from '@heroicons/react/24/outline';
const openEvent = 'almina-open-delivery-area';
const promptKey = 'almina.delivery-prompt.v1';
export function DeliveryAreaPrompt({ locale = 'en' }: { locale?: Locale }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const sync = () => { try { setShow(!savedArea() && localStorage.getItem(promptKey) !== 'dismissed'); } catch { setShow(false); } };
    queueMicrotask(sync); window.addEventListener(areaEvent, sync);
    return () => window.removeEventListener(areaEvent, sync);
  }, []);
  if (!show) return null;
  return <aside className="border-t border-border bg-subtle" aria-label={t(locale,'areaPromptAria')}><div className="mx-auto flex max-w-[1344px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs text-ocean md:px-6 lg:px-8"><Icon name="pin" /><span>{t(locale,'areaPrompt')}</span><button type="button" className="min-h-9 rounded-full border-border bg-white px-3 py-1 text-xs text-teal hover:bg-accent hover:text-teal" onClick={() => window.dispatchEvent(new Event(openEvent))}>{t(locale,'areaChoose')}</button><button type="button" className="ml-auto min-h-9 rounded-full border-transparent bg-transparent px-3 py-1 text-xs font-normal text-ocean hover:bg-subtle hover:text-ink" onClick={() => { try { localStorage.setItem(promptKey, 'dismissed'); } catch { /* Dismiss for this visit when storage is unavailable. */ } setShow(false); }}>{t(locale,'areaNotNow')}</button></div></aside>;
}
export function DeliveryLocation({ locale = 'en' }: { locale?: Locale }) {
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
    try { saveArea({ emirate, city }); close(); } catch { setMessage(t(locale,'areaSaveError')); }
  }
  async function locate() {
    if (working) return;
    if (!navigator.geolocation || !window.isSecureContext) { setMessage(t(locale,'areaUnavailableBelow')); return; }
    const id = ++request.current;
    setWorking(true); setMessage(t(locale,'areaFinding'));
    const timer = setTimeout(() => { if (id === request.current) { request.current++; setWorking(false); setMessage(t(locale,'areaTimeout')); } }, 20000);
    try { navigator.geolocation.getCurrentPosition(position => {
      if (id !== request.current) return;
      void fetch('/api/checkout/location', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }), signal: AbortSignal.timeout(15000) }).then(async response => {
        if (!response.ok) throw new Error('Lookup unavailable');
        const found = reverseLocationDtoSchema.parse(await response.json());
        if (id !== request.current) return;
        setEmirate(found.emirate); setCity(found.city); setMessage(t(locale,'areaFound'));
      }).catch(() => { if (id === request.current) setMessage(t(locale,'areaLookupError')); }).finally(() => { clearTimeout(timer); if (id === request.current) setWorking(false); });
    }, () => { clearTimeout(timer); if (id === request.current) { setWorking(false); setMessage(t(locale,'areaDenied')); } }, { timeout: 15000, maximumAge: 60000 }); } catch { clearTimeout(timer); if (id === request.current) { setWorking(false); setMessage(t(locale,'areaUnavailable')); } }
  }
  return <><div className="header-location flex min-w-0 justify-end">
    <button type="button" className="group flex min-h-11 w-full max-w-[132px] min-w-0 items-center justify-center gap-2 rounded-full px-1.5 py-1 text-left transition-colors hover:bg-subtle md:max-w-[190px] md:justify-start md:px-2" onClick={() => window.dispatchEvent(new Event(openEvent))} aria-label={t(locale,'areaChooseAria')}><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-care-mint text-teal"><MapPinIcon className="size-4" aria-hidden="true" /></span><span className="min-w-0"><span className="hidden text-xs leading-4 text-muted md:block">{t(locale,'areaDeliverTo')}</span><span className="block truncate text-xs leading-4 font-semibold text-ink md:text-[13px]"><span className="md:hidden">{area ? area.city : t(locale,'areaDeliverTo')}</span><span className="hidden md:inline">{area ? `${area.city}, ${emirateLabel(locale,area.emirate)}` : t(locale,'areaChooseYours')}</span></span></span><ChevronDownIcon className="hidden size-3.5 shrink-0 text-muted transition-transform duration-150 group-hover:translate-y-0.5 motion-reduce:transition-none md:block" aria-hidden="true" /></button></div>
    <dialog ref={dialog} aria-labelledby="delivery-area-heading" onCancel={close} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-5 text-ink shadow-raised backdrop:bg-ink/40 sm:p-7">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 id="delivery-area-heading" className="m-0 text-xl">{t(locale,'areaHeading')}</h2><Button variant="outline" size="icon" shape="pill" type="button" className="shrink-0" onClick={close} aria-label={t(locale,'areaClose')}><Icon name="close" /></Button></div>
      <p className="text-sm text-muted">{t(locale,'areaIntro')}</p>
      <Button variant="outline" size="default" type="button" className="mb-4 w-full" onClick={() => { void locate(); }} disabled={working}><Icon name="pin" />{working ? t(locale,'areaFindingButton') : t(locale,'areaUseLocation')}</Button>
      {message ? <p role="status" className="text-sm text-ocean">{message}</p> : null}
      <form onSubmit={submit}><FieldGroup className="grid gap-4"><Field><FieldLabel htmlFor="delivery-location-field-1">{t(locale,'areaEmirate')}</FieldLabel><NativeSelect id="delivery-location-field-1" value={emirate} onChange={event => setEmirate(event.target.value as DeliveryArea['emirate'])} autoComplete="address-level1" disabled={working}>{deliveryEmirates.map(value => <option key={value} value={value}>{emirateLabel(locale,value)}</option>)}</NativeSelect></Field><Field><FieldLabel htmlFor="delivery-location-field-2">{t(locale,'areaCity')}</FieldLabel><Input id="delivery-location-field-2" value={city} onChange={event => setCity(event.target.value)} maxLength={200} autoComplete="address-level2" required placeholder={t(locale,'areaExample')} disabled={working} /></Field><Button type="submit" disabled={working}>{t(locale,'areaSave')}</Button></FieldGroup></form>
      <p className="mt-4 mb-0 text-xs text-muted">{t(locale,'areaStored')}</p>
      <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer py-2">{t(locale,'areaData')}</summary><p>{t(locale,'areaPrivacy')}<a className="text-ocean" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{t(locale,'areaAttribution')}</a>.</p></details>
    </dialog>
  </>;
}
