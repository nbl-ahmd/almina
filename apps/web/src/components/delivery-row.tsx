'use client';
import { useEffect, useState } from 'react';
import { areaEvent, openDeliveryEvent, savedArea, savedPoint, type DeliveryArea, type SavedPoint } from '../lib/location/browser';
import { Icon } from './storefront-icon';
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
  if (!ready) return <div className="pf-delivery" aria-hidden="true" />;
  const place = point?.city ?? area?.city;
  const detail = point ? [point.building, point.flat].filter(Boolean).join(', ') + (point.building || point.flat ? ' · ' : '') + point.address : area ? emirateLabel(locale, area.emirate) : '';
  const labels = ar ? { Home: 'المنزل', Work: 'العمل', Other: 'أخرى' } : { Home: 'Home', Work: 'Work', Other: 'Other' };
  return <div className="pf-delivery" data-empty={!place}>
    <span className="pf-icon" aria-hidden="true"><Icon name="pin" /></span>
    <div className="pf-delivery-text">
      <p className="pf-eyebrow">{place ? (ar ? 'التوصيل إلى' : 'Delivering to') : (ar ? 'أين نوصل طلبك؟' : 'Where should we deliver?')}</p>
      {place ? <><p className="pf-delivery-place">{point?.label ? <span className="pf-chip">{labels[point.label]}</span> : null}{place}</p>{detail ? <p className="pf-muted pf-clamp">{detail}</p> : null}</>
        : <p className="pf-muted">{ar ? 'أضف موقعك لنعرض لك خيارات التوصيل.' : 'Add your location to see delivery options.'}</p>}
    </div>
    <button type="button" className="pf-link-button" onClick={() => window.dispatchEvent(new Event(openDeliveryEvent))}>{place ? (ar ? 'تغيير' : 'Change') : (ar ? 'إضافة' : 'Add')}</button>
  </div>;
}
