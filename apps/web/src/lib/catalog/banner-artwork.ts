// Homepage artboards. Keep the storefront, campaign preview and upload instructions aligned.
export const bannerArtwork = {
  mobile: { width: 1200, height: 400 },
  desktop: { width: 2400, height: 600 },
} as const;

export const bannerMobileMedia = '(width < 768px)';
export const bannerSizes = '(min-width: 1240px) 1192px, calc(100vw - 32px)';
