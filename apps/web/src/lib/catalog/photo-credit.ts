import { validGtin } from '@almina/contracts';

/** Attribution for the specifically reviewed Open Beauty Facts photo source. */
export function openBeautyPhotoCredit(source: unknown) {
  if (typeof source !== 'string') return null;
  try {
    const url = new URL(source);
    const code = /^\/product\/(\d+)$/.exec(url.pathname)?.[1];
    if (url.origin !== 'https://world.openbeautyfacts.org' || url.username || url.password
      || url.search || url.hash || !code || !validGtin(code)) return null;
    return { source: url.href, name: 'Open Beauty Facts contributors',
      license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' };
  } catch { return null; }
}
