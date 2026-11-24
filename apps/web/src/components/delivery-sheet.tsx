'use client';
import { customerRead } from '../lib/account/session-hint';
import { Button } from './ui/button';
import { NativeSelect } from './ui/native-select';
import { Input } from './ui/input';
import { Field, FieldLabel, FieldGroup } from './ui/field';

import { t, emirateLabel, type Locale } from '../lib/i18n';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { deliveryEmirates, reverseLocationDtoSchema, deliveryCoverageDtoSchema, type ReverseLocation, type DeliveryCoverage } from '@almina/contracts';
import { areaEvent, savedArea, saveArea, savedPoint, savePoint, clearPoint, skipLocationPrompt, type DeliveryArea, type SavedPoint } from '../lib/location/browser';
import { browserEnvironment, guidanceFor, requestPosition, type Guidance } from '../lib/location/access';
import type { MapSettle, MapTarget } from './location-pin-map';
import { Icon } from './storefront-icon';
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from './storefront-icons';
const LocationPinMap = dynamic(() => import('./location-pin-map'), { ssr: false, loading: () => <div className="h-full min-h-60 w-full animate-pulse bg-[#e8eee9] motion-reduce:animate-none" aria-hidden="true" /> });
const copy = (ar: boolean) => ({
  useLocation: ar ? 'استخدام موقعي الحالي' : 'Use current location',
  finding: ar ? 'جارٍ تحديد موقعك…' : 'Finding your location…',
  chooseOnMap: ar ? 'اختيار الموقع على الخريطة' : 'Choose on map',
  orManual: ar ? 'أو أدخل منطقتك' : 'or enter your area',
  lede: ar ? 'نعرض لك خيارات التوصيل المتاحة في منطقتك.' : 'We show the delivery options available where you are.',
  saved: ar ? 'موقع التوصيل الحالي' : 'Current delivery location',
  browse: ar ? 'التصفح أولاً' : 'Browse first',
  confirmTitle: ar ? 'تأكيد موقع التوصيل' : 'Confirm delivery location',
  back: ar ? 'رجوع' : 'Back',
  confirm: ar ? 'تأكيد الموقع' : 'Confirm location',
  zoomIn: ar ? 'قرّب الخريطة أكثر لتحديد موقعك بدقة.' : 'Zoom in more to place the pin exactly.',
  move: ar ? 'حرّك الخريطة ليستقر الدبوس على باب منزلك.' : 'Move the map so the pin sits on your door.',
  looking: ar ? 'جارٍ البحث عن العنوان…' : 'Finding the address…',
  outside: ar ? 'نوصل داخل الإمارات فقط. حرّك الدبوس إلى عنوان في الإمارات.' : 'We deliver within the UAE only. Move the pin to a UAE address.',
  busy: ar ? 'خدمة العنوان مشغولة. حاول مرة أخرى بعد لحظات.' : 'Address lookup is busy. Try again in a moment.',
  failed: ar ? 'تعذر قراءة هذا العنوان. حرّك الدبوس قليلاً أو أدخل منطقتك يدوياً.' : 'We could not read this address. Nudge the pin or enter your area manually.',
  retry: ar ? 'إعادة المحاولة' : 'Try again',
  recenter: ar ? 'العودة إلى موقعي' : 'Go to my location',
  covered: (minutes?: number, fee?: number) => ar
    ? `نوصل إلى هنا${minutes ? ` · حوالي ${minutes} دقيقة` : ''}${fee ? ` · رسوم التوصيل ${(fee / 100).toFixed(2)} د.إ` : fee === 0 ? ' · توصيل مجاني' : ''}`
    : `We deliver here${minutes ? ` · about ${minutes} min` : ''}${fee ? ` · delivery AED ${(fee / 100).toFixed(2)}` : fee === 0 ? ' · free delivery' : ''}`,
  notCovered: ar ? 'هذا الموقع خارج منطقة التوصيل حالياً. حرّك الدبوس أو اختر منطقة أخرى.' : 'This spot is outside our delivery area right now. Move the pin or pick another area.',
  myAddresses: ar ? 'عناويني المحفوظة' : 'Your saved addresses',
  detailsTitle: ar ? 'تفاصيل العنوان' : 'Add address details',
  detailsLede: ar ? 'يساعد السائق على الوصول إليك بسرعة.' : 'This helps the rider find your door.',
  labelAs: ar ? 'احفظ كـ' : 'Save as',
  labels: ar ? { Home: 'المنزل', Work: 'العمل', Other: 'أخرى' } : { Home: 'Home', Work: 'Work', Other: 'Other' },
  building: ar ? 'المبنى أو الفيلا' : 'Building or villa',
  flat: ar ? 'رقم الشقة / الطابق' : 'Flat / floor',
  note: ar ? 'ملاحظات للسائق (اختياري)' : 'Note for the rider (optional)',
  saveAddress: ar ? 'حفظ العنوان' : 'Save address',
  skipDetails: ar ? 'تخطي الآن' : 'Skip for now',
  manualInstead: ar ? 'إدخال المنطقة يدوياً' : 'Enter area manually',
});
type Coverage = DeliveryCoverage;
/** A signed-in customer's saved address that carries a pin. Guests get a 401 and simply see no list. */
type BookAddress = { id: string; label: string; emirate: SavedPoint['emirate']; city: string; address: string; latitude: number; longitude: number; isDefault: boolean };
function bookFrom(raw: unknown): BookAddress[] {
  const rows = (raw as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(rows)) return [];
  const found: BookAddress[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    const pin = row.coordinates as { latitude?: unknown; longitude?: unknown } | undefined;
    const emirate = deliveryEmirates.find(name => name === row.emirate);
    if (!emirate || typeof pin?.latitude !== 'number' || typeof pin.longitude !== 'number' || typeof row.id !== 'string' || typeof row.city !== 'string' || typeof row.address !== 'string') continue;
    found.push({ id: row.id, label: typeof row.label === 'string' && row.label ? row.label : 'Saved', emirate, city: row.city, address: row.address, latitude: pin.latitude, longitude: pin.longitude, isDefault: row.isDefault === true });
  }
  return found.sort((a, b) => Number(b.isDefault) - Number(a.isDefault)).slice(0, 3);
}
type Lookup = { state: 'idle' | 'zoom' | 'loading' | 'ok' | 'outside' | 'busy' | 'failed'; result?: ReverseLocation };
/** Loaded on demand by DeliveryLocation; each new `openSignal` opens the sheet. */
export default function DeliverySheet({ locale = 'en', openSignal }: { locale?: Locale; openSignal: number }) {
  const ar = locale === 'ar', c = copy(ar);
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef(0);
  const [area, setArea] = useState<DeliveryArea | null>(null);
  const [point, setPoint] = useState<SavedPoint | null>(null);
  const [view, setView] = useState<'choose' | 'map' | 'details'>('choose');
  const [emirate, setEmirate] = useState<DeliveryArea['emirate']>('Ras al-Khaimah');
  const [city, setCity] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [start, setStart] = useState({ latitude: 25.79, longitude: 55.94, zoom: 12 });
  const [target, setTarget] = useState<MapTarget | undefined>();
  const [center, setCenter] = useState<MapSettle | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const cache = useRef(new Map<string, ReverseLocation>());
  const [draft, setDraft] = useState<{ label: 'Home' | 'Work' | 'Other'; building: string; flat: string; note: string }>({ label: 'Home', building: '', flat: '', note: '' });
  const [pending, setPending] = useState<SavedPoint | null>(null);
  const [book, setBook] = useState<BookAddress[]>([]);
  function open() {
    const saved = savedArea(); setEmirate(saved?.emirate ?? 'Ras al-Khaimah'); setCity(saved?.city ?? '');
    setMessage(''); setGuidance(null); setView('choose'); setLookup({ state: 'idle' }); setDraft({ label: 'Home', building: '', flat: '', note: '' }); setPending(null); dialog.current?.showModal();
    void customerRead('/api/customer/addresses').then(async response => { setBook(response.ok ? bookFrom(await response.json()) : []); }).catch(() => setBook([]));
  }
  useEffect(() => {
    const requestState = request;
    const sync = () => { setArea(savedArea()); setPoint(savedPoint()); };
    queueMicrotask(sync); window.addEventListener(areaEvent, sync); window.addEventListener('storage', sync);
    return () => { requestState.current++; window.removeEventListener(areaEvent, sync); window.removeEventListener('storage', sync); };
  }, []);
  // Each new signal from the header chip (or the first-visit prompt) opens the sheet once.
  useEffect(() => { if (openSignal > 0) queueMicrotask(open); }, [openSignal]);
  // Address lookup for whatever sits under the pin, once the map has been still for a moment (the lookup service allows one request a second).
  useEffect(() => {
    if (view !== 'map' || !center) return;
    if (center.zoom < 15) { queueMicrotask(() => setLookup({ state: 'zoom' })); return; }
    const key = `${center.latitude.toFixed(5)},${center.longitude.toFixed(5)}`;
    const hit = cache.current.get(key);
    if (hit) { queueMicrotask(() => setLookup({ state: 'ok', result: hit })); return; }
    const controller = new AbortController();
    queueMicrotask(() => setLookup({ state: 'loading' }));
    const timer = setTimeout(() => {
      void fetch('/api/checkout/location', { method: 'POST', credentials: 'same-origin', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
        body: JSON.stringify({ latitude: center.latitude, longitude: center.longitude }) }).then(async response => {
        if (response.status === 422) { setLookup({ state: 'outside' }); return; }
        if (response.status === 429) { setLookup({ state: 'busy' }); return; }
        if (!response.ok) { setLookup({ state: 'failed' }); return; }
        const found = reverseLocationDtoSchema.parse(await response.json());
        cache.current.set(key, found); setLookup({ state: 'ok', result: found });
      }).catch(error => { if ((error as Error).name !== 'AbortError') setLookup({ state: 'failed' }); });
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [view, center]);
  // Delivery coverage for the same pin. It never calls the address service, so it can run beside the lookup. A failure just means "unchecked":
  // the order itself is still checked on the server.
  useEffect(() => {
    queueMicrotask(() => setCoverage(null));
    if (view !== 'map' || !center || center.zoom < 15) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch('/api/checkout/serviceability', { method: 'POST', credentials: 'same-origin', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
        body: JSON.stringify({ latitude: center.latitude, longitude: center.longitude }) }).then(async response => {
        if (response.ok) setCoverage(deliveryCoverageDtoSchema.parse(await response.json()));
      }).catch(() => undefined);
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [view, center]);
  function close() { request.current++; setWorking(false); dialog.current?.close(); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { clearPoint(); saveArea({ emirate, city }); close(); } catch { setMessage(t(locale, 'areaSaveError')); }
  }
  // A refusal while the browser still says "prompt" means it never got to ask (an embedded browser, or Android's own Location permission for the
  // browser is off), which is the case that looks like "it did not even ask". It gets the same plain steps as a blocked site.
  function explainFailure(failure: Parameters<typeof guidanceFor>[0]) { setGuidance(guidanceFor(failure, browserEnvironment(), locale)); }
  /** Runs inside the tap handler, so the browser is allowed to show its native permission prompt. */
  async function locate(toMap: boolean) {
    if (working) return;
    const id = ++request.current;
    setWorking(true); setMessage(c.finding); setGuidance(null);
    const found = await requestPosition();
    if (id !== request.current) return;
    setWorking(false); setMessage('');
    if (!found.ok) { explainFailure(found.failure); return; }
    if (toMap) { setStart({ latitude: found.latitude, longitude: found.longitude, zoom: 17 }); setCenter(null); setLookup({ state: 'loading' }); setView('map'); }
    else setTarget({ latitude: found.latitude, longitude: found.longitude, zoom: 17, nonce: Date.now() });
  }
  function chooseOnMap() {
    setGuidance(null); setMessage('');
    setStart(point ? { latitude: point.latitude, longitude: point.longitude, zoom: 17 } : { latitude: 25.79, longitude: 55.94, zoom: 12 });
    setCenter(null); setLookup({ state: point ? 'loading' : 'zoom' }); setView('map');
  }
  function chooseBookAddress(item: BookAddress) {
    try { savePoint({ latitude: item.latitude, longitude: item.longitude, address: item.address, emirate: item.emirate, city: item.city }); close(); } catch { setMessage(t(locale, 'areaSaveError')); }
  }
  function confirm() {
    if (!center || lookup.state !== 'ok' || !lookup.result) return;
    setPending({ latitude: center.latitude, longitude: center.longitude, address: lookup.result.address, emirate: lookup.result.emirate, city: lookup.result.city });
    setView('details');
  }
  function saveDetails(withDetails: boolean) {
    if (!pending) return;
    const extra = withDetails ? { label: draft.label, ...(draft.building.trim() ? { building: draft.building } : {}), ...(draft.flat.trim() ? { flat: draft.flat } : {}), ...(draft.note.trim() ? { note: draft.note } : {}) } : {};
    try { savePoint({ ...pending, ...extra }); close(); } catch { setMessage(t(locale, 'areaSaveError')); }
  }
  const sheetClass = view === 'map'
    ? 'delivery-map-sheet fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-white p-0 text-[var(--color-text)] open:flex'
    : 'delivery-area-sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-3xl border-0 bg-white px-5 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] sm:inset-0 sm:m-auto sm:max-h-[90dvh] sm:w-[calc(100%-32px)] sm:max-w-md sm:rounded-2xl sm:p-7';
  const canConfirm = lookup.state === 'ok' && !!lookup.result && coverage?.status !== 'outside';
  const guidancePanel = guidance ? <div role="alert" className="mb-4 grid gap-2 rounded-xl bg-[var(--color-tint)] p-3 text-sm text-[var(--color-text)]">
    <p className="m-0 flex items-start gap-2 font-semibold"><ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-[var(--color-pressed)]" aria-hidden="true" />{guidance.title}</p>
    <ol className="m-0 grid gap-1.5 ps-9 text-[13px] leading-5">{guidance.steps.map(step => <li key={step}>{step}</li>)}</ol>
  </div> : null;
  return <>
    <dialog ref={dialog} aria-labelledby="delivery-area-heading" onCancel={close} className={sheetClass}>
      {view === 'details' ? <div className="grid gap-4">
        <div className="flex items-center gap-2"><Button variant="ghost" size="icon" shape="pill" type="button" onClick={() => setView('map')} aria-label={c.back}><ArrowLeftIcon className="size-5 rtl:rotate-180" aria-hidden="true" /></Button>
          <h2 id="delivery-area-heading" className="m-0 min-w-0 flex-1 text-xl">{c.detailsTitle}</h2>
          <Button variant="ghost" size="icon" shape="pill" type="button" onClick={close} aria-label={t(locale,'areaClose')}><Icon name="close" /></Button></div>
        <div className="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-3 text-sm"><span aria-hidden="true" className="mt-0.5 text-[var(--color-action)]"><Icon name="pin" /></span><span className="min-w-0"><strong className="block">{pending?.city}</strong><span className="line-clamp-2 text-[13px] text-[var(--color-muted)]">{pending?.address}</span></span></div>
        <p className="m-0 text-sm">{c.detailsLede}</p>
        <div role="radiogroup" aria-label={c.labelAs} className="flex gap-2">{(['Home', 'Work', 'Other'] as const).map(name => <button key={name} type="button" role="radio" aria-checked={draft.label === name} onClick={() => setDraft(current => ({ ...current, label: name }))}
          className={`min-h-11 flex-1 rounded-full border px-3 text-sm font-medium ${draft.label === name ? 'border-[var(--color-action)] bg-[var(--color-tint)] text-[var(--color-action)]' : 'bg-white'}`}>{c.labels[name]}</button>)}</div>
        <FieldGroup>
          <Field><FieldLabel htmlFor="dl-building">{c.building}</FieldLabel><Input id="dl-building" value={draft.building} maxLength={120} autoComplete="off" onChange={event => setDraft(current => ({ ...current, building: event.target.value }))} /></Field>
          <Field><FieldLabel htmlFor="dl-flat">{c.flat}</FieldLabel><Input id="dl-flat" value={draft.flat} maxLength={60} autoComplete="off" onChange={event => setDraft(current => ({ ...current, flat: event.target.value }))} /></Field>
          <Field><FieldLabel htmlFor="dl-note">{c.note}</FieldLabel><Input id="dl-note" value={draft.note} maxLength={300} autoComplete="off" onChange={event => setDraft(current => ({ ...current, note: event.target.value }))} /></Field>
        </FieldGroup>
        {message ? <p role="status" className="m-0 text-sm">{message}</p> : null}
        <div className="grid gap-2"><Button type="button" className="min-h-12 w-full rounded-xl" onClick={() => saveDetails(true)}>{c.saveAddress}</Button>
          <Button variant="ghost" type="button" onClick={() => saveDetails(false)}>{c.skipDetails}</Button></div>
      </div> : view === 'map' ? <>
        <div className="flex items-center gap-2 border-b bg-white px-2 py-2 ps-1">
          <Button variant="ghost" size="icon" shape="pill" type="button" onClick={() => { setView('choose'); setGuidance(null); }} aria-label={c.back}><ArrowLeftIcon className="size-5 rtl:rotate-180" aria-hidden="true" /></Button>
          <h2 id="delivery-area-heading" className="m-0 min-w-0 flex-1 truncate text-base font-semibold">{c.confirmTitle}</h2>
          <Button variant="ghost" size="icon" shape="pill" type="button" onClick={close} aria-label={t(locale,'areaClose')}><Icon name="close" /></Button>
        </div>
        <div className="relative min-h-0 flex-1">
          <LocationPinMap start={start} target={target} locale={locale} onMoving={() => { setLookup(current => current.state === 'ok' ? { state: 'loading' } : current); }} onSettle={setCenter} />
          <button type="button" disabled={working} onClick={() => { void locate(false); }} aria-label={c.recenter}
            className="absolute start-3 bottom-4 z-[700] grid size-11 place-items-center rounded-full border bg-white shadow-md">{working ? <ArrowPathIcon className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <Icon name="pin" />}</button>
        </div>
        <div className="grid gap-3 border-t bg-white px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {guidancePanel}
          <div role="status" className="flex min-h-12 items-start gap-3 text-sm">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-action)]">{lookup.state === 'ok' ? <CheckCircleIcon className="size-5" /> : lookup.state === 'loading' ? <ArrowPathIcon className="size-5 motion-safe:animate-spin" /> : <Icon name="pin" />}</span>
            <span className="min-w-0">{lookup.state === 'ok' && lookup.result ? <><strong className="block text-[15px]">{lookup.result.city}</strong><span className="line-clamp-2 text-[13px] text-[var(--color-muted)]">{lookup.result.address}</span></>
              : lookup.state === 'loading' ? c.looking : lookup.state === 'outside' ? c.outside : lookup.state === 'busy' ? c.busy : lookup.state === 'failed' ? c.failed : lookup.state === 'zoom' ? c.zoomIn : c.move}</span>
          </div>
          {lookup.state === 'ok' && coverage?.status === 'serviceable' ? <p role="status" className="m-0 text-[13px] font-medium text-[var(--color-action)]">{c.covered(coverage.estimatedMinutes, coverage.deliveryFeeMinor)}</p> : null}
          {coverage?.status === 'outside' ? <p role="alert" className="m-0 text-[13px] font-medium text-[var(--color-danger,#b42318)]">{c.notCovered}</p> : null}
          {lookup.state === 'busy' || lookup.state === 'failed' ? <div className="flex flex-wrap gap-2">
            {lookup.state === 'busy' ? <Button variant="outline" type="button" onClick={() => setCenter(current => current ? { ...current } : current)}>{c.retry}</Button> : null}
            <Button variant="ghost" type="button" onClick={() => setView('choose')}>{c.manualInstead}</Button>
          </div> : null}
          {message ? <p role="status" className="m-0 text-sm">{message}</p> : null}
          <Button type="button" className="min-h-12 w-full rounded-xl" disabled={!canConfirm} onClick={confirm}>{c.confirm}</Button>
        </div>
      </> : <>
        <div aria-hidden="true" className="mx-auto -mt-3 mb-4 h-1 w-9 rounded-full sm:hidden" />
        <div className="mb-3 flex items-center justify-between gap-3"><h2 id="delivery-area-heading" className="m-0 text-xl">{t(locale,'areaHeading')}</h2><Button variant="outline" size="icon" shape="pill" type="button" className="shrink-0" onClick={close} aria-label={t(locale,'areaClose')}><Icon name="close" /></Button></div>
        <p className="mt-0 text-sm">{c.lede}</p>
        {point ? <div className="mb-4 flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-3 text-sm"><span aria-hidden="true" className="mt-0.5 text-[var(--color-action)]"><Icon name="pin" /></span><span className="min-w-0"><span className="block text-xs text-[var(--color-muted)]">{c.saved}</span><strong className="block">{point.label ? `${c.labels[point.label]} · ` : ''}{point.city}</strong><span className="line-clamp-2 text-[13px] text-[var(--color-muted)]">{[point.building, point.flat].filter(Boolean).join(', ')}{point.building || point.flat ? ' · ' : ''}{point.address}</span></span></div> : null}
        {book.length ? <div className="mb-4 grid gap-2" role="group" aria-label={c.myAddresses}>
          <span className="text-xs font-semibold text-[var(--color-muted)]">{c.myAddresses}</span>
          {book.map(item => <button key={item.id} type="button" onClick={() => chooseBookAddress(item)} className="flex min-h-12 w-full items-start gap-3 rounded-xl border bg-white p-3 text-start text-sm">
            <span aria-hidden="true" className="mt-0.5 text-[var(--color-action)]"><Icon name="pin" /></span>
            <span className="min-w-0"><strong className="block">{item.label}</strong><span className="line-clamp-2 text-[13px] text-[var(--color-muted)]">{item.address}</span></span></button>)}
        </div> : null}
        <div className="grid gap-2">
          <Button type="button" className="min-h-12 w-full rounded-xl" onClick={() => { void locate(true); }} disabled={working} aria-busy={working}>{working ? <ArrowPathIcon className="size-5 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <Icon name="pin" />}{working ? t(locale,'areaFindingButton') : c.useLocation}</Button>
          <Button variant="outline" type="button" className="min-h-12 w-full rounded-xl" onClick={chooseOnMap} disabled={working}>{c.chooseOnMap}</Button>
        </div>
        <div className="mt-3">{guidancePanel}{message ? <p role="status" className="my-3 text-sm">{message}</p> : null}</div>
        <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-muted)]" aria-hidden="true"><span className="h-px flex-1 bg-[var(--color-divider)]" />{c.orManual}<span className="h-px flex-1 bg-[var(--color-divider)]" /></div>
        <form onSubmit={submit}><FieldGroup className="grid gap-4"><Field><FieldLabel htmlFor="delivery-location-field-1">{t(locale,'areaEmirate')}</FieldLabel><NativeSelect id="delivery-location-field-1" value={emirate} onChange={event => setEmirate(event.target.value as DeliveryArea['emirate'])} autoComplete="address-level1" disabled={working}>{deliveryEmirates.map(value => <option key={value} value={value}>{emirateLabel(locale,value)}</option>)}</NativeSelect></Field><Field><FieldLabel htmlFor="delivery-location-field-2">{t(locale,'areaCity')}</FieldLabel><Input id="delivery-location-field-2" value={city} onChange={event => setCity(event.target.value)} maxLength={200} autoComplete="address-level2" required placeholder={t(locale,'areaExample')} disabled={working} /></Field><Button type="submit" variant="outline" disabled={working}>{t(locale,'areaSave')}</Button></FieldGroup></form>
        {!area ? <button type="button" className="mt-3 min-h-11 w-full rounded-lg border-0 bg-transparent text-sm font-semibold underline underline-offset-4" onClick={() => { skipLocationPrompt(); close(); }}>{c.browse}</button> : null}
        <p className="mt-4 mb-0 text-xs">{t(locale,'areaStored')}</p>
        <details className="mt-2 text-xs"><summary className="cursor-pointer py-2">{t(locale,'areaData')}</summary><p>{t(locale,'areaPrivacy')}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{t(locale,'areaAttribution')}</a>.</p></details>
      </>}
    </dialog>
  </>;
}
