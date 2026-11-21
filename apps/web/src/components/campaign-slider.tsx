"use client";
import { shopText as u } from '../lib/i18n-storefront';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { bannerMobileMedia } from '../lib/catalog/banner-artwork';
import type { Locale } from '../lib/i18n';
import { useRef, useState, type ReactNode, type TouchEvent } from "react";
export function CampaignSlider({
  children,
  locale = 'en',
  label = "Product highlights",
  controlLabel = "highlight",
}: {
  children: ReactNode[];
  locale?: Locale;
  label?: string;
  controlLabel?: string;
}) {
  const [{ index: active, animate }, setSlide] = useState({ index: 0, animate: false });
  const origin = useRef<{ x: number; y: number } | null>(null);
  const lastSwipe = useRef(0);

  function move(delta: number, animate: boolean) {
    setSlide(current => {
      const index = Math.max(0, Math.min(children.length - 1, current.index + delta));
      return index === current.index ? current : { index, animate };
    });
  }

  function onTouchStart(event: TouchEvent) {
    lastSwipe.current = 0;
    if (!window.matchMedia(bannerMobileMedia).matches) return;
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    origin.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const start = origin.current;
    origin.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || event.touches.length > 0) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    lastSwipe.current = Date.now();
    const delta = (dx < 0 ? 1 : -1) * (locale === 'ar' ? -1 : 1);
    move(delta, true);
  }

  function slideLabel(index: number) {
    return locale === 'en' ? `${index + 1} of ${children.length}` : `${index + 1} من ${children.length}`;
  }
  return (
    <div
      className="relative"
      role="region"
      aria-roledescription={u(locale,"carousel")}
      aria-label={label}
    >
      <div className="home-hero-viewport">
        {children.map((child, index) => (
          <div
            key={index}
            hidden={active !== index}
            className="campaign-frame h-full"
            data-pointer-entry={animate && active === index ? true : undefined}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={() => { origin.current = null; }}
            onClickCapture={event => {
              if (event.detail > 0 && Date.now() - lastSwipe.current < 450) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            role="group"
            aria-roledescription={u(locale,"slide")}
            aria-label={slideLabel(index)}
          >
            {child}
          </div>
        ))}
      </div>
      {children.length > 1 ? (
        <div className="campaign-pagination" role="group" aria-label={u(locale,"Choose highlight")}>
          <button type="button" data-slot="carousel-arrow" disabled={active === 0}
            aria-label={locale === 'ar' ? 'الشريحة السابقة' : 'Previous slide'}
            onClick={event => move(-1, event.detail > 0)}>
            <ChevronLeftIcon className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          {children.length > 5 ? <span className="campaign-counter" aria-hidden="true">{slideLabel(active)}</span> : children.map((_, index) => (
            <button
              key={index}
              data-slot="carousel-indicator"
              type="button"
              aria-label={locale === "en" ? `Show ${controlLabel} ${index + 1}` : `عرض ${u(locale,controlLabel)} ${index + 1}`}
              aria-pressed={active === index}
              onClick={event => { if (index !== active) setSlide({ index, animate: event.detail > 0 }); }}
              className="group flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 shadow-none outline-offset-0 focus-visible:outline-2 focus-visible:outline-ink"
            >
              <span
                aria-hidden="true"
                className={`h-2 rounded-full transition-[background-color,width] duration-200 ease-out motion-reduce:transition-none ${active === index ? "w-6 bg-brand" : "w-2 bg-ink/20 group-hover:bg-ink/40"}`}
              />
            </button>
          ))}
          <button type="button" data-slot="carousel-arrow" disabled={active === children.length - 1}
            aria-label={locale === 'ar' ? 'الشريحة التالية' : 'Next slide'}
            onClick={event => move(1, event.detail > 0)}>
            <ChevronRightIcon className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <p className="sr-only" role="status" aria-atomic="true">{slideLabel(active)}</p>
    </div>
  );
}
