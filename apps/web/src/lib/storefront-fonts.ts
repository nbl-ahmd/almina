import localFont from 'next/font/local';

// Customer identity only; admin/wholesale retain independent font consumers.
export const compatibilityLatin = localFont({ src: '../app/fonts/Figtree-Variable.woff2', weight: '400 800', display: 'swap', preload: false });
export const compatibilityArabic = localFont({ src: '../app/fonts/Alexandria-Variable.woff2', weight: '400 800', display: 'swap', preload: false });
