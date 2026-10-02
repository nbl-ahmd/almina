"use client";
import { useState } from 'react';
import Image from 'next/image';
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  return <div className="gallery"><Image src={images[selected]!} alt={name} width={500} height={500} loading="eager" sizes="(max-width: 700px) 90vw, 500px" unoptimized />
    {images.length > 1 ? <div className="thumbnails">{images.map((src, index) => <button key={src} aria-label={`View ${name} image ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)}><Image src={src} alt="" width={70} height={70} unoptimized /></button>)}</div> : null}</div>;
}
