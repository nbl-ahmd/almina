/** Banner frames. A frame's shape depends only on the screen width, never on the uploaded file: artwork is shown whole inside it
 *  (contain-fit, so baked-in text is never cropped). Art in the frame's shape fills it; any other shape leaves blank bands.
 *  Storefront CSS, image sources, admin upload hints and the upload warning all follow the values here. */
export type ArtworkSize = { width: number; height: number };
export type ArtworkFrames = { desktop: ArtworkSize; mobile: ArtworkSize };

/** Phone artwork (and the phone frame) applies up to this width; desktop artwork from the next pixel. Matches the CSS breakpoint. */
export const bannerPhoneMaxWidth = 899;
export const bannerPhoneMedia = `(max-width: ${bannerPhoneMaxWidth}px)`;

// Measured from Aster's homepage (2026-11-25): hero 1600×500 desktop; section strips 764×176 phone; top promo strip 2220×120 / 764×88.
export const heroArtwork = { desktop: { width: 1600, height: 500 }, mobile: { width: 800, height: 400 } } as const satisfies ArtworkFrames;
export const stripArtwork = { desktop: { width: 1600, height: 200 }, mobile: { width: 764, height: 176 } } as const satisfies ArtworkFrames;
/** Two strips in one place sit side by side on desktop, each in a frame twice as tall for its width. */
export const pairedStripDesktop = { width: 1600, height: 400 } as const satisfies ArtworkSize;
export const promoStripArtwork = { desktop: { width: 2220, height: 120 }, mobile: { width: 764, height: 88 } } as const satisfies ArtworkFrames;
/** Supporting campaign cards switch shape at 768px (see campaign-artwork.tsx). */
export const supportingArtwork = { desktop: { width: 1440, height: 540 }, mobile: { width: 800, height: 400 } } as const satisfies ArtworkFrames;

export const sizeLabel = ({ width, height }: ArtworkSize) => `${width} × ${height}`;

/** A message when a file's shape differs from its frame by more than 2%, otherwise null. */
export function artworkShapeWarning(actual: ArtworkSize, frame: ArtworkSize): string | null {
  if (!actual.width || !actual.height) return null;
  const difference = (actual.width / actual.height) / (frame.width / frame.height) - 1;
  if (Math.abs(difference) <= 0.02) return null;
  const bands = difference < 0 ? 'at the sides' : 'above and below';
  return `This image is ${sizeLabel(actual)}. The frame is shaped for ${sizeLabel(frame)}, so it will show with blank bands ${bands}.`;
}
