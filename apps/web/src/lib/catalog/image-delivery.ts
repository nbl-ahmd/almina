import { cloudinaryImage } from '@almina/contracts';

/** Keep the configured-account allowlist while letting its CDN resize product media. */
export function cloudinaryDelivery(src: unknown, cloudName: string | undefined, width: number): string | null {
  const original = cloudinaryImage(src, cloudName);
  if (!original || !Number.isInteger(width) || width < 1 || width > 3840) return null;
  return original.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`);
}
