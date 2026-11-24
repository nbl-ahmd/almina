'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './location-pin-map.css';

export type MapSettle = { latitude: number; longitude: number; zoom: number };
export type MapTarget = { latitude: number; longitude: number; zoom?: number; nonce: number };

/** Delivery-app style picker: the pin stays fixed in the middle and the customer moves the map underneath it. The chosen point is
 *  whatever sits under the pin when the map stops, so there is nothing small to tap or drag. */
export default function LocationPinMap({ start, target, onMoving, onSettle, locale = 'en' }: {
  start: { latitude: number; longitude: number; zoom: number }; target?: MapTarget | undefined;
  onMoving?: () => void; onSettle: (center: MapSettle) => void; locale?: 'en' | 'ar';
}) {
  const ar = locale === 'ar';
  const element = useRef<HTMLDivElement>(null), map = useRef<LeafletMap | null>(null);
  const latest = useRef({ onMoving, onSettle }); useEffect(() => { latest.current = { onMoving, onSettle }; }, [onMoving, onSettle]);
  const [moving, setMoving] = useState(false), [failed, setFailed] = useState(false), [ready, setReady] = useState(false);
  useEffect(() => {
    let stopped = false, instance: LeafletMap | undefined;
    void (async () => {
      try {
        const L = await import('leaflet');
        if (stopped || !element.current) return;
        instance = L.map(element.current, { zoomControl: false, attributionControl: true, inertia: true }).setView([start.latitude, start.longitude], start.zoom);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(instance);
        L.control.zoom({ position: 'bottomright', zoomInTitle: ar ? 'تكبير' : 'Zoom in', zoomOutTitle: ar ? 'تصغير' : 'Zoom out' }).addTo(instance);
        const settle = () => { setMoving(false); const center = instance!.getCenter().wrap(); latest.current.onSettle({ latitude: center.lat, longitude: center.lng, zoom: instance!.getZoom() }); };
        instance.on('movestart zoomstart', () => { setMoving(true); latest.current.onMoving?.(); });
        instance.on('moveend', settle);
        map.current = instance; setReady(true); settle();
      } catch { if (!stopped) setFailed(true); }
    })();
    return () => { stopped = true; instance?.remove(); map.current = null; };
  // The map is built once; moving it afterwards goes through `target`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!target || !map.current) return;
    map.current.setView([target.latitude, target.longitude], Math.max(map.current.getZoom(), target.zoom ?? 17), { animate: false });
  }, [target]);
  return <div className="location-map" data-moving={moving || undefined}>
    <div ref={element} className="location-map-surface" role="application" tabIndex={0}
      aria-label={ar ? 'خريطة اختيار موقع التوصيل. حرّك الخريطة ليستقر الدبوس على موقعك.' : 'Delivery location map. Move the map so the pin sits on your spot.'} />
    {ready ? <span className="location-map-pin" aria-hidden="true">
      <svg viewBox="0 0 32 44" width="36" height="50"><path d="M16 0C7.2 0 0 7 0 15.7 0 27.4 16 44 16 44s16-16.6 16-28.3C32 7 24.8 0 16 0Z" fill="#D63D44" /><circle cx="16" cy="15.5" r="6" fill="#fff" /></svg>
      <i className="location-map-pin-shadow" />
    </span> : null}
    {failed ? <p role="alert" className="location-map-error">{ar ? 'تعذر تحميل الخريطة. أدخل منطقتك يدوياً.' : 'The map could not load. Enter your area manually instead.'}</p> : null}
  </div>;
}
