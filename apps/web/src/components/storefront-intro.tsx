import { getLocale } from '../lib/server/i18n';
import Image from 'next/image';
import type { ReactNode } from 'react';
/** Shared page identity; decoration never represents an exact catalogue product. */
export async function StorefrontIntro({ title, description, artwork = 'skin', children }: { title: string; description: string; artwork?: 'skin' | 'family' | 'care' | 'none'; children?: ReactNode }) {
  const locale = await getLocale();
  const image = artwork === 'family' ? '/design/home/family-campaign.webp' : artwork === 'care' ? '/design/home/wellness-editorial.webp' : '/design/home/skincare-campaign.webp';
  return <div dir={locale === "ar" ? "ltr" : undefined} className={`relative isolate mb-6 overflow-hidden rounded-2xl border border-border p-6 md:p-8 ${artwork === 'family' ? 'bg-care-peach' : artwork === 'care' ? 'bg-care-blue' : artwork === 'none' ? 'bg-subtle' : 'bg-care-mint'}`}>
    {artwork !== 'none' ? <Image src={image} alt="" fill sizes="(max-width:767px) 100vw, 1200px" className="-z-10 object-cover object-right opacity-15 md:ml-[58%] md:max-w-[42%] md:opacity-100" /> : <><span aria-hidden="true" className="absolute -top-16 right-10 -z-10 size-52 rounded-full border border-ink/5 bg-white/40" /><span aria-hidden="true" className="absolute right-32 -bottom-24 -z-10 size-40 rounded-full border border-ink/5 bg-white/30" /></>}
    <div dir={locale === "ar" ? "rtl" : undefined} className={artwork === 'none' ? 'max-w-3xl' : 'max-w-xl md:max-w-[55%]'}><h1 className="mb-2 text-[26px] leading-[1.08] font-semibold tracking-[-0.035em] md:text-[40px]">{title}</h1><p className="mb-0 max-w-[55ch] text-sm leading-6 text-ink/65">{description}</p>{children ? <div className="mt-3">{children}</div> : null}</div>
  </div>;
}
