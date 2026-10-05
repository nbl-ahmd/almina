"use client";
import { useState } from 'react';
import Image from 'next/image';
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  if (!images.length) return <p className="rounded-xl border border-line bg-surface p-6 text-muted">Product photo unavailable.</p>;
  const selectedIndex = Math.min(selected, images.length - 1);
  return <div className="gallery min-w-0"><Image className="block aspect-square h-auto w-full rounded-xl border border-line bg-surface p-6 object-contain" src={images[selectedIndex]!} alt={name} width={500} height={500} loading="eager" fetchPriority="high" sizes="(max-width: 700px) 90vw, (max-width: 1100px) 50vw, 500px" />
    {images.length > 1 ? <div className="thumbnails mt-4 flex flex-wrap gap-3">{images.map((src, index) => <button key={src} aria-label={`View ${name} image ${index + 1}`} aria-pressed={selectedIndex === index} onClick={() => setSelected(index)}><Image src={src} alt="" width={70} height={70} sizes="70px" /></button>)}</div> : null}</div>;
}
