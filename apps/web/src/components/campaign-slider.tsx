"use client";
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { useState, type ReactNode } from "react";
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
        <div className="flex justify-center" aria-label={u(locale,"Choose highlight")}>
          {children.map((_, index) => (
            <button
              key={index}
              data-slot="carousel-indicator"
              type="button"
              aria-label={locale === "en" ? `Show ${controlLabel} ${index + 1}` : `عرض ${u(locale,controlLabel)} ${index + 1}`}
              aria-pressed={active === index}
              onClick={() => setActive(index)}
              className="group flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 shadow-none outline-offset-0 focus-visible:outline-2 focus-visible:outline-ink"
            >
              <span
                aria-hidden="true"
                className={`h-[3px] w-7 rounded-full transition-[background-color,transform] duration-150 motion-reduce:transition-none ${active === index ? "scale-x-100 bg-ink" : "scale-x-75 bg-ink/25 group-hover:bg-ink/50"}`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
