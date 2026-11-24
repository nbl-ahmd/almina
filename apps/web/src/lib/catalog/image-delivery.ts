// Subpath import: this runs inside every product image, so it must not pull the contracts barrel (and zod).
import { cloudinaryImage } from '@almina/contracts/media';

export const mediaOrigin = 'https://cdn.alminapharmacy.com';
// Deliberately finite: arbitrary transformation strings cannot create unlimited derivatives.
export const mediaWidths = [96, 160, 256, 320, 384, 640, 750, 828, 1080, 1200, 1920] as const;
const approvedWidth = (value: string) => mediaWidths.some(width => String(width) === value);
const assetPattern = /^v[1-9][0-9]{0,19}\/(?:[A-Za-z0-9_-]{1,100}\/){0,8}[A-Za-z0-9_-]{1,180}\.(?:avif|webp|png|jpe?g)$/;
const pathPattern = /^\/media\/w([0-9]+)\/(.+)$/;

function assetPath(src: unknown, cloudName: string | undefined): { asset: string; origin: string } | null {
  if (typeof src !== 'string' || src.length > 1000) return null;
  const original = cloudinaryImage(src, cloudName);
  if (original) {
    const asset = new URL(original).pathname.slice(`/${cloudName}/image/upload/`.length);
    return assetPattern.test(asset) ? { asset, origin: '' } : null;
  }
  try {
    const url = new URL(src, mediaOrigin);
    if (url.origin !== mediaOrigin || url.username || url.password || url.search || url.hash) return null;
    // URL normalization must not turn traversal or encoded separators into valid assets.
    const relative = src.startsWith('/media/') ? src : src.slice(mediaOrigin.length);
    if (url.pathname !== relative) return null;
    const match = pathPattern.exec(url.pathname);
    if (!match || !approvedWidth(match[1]!) || !assetPattern.test(match[2]!)) return null;
    return { asset: match[2]!, origin: src.startsWith('/') ? '' : mediaOrigin };
  } catch { return null; }
}

/** Responsive loader: Cloudinary transforms once; the public media endpoint supplies CDN caching. */
export function cloudinaryDelivery(src: unknown, cloudName: string | undefined, width: number): string | null {
  const image = assetPath(src, cloudName);
  if (!image || !mediaWidths.some(value => value === width)) return null;
  return `${image.origin}/media/w${width}/${image.asset}`;
}

/** Stable branded metadata/feed URL in production; the local loader handles development. */
export function publicImage(src: unknown, cloudName: string | undefined, production: boolean): string | null {
  if (!production) return cloudinaryImage(src, cloudName);
  const path = cloudinaryDelivery(src, cloudName, 1200);
  return path ? (path.startsWith('/') ? mediaOrigin + path : path) : cloudinaryImage(src, cloudName);
}

/** Only the configured public upload account, immutable asset versions and approved sizes. */
export function mediaTarget(pathname: string, cloudName: string | undefined): URL | null {
  if (!cloudName || !/^[a-z0-9_-]+$/.test(cloudName)) return null;
  const match = pathPattern.exec(pathname);
  if (!match || !approvedWidth(match[1]!) || !assetPattern.test(match[2]!)) return null;
  return new URL(`https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_${match[1]}/q_auto/f_webp/${match[2]}`);
}

/** Never forward storefront cookies, bearer tokens or arbitrary client headers upstream. */
export function mediaRequestHeaders(): Headers {
  return new Headers({ accept: 'image/webp' });
}
