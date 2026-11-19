import localFont from 'next/font/local';

// Customer identity only; admin/wholesale retain independent font consumers.
export const compatibilityLatin = localFont({ src: '../app/fonts/Figtree-Variable.woff2', weight: '400 800', display: 'swap', preload: false });
export const compatibilityArabic = localFont({ src: '../app/fonts/Alexandria-Variable.woff2', weight: '400 800', display: 'swap', preload: false });

export const storefrontLatin = localFont({ src: '../app/fonts/DM-Sans-Latin-Variable.woff2', weight: '400 700', variable: '--font-storefront-latin', display: 'swap', preload: false, fallback: ['sans-serif'] });
export const storefrontArabic = localFont({ src: '../app/fonts/Noto-Sans-Arabic-Variable.woff2', weight: '400 700', variable: '--font-storefront-arabic', display: 'swap', preload: false, adjustFontFallback: false });
