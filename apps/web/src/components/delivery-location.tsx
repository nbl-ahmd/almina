'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { t, emirateLabel, type Locale } from '../lib/i18n';
import { areaEvent, openDeliveryEvent as openEvent, savedArea, locationPromptSkipped, type DeliveryArea } from '../lib/location/browser';
import { Icon } from './storefront-icon';
import { ChevronDownIcon, MapPinIcon } from './storefront-icons';
// The sheet (map, address forms, response validation) is fetched only when a customer opens it or the first-visit prompt is due,
// so the header chip on every page stays light.
const DeliverySheet = dynamic(() => import('./delivery-sheet'), { ssr: false });
const promptKey = 'almina.delivery-prompt.v1';
export function DeliveryAreaPrompt({ locale = 'en' }: { locale?: Locale }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const sync = () => { try { setShow(!savedArea() && localStorage.getItem(promptKey) !== 'dismissed'); } catch { setShow(false); } };
    queueMicrotask(sync); window.addEventListener(areaEvent, sync);
    return () => window.removeEventListener(areaEvent, sync);
  }, []);
  if (!show) return null;
  return <aside className="border-t" aria-label={t(locale,'areaPromptAria')}><div className="mx-auto flex max-w-[1344px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs md:px-6 lg:px-8"><Icon name="pin" /><span>{t(locale,'areaPrompt')}</span><button type="button" className="min-h-9 rounded-full bg-white px-3 py-1 text-xs" onClick={() => window.dispatchEvent(new Event(openEvent))}>{t(locale,'areaChoose')}</button><button type="button" className="ml-auto min-h-9 rounded-full border-transparent bg-transparent px-3 py-1 text-xs font-normal" onClick={() => { try { localStorage.setItem(promptKey, 'dismissed'); } catch { /* Dismiss for this visit when storage is unavailable. */ } setShow(false); }}>{t(locale,'areaNotNow')}</button></div></aside>;
}
const autoOpenKey = 'almina.delivery-autoopen.v1';

export function DeliveryLocation({ locale = 'en' }: { locale?: Locale }) {
  const [area, setArea] = useState<DeliveryArea | null>(null);
  const [openSignal, setOpenSignal] = useState(0);
  useEffect(() => {
    const sync = () => setArea(savedArea());
    const open = () => setOpenSignal(value => value + 1);
    queueMicrotask(sync); window.addEventListener(areaEvent, sync); window.addEventListener('storage', sync); window.addEventListener(openEvent, open);
    // A first-time visitor is asked once per visit, a moment after the page settles. The native prompt only appears when they tap the
    // button inside the sheet, which is what browsers require for location, so this never triggers a silent block.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const skip = /^\/(checkout|cart|admin|account)(\/|$)/.test(location.pathname);
      if (!skip && !savedArea() && !locationPromptSkipped() && sessionStorage.getItem(autoOpenKey) !== '1') {
        timer = setTimeout(() => { if (!savedArea() && !document.querySelector('dialog[aria-labelledby="delivery-area-heading"][open]')) { try { sessionStorage.setItem(autoOpenKey, '1'); } catch { /* Ask again next page. */ } open(); } }, 1400);
      }
    } catch { /* Storage can be unavailable; the header chip still works. */ }
    return () => { if (timer) clearTimeout(timer); window.removeEventListener(areaEvent, sync); window.removeEventListener('storage', sync); window.removeEventListener(openEvent, open); };
  }, []);
  return <><div className="header-location flex min-w-0 justify-end">
    <button data-slot="delivery-selector" type="button" className="group inline-flex min-h-11 max-w-full min-w-0 items-center gap-1.5 rounded-lg border-0 bg-transparent px-1 py-1 text-start  transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:max-w-[210px] md:px-2" onClick={() => window.dispatchEvent(new Event(openEvent))} aria-label={t(locale,'areaChooseAria')}>
      <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
      <span className="delivery-label min-w-0 truncate text-[13px] font-medium" title={area ? `${area.city}, ${emirateLabel(locale,area.emirate)}` : t(locale,'areaChooseYours')}>
        {area ? <>{area.city}<span className="delivery-region">, {emirateLabel(locale,area.emirate)}</span></> : <><span className="delivery-compact">{t(locale,'areaDeliverTo')}</span><span className="delivery-complete">{t(locale,'areaChooseYours')}</span></>}
      </span>
      <ChevronDownIcon className="size-3 shrink-0" aria-hidden="true" />
    </button></div>
    {openSignal > 0 ? <DeliverySheet locale={locale} openSignal={openSignal} /> : null}
  </>;
}
