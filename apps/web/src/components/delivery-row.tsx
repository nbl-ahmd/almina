'use client';
import { useEffect, useState } from 'react';
import { areaEvent, openDeliveryEvent, savedArea, savedPoint, type DeliveryArea, type SavedPoint } from '../lib/location/browser';
import { MapPinIcon } from './storefront-icons';
import { emirateLabel, type Locale } from '../lib/i18n';

/** "Delivering to Home · address · Change": the one place the cart shows where the order is going, and the way to change it.
 *  It only reads what the delivery sheet saved on this device; nothing here is trusted for coverage or fees. */
export function DeliveryRow({ locale }: { locale: Locale }) {
  const ar = locale === 'ar';
  const [area, setArea] = useState<DeliveryArea | null>(null);
  const [point, setPoint] = useState<SavedPoint | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setArea(savedArea()); setPoint(savedPoint()); setReady(true); };
    queueMicrotask(sync);
    window.addEventListener(areaEvent, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(areaEvent, sync); window.removeEventListener('storage', sync); };
  }, []);
  if (!ready) return <div className="qc-place" aria-hidden="true" />;
  const place = point?.city ?? area?.city;
  const detail = point ? [point.building, point.flat].filter(Boolean).join(', ') + (point.building || point.flat ? ' · ' : '') + point.address : area ? emirateLabel(locale, area.emirate) : '';
  const labels = ar ? { Home: 'المنزل', Work: 'العمل', Other: 'أخرى' } : { Home: 'Home', Work: 'Work', Other: 'Other' };
  // 1mg "Delivering to Home ›": a small grey pin, the place in bold, the address below, and one text action.
  return <div className="qc-place" data-empty={!place}>
    <MapPinIcon className="qc-place-icon" aria-hidden="true" />
    <div className="qc-place-text">
      {place ? <><p className="qc-place-title"><span>{ar ? 'التوصيل إلى' : 'Delivering to'}</span> <strong>{point?.label ? labels[point.label] : place}</strong></p>{detail ? <p className="qc-place-address">{point?.label ? `${place} · ` : ''}{detail}</p> : null}</>
        : <><p className="qc-place-title"><strong>{ar ? 'أين نوصل طلبك؟' : 'Where should we deliver?'}</strong></p><p className="qc-place-address">{ar ? 'أضف موقعك لنعرض لك خيارات التوصيل.' : 'Add your location to see delivery options.'}</p></>}
    </div>
    <button type="button" className="pf-link-button" onClick={() => window.dispatchEvent(new Event(openDeliveryEvent))}>{place ? (ar ? 'تغيير' : 'Change') : (ar ? 'إضافة' : 'Add')}</button>
  </div>;
}
