import localFont from 'next/font/local';

// Customer identity only; admin/wholesale retain independent font consumers.
export const storefrontLatin = localFont({ src: '../app/fonts/Figtree-Variable.woff2', weight: '400 800', variable: '--font-storefront-latin', display: 'swap', preload: false });
export const storefrontArabic = localFont({ src: '../app/fonts/Alexandria-Variable.woff2', weight: '400 800', variable: '--font-storefront-arabic', display: 'swap', preload: false });
