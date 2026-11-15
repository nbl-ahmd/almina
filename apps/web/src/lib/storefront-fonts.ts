import localFont from 'next/font/local';

// Script-specific local faces; admin/wholesale keep their independent fonts.
export const storefrontLatin = localFont({ src: '../app/fonts/Manrope-Variable.woff2', weight: '400 800', display: 'swap', preload: false });
export const storefrontArabic = localFont({ src: '../app/fonts/NotoSansArabic-Variable.woff2', weight: '400 800', display: 'swap', preload: false });
