"use client";
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
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
  const [active, setActive] = useState(0);
  return (
    <div
      className="relative"
      role="region"
      aria-roledescription={u(locale,"carousel")}
      aria-label={label}
    >
      {children.map((child, index) => (
        <div
          key={index}
          hidden={active !== index}
          className="campaign-frame h-full"
          role="group"
          aria-roledescription={u(locale,"slide")}
          aria-label={locale === "en" ? `${index + 1} of ${children.length}` : `${index + 1} من ${children.length}`}
        >
          {child}
        </div>
      ))}
      {children.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-2 md:inset-x-4 md:bottom-4">
          <div className="pointer-events-auto flex gap-0.5 rounded-full bg-white/85 p-1 shadow-sm backdrop-blur" aria-label={u(locale,"Choose highlight")}>
            {children.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={locale === "en" ? `Show ${controlLabel} ${index + 1}` : `عرض ${u(locale,controlLabel)} ${index + 1}`}
                aria-pressed={active === index}
                onClick={() => setActive(index)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full border-0 bg-transparent p-0 hover:bg-transparent"
              >
                <span
                  className={`h-1.5 rounded-full transition-colors duration-200 ${active === index ? "w-7 bg-ink" : "w-1.5 bg-ink/25"}`}
                />
              </button>
            ))}
          </div>
          <div className="pointer-events-auto flex gap-1.5">
            <button
              type="button"
              onClick={() =>
                setActive((active - 1 + children.length) % children.length)
              }
              aria-label={locale === "en" ? `Previous ${controlLabel}` : `السابق ${u(locale,controlLabel)}`}
              className="flex size-11 items-center justify-center rounded-full border border-black/5 bg-white/90 p-2 text-ink shadow-sm backdrop-blur transition-colors hover:bg-white"
            >
              <ArrowLeftIcon className="rtl:rotate-180 size-4" />
            </button>
            <button
              type="button"
              onClick={() => setActive((active + 1) % children.length)}
              aria-label={locale === "en" ? `Next ${controlLabel}` : `التالي ${u(locale,controlLabel)}`}
              className="flex size-11 items-center justify-center rounded-full border border-black/5 bg-white/90 p-2 text-ink shadow-sm backdrop-blur transition-colors hover:bg-white"
            >
              <ArrowRightIcon className="rtl:rotate-180 size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
