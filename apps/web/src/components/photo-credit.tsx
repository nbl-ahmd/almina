import { openBeautyPhotoCredit } from '../lib/catalog/photo-credit';

export function PhotoCredit({ source }: { source?: string | undefined }) {
  const credit = openBeautyPhotoCredit(source);
  if (!credit) return null;
  return <p className="mt-3 mb-0 text-xs leading-relaxed text-muted">
    Photo: <a className="text-ocean hover:text-teal" href={credit.source} rel="noopener noreferrer">{credit.name}</a>
    {' · '}<a className="text-ocean hover:text-teal" href={credit.licenseUrl} rel="license noopener noreferrer">{credit.license}</a>
    {' · Resized for display.'}
  </p>;
}
