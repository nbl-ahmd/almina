'use client';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { useState } from 'react';
import { ProductImage } from './product-image';
import { Icon } from './icon';
export function ProductGallery({ images, name, cloudName, locale = 'en' }: { images: string[]; name: string; cloudName?: string | undefined; locale?: Locale }) {
  const [selected, setSelected] = useState(0);
  if (!images.length) return <p className="rounded-xl border border-border bg-surface p-6 text-muted">{u(locale,"Product photo unavailable.")}</p>;
  const selectedIndex = Math.min(selected, images.length - 1);
  return <div className="gallery relative min-w-0"><ProductImage cloudName={cloudName} className="gallery-image block aspect-square h-auto w-full rounded-2xl border border-border bg-page p-8 object-contain md:p-12" src={images[selectedIndex]!} alt={name} width={560} height={560} loading="eager" fetchPriority="high" sizes="(max-width: 767px) 90vw, 45vw" />
    {images.length>1 ? <><div className="pointer-events-none absolute inset-x-2 top-[calc(50%-35px)] flex justify-between md:hidden"><button className="pointer-events-auto size-11 rounded-full border border-black/5 bg-white/90 p-2 text-ink shadow-sm backdrop-blur hover:bg-white" type="button" aria-label={u(locale,"Previous product photo")} onClick={()=>setSelected((selectedIndex+images.length-1)%images.length)}><Icon name="back" /></button><button className="pointer-events-auto size-11 rounded-full border border-black/5 bg-white/90 p-2 text-ink shadow-sm backdrop-blur hover:bg-white" type="button" aria-label={u(locale,"Next product photo")} onClick={()=>setSelected((selectedIndex+1)%images.length)}><Icon name="arrow" /></button></div><div className="thumbnails scrollbar-none mt-2 flex overflow-x-auto justify-center gap-1 md:mt-4 md:justify-start md:gap-3">{images.map((src,index)=><button className="flex min-h-11 min-w-11 items-center justify-center rounded-[16px] border-0 bg-transparent p-2 aria-pressed:bg-transparent md:size-20 md:border md:border-border md:bg-white md:aria-pressed:border-ink max-md:aria-pressed:border-transparent max-md:[&:not(:focus-visible)]:outline-0 [&[aria-pressed=true]>span]:bg-ink" key={src} type="button" aria-label={locale === "en" ? `View ${name} image ${index+1}` : `عرض صورة ${name} رقم ${index+1}`} aria-pressed={selectedIndex===index} onClick={()=>setSelected(index)}><span className="h-1.5 w-4 rounded-full bg-border md:hidden" /><ProductImage cloudName={cloudName} className="hidden size-16 object-contain md:block" src={src} alt="" width={70} height={70} sizes="70px" /></button>)}</div></> : null}
  </div>;
}
