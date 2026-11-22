'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { ProductImage } from './product-image';
import { MagnifyingGlassIcon } from './storefront-icons';
import { Icon } from './storefront-icon';
import { Button } from './ui/button';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';

export function ProductGallery({ images, name, cloudName, actions, locale = 'en' }: {
  images: string[];
  name: string;
  cloudName?: string | undefined;
  locale?: Locale;
  actions?: ReactNode;
}) {
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState(false);
  const zoomTrigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const current = Math.min(selected, Math.max(0, images.length - 1));
  const position = locale === 'ar' ? `الصورة ${current + 1} من ${images.length}` : `Image ${current + 1} of ${images.length}`;
  const move = (direction: number) => setSelected((current + direction + images.length) % images.length);

  if (!images.length) return <div className="gallery-image product-image-fallback">{locale === 'ar' ? 'الصورة غير متاحة' : 'Image unavailable'}</div>;

  return <div className={images.length > 1 ? "gallery grid gap-2 md:grid-cols-[64px_minmax(0,1fr)]" : "gallery"} ref={setContainer}>
    <div className="gallery-stage relative isolate h-[clamp(220px,58vw,340px)] overflow-hidden rounded-2xl bg-subtle [touch-action:pan-y_pinch-zoom] md:col-start-2 md:row-start-1 md:h-[clamp(340px,34vw,500px)]" onPointerDown={event => { start.current = { x: event.clientX, y: event.clientY }; }} onPointerCancel={() => { start.current = null; }} onPointerUp={event => {
      const origin = start.current;
      start.current = null;
      if (!origin || images.length < 2) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return;
      move((locale === 'ar' ? dx > 0 : dx < 0) ? 1 : -1);
    }}>
      <div className="absolute inset-x-8 inset-y-4 grid min-h-0 grid-rows-[minmax(0,1fr)] place-items-center sm:inset-x-12 md:inset-y-6">
        <ProductImage draggable={false} locale={locale} cloudName={cloudName} className="gallery-image" src={images[current]!} alt={name} width={560} height={560} loading="eager" fetchPriority="high" sizes="(max-width:899px) 90vw, 560px" />
      </div>
      {actions && <div className="absolute end-2 top-2" onPointerDown={event => event.stopPropagation()}>{actions}</div>}
      {images[current] !== '/product-placeholder.svg' && (
        <button
          ref={zoomTrigger}
          type="button"
          aria-label={locale === 'ar' ? 'تكبير الصورة' : 'Zoom image'}
          className="gallery-zoom absolute end-2 bottom-2 grid size-11 place-items-center rounded-full border-0 bg-white p-0 text-teal hover:bg-accent"
          onPointerDown={event => event.stopPropagation()}
          onClick={() => setZoom(true)}
        >
          <MagnifyingGlassIcon aria-hidden="true" className="size-5" />
        </button>
      )}
    </div>
    {images.length > 1 ? <>
      <div className="gallery-navigation flex items-center justify-center gap-3 md:col-start-2 md:row-start-2">
        <Button variant="ghost" size="icon" aria-label={u(locale, 'Previous product photo')} onClick={() => move(-1)}><Icon name="back" /></Button>
        <p role="status" aria-atomic="true">{position}</p>
        <Button variant="ghost" size="icon" aria-label={u(locale, 'Next product photo')} onClick={() => move(1)}><Icon name="arrow" /></Button>
      </div>
      <div className="thumbnails flex max-w-full gap-2 overflow-auto p-1 md:col-start-1 md:row-start-1 md:max-h-[clamp(340px,34vw,500px)] md:flex-col">{images.map((src, index) => <button key={src} type="button" aria-label={locale === 'ar' ? `عرض صورة ${name} رقم ${index + 1}` : `View ${name} image ${index + 1}`} aria-pressed={current === index} onClick={() => setSelected(index)}>
        <ProductImage locale={locale} cloudName={cloudName} src={src} alt="" width={56} height={56} sizes="56px" />
      </button>)}</div>
    </> : null}
    <Dialog.Root open={zoom} onOpenChange={setZoom}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="shop-modal-scrim" />
        <Dialog.Content onCloseAutoFocus={event => { event.preventDefault(); zoomTrigger.current?.focus(); }} className="gallery-dialog" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <div className="gallery-dialog-heading"><Dialog.Title>{name}</Dialog.Title><Dialog.Close asChild><Button variant="outline" size="icon" aria-label={locale === 'ar' ? 'إغلاق الصورة' : 'Close image'}><Icon name="close" /></Button></Dialog.Close></div>
          <Dialog.Description className="sr-only">{locale === 'ar' ? 'صورة المنتج بالحجم الكامل.' : 'Full product image.'}</Dialog.Description>
          <ProductImage locale={locale} cloudName={cloudName} src={images[current]!} alt={name} width={1000} height={1000} sizes="90vw" className="gallery-expanded-image" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
