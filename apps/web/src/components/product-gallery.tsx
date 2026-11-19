'use client';

import { useState, type ReactNode } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { ProductImage } from './product-image';
import { Icon } from './icon';
import styles from './product-detail.module.css';

export function ProductGallery({ images, name, cloudName, locale = 'en', controls }: {
  images: string[]; name: string; cloudName?: string | undefined; locale?: Locale; controls?: ReactNode;
}) {
  const [selected, setSelected] = useState(0);
  const selectedIndex = Math.min(selected, Math.max(0, images.length - 1));
  const current = images[selectedIndex];
  const multiple = images.length > 1;
  const fallback = <p className={styles.photoFallback}>
    <PhotoIcon aria-hidden="true" /><span>{u(locale, 'Product photo unavailable.')}</span>
  </p>;

  return (
    <div className={styles.gallery}>
      <div className={styles.stage} data-no-photo={current ? undefined : ''}>
        {controls}
        {current ? <ProductImage cloudName={cloudName} className={`gallery-image ${styles.heroImage}`}
          src={current} alt={name} width={560} height={560} loading="eager" fetchPriority="high"
          sizes="(max-width: 767px) 100vw, (max-width: 1240px) 50vw, 640px" fallback={fallback} /> : fallback}
        {multiple ? (
          <div className={styles.photoArrows}>
            <button type="button" aria-label={u(locale, 'Previous product photo')}
              onClick={() => setSelected((selectedIndex + images.length - 1) % images.length)}><Icon name="back" /></button>
            <button type="button" aria-label={u(locale, 'Next product photo')}
              onClick={() => setSelected((selectedIndex + 1) % images.length)}><Icon name="arrow" /></button>
          </div>
        ) : null}
      </div>
      {multiple ? (
        <div className={styles.thumbs} data-store-rail role="group" aria-label={locale === 'ar' ? 'صور المنتج' : 'Product photos'}>
          {images.map((src, index) => (
            <button key={src} type="button" data-store-control="thumbnail" aria-pressed={selectedIndex === index}
              aria-label={locale === 'ar' ? `عرض صورة ${name} رقم ${index + 1}` : `View ${name} image ${index + 1}`}
              onClick={() => setSelected(index)}>
              <ProductImage cloudName={cloudName} className={styles.thumbImage} src={src} alt="" width={64} height={64} sizes="64px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
