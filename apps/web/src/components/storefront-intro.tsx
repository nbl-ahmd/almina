import Image from 'next/image';
import type { ReactNode } from 'react';
/** Shared page identity; decoration never represents an exact catalogue product. */
export function StorefrontIntro({ title, description, artwork = 'skin', children }: { title: string; description: string; artwork?: 'skin' | 'family' | 'care' | 'none'; children?: ReactNode }) {
  const image = artwork === 'family' ? '/design/home/family-campaign.webp' : artwork === 'care' ? '/design/home/wellness-editorial.webp' : '/design/home/skincare-campaign.webp';
  return <div className={`relative isolate mb-6 overflow-hidden rounded-2xl p-5 md:p-7 ${artwork === 'family' ? 'bg-[#fff0e8]' : artwork === 'care' ? 'bg-[#eeecfa]' : artwork === 'none' ? 'bg-[#f1f1fc]' : 'bg-[#edf5ef]'}`}>
    {artwork !== 'none' ? <Image src={image} alt="" fill sizes="(max-width:767px) 100vw, 1200px" className="-z-10 object-cover object-right opacity-15 md:ml-[58%] md:max-w-[42%] md:opacity-100" /> : null}
    <div className={artwork === 'none' ? 'max-w-3xl' : 'max-w-xl md:max-w-[55%]'}><h1 className="mb-2 text-2xl leading-tight font-semibold tracking-tight md:text-4xl">{title}</h1><p className="mb-0 max-w-[55ch] text-sm leading-6 text-ink/80">{description}</p>{children ? <div className="mt-3">{children}</div> : null}</div>
  </div>;
}
