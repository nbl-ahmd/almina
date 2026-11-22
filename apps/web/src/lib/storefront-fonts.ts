import localFont from 'next/font/local';

const manrope = localFont({
  src: '../app/fonts/market-green/Manrope.ttf',
  variable: '--font-manrope',
  weight: '400 700',
  display: 'swap',
});
const arabic = localFont({
  src: '../app/fonts/market-green/NotoSansArabic.ttf',
  variable: '--font-arabic',
  weight: '400 700',
  display: 'swap',
  preload: false,
});
export const storefrontFontVariables = `${manrope.variable} ${arabic.variable}`;
