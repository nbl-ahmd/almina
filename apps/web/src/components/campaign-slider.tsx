"use client";
import { useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
export function CampaignSlider({
  children,
  label = "Product highlights",
  controlLabel = "highlight",
}: {
  children: ReactNode[];
  label?: string;
  controlLabel?: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      {children.map((child, index) => (
        <div
          key={index}
          hidden={active !== index}
          className="campaign-frame"
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${children.length}`}
        >
          {child}
        </div>
      ))}
      {children.length > 1 ? (
        <div className="mt-1 flex items-center justify-between">
          <div className="flex gap-1" aria-label="Choose highlight">
            {children.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show ${controlLabel} ${index + 1}`}
                aria-pressed={active === index}
                onClick={() => setActive(index)}
                className="flex min-h-11 min-w-8 items-center justify-center border-0 bg-transparent p-1 hover:bg-transparent"
              >
                <span
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${active === index ? "w-8 bg-brand" : "w-2 bg-border"}`}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setActive((active - 1 + children.length) % children.length)
              }
              aria-label={`Previous ${controlLabel}`}
              className="size-11 rounded-full border-border bg-white p-3 text-ink hover:bg-subtle hover:text-brand"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setActive((active + 1) % children.length)}
              aria-label={`Next ${controlLabel}`}
              className="size-11 rounded-full border-border bg-white p-3 text-ink hover:bg-subtle hover:text-brand"
            >
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
