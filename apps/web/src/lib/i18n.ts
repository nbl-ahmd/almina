// Storefront interface copy. English is the default and is the reviewed source of truth.
// Arabic strings below are a first pass for the shopping/checkout interface and require
// pharmacy/native review before they are considered published copy. Product, category and
// health content is translated by staff through the editorial CMS (locale: 'ar'), never here.
export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const localeCookie = 'almina_lang';
export function parseLocale(value: string | null | undefined): Locale {
  return value === 'ar' ? 'ar' : 'en';
}
export function isRtl(locale: Locale) {
  return locale === 'ar';
}

const en = {
  skipToContent: 'Skip to content',
  announcement: 'Health, beauty & everyday care. Hello from Al Mina.',
  homeAria: 'Al Mina Pharmacy home',
  quickContactAria: 'Quick contact',
  contactAria: 'Contact Al Mina Pharmacy',
  language: 'Language',
  footerShopAria: 'Footer shop',
  footerHelpAria: 'Footer help',
  footerTagline: 'A little more care for your everyday. Health, skincare and essentials from your neighbourhood pharmacy.',
  footerLocation: 'Ras Al Khaimah, United Arab Emirates',
  footerShop: 'Find your essentials',
  footerHelp: 'Here to help',
  footerTalk: 'Let’s talk care.',
  footerSupport: 'For product availability, delivery and order support.',
  footerBottom: 'Al Mina Pharmacy · Ras Al Khaimah',
  footerCare: 'Care that feels a little closer.',
  shopNavigationAria: 'Shop navigation',
  mainNavigationAria: 'Main navigation',
  navHome: 'Home',
  navCategories: 'Categories',
  navProducts: 'Products',
  navCart: 'Cart',
  navOffers: 'Offers',
  navShopProducts: 'Shop products',
  navBrowseCategories: 'Browse categories',
  navSkincare: 'Skincare',
  navVitamins: 'Vitamins & wellness',
  navBaby: 'Baby care',
  navAbout: 'About Al Mina',
  linkShopBrands: 'Shop brands',
  linkAccount: 'Your account',
  linkSaved: 'Saved products',
  linkAllProducts: 'All products',
  linkCategories: 'Shop by category',
  linkOffers: 'Current offers',
  linkCart: 'Your shopping cart',
  linkLocal: 'Pharmacy in Ras Al Khaimah',
  linkGuides: 'Care & buying guides',
  linkAbout: 'About Al Mina',
  linkContact: 'Contact our team',
  linkDelivery: 'Delivery & order enquiries',
} as const;
export type MessageKey = keyof typeof en;

const ar: Record<MessageKey, string> = {
  skipToContent: 'تخطَّ إلى المحتوى',
  announcement: 'صحة وجمال وعناية يومية. مرحباً من صيدلية المينة.',
  homeAria: 'صيدلية المينة – الصفحة الرئيسية',
  quickContactAria: 'تواصل سريع',
  contactAria: 'تواصل مع صيدلية المينة',
  language: 'اللغة',
  footerShopAria: 'تسوق',
  footerHelpAria: 'مساعدة',
  footerTagline: 'قليل من العناية الإضافية ليومك. صحة وعناية بالبشرة ومستلزمات يومية من صيدلية الحي.',
  footerLocation: 'رأس الخيمة، الإمارات العربية المتحدة',
  footerShop: 'اعثر على مستلزماتك',
  footerHelp: 'نحن هنا للمساعدة',
  footerTalk: 'لنتحدث عن العناية.',
  footerSupport: 'لتوفر المنتجات والتوصيل ودعم الطلبات.',
  footerBottom: 'صيدلية المينة · رأس الخيمة',
  footerCare: 'عناية أقرب إليك.',
  shopNavigationAria: 'تنقل التسوق',
  mainNavigationAria: 'التنقل الرئيسي',
  navHome: 'الرئيسية',
  navCategories: 'الفئات',
  navProducts: 'المنتجات',
  navCart: 'السلة',
  navOffers: 'العروض',
  navShopProducts: 'تسوق المنتجات',
  navBrowseCategories: 'تصفح الفئات',
  navSkincare: 'العناية بالبشرة',
  navVitamins: 'الفيتامينات والعافية',
  navBaby: 'العناية بالطفل',
  navAbout: 'عن المينة',
  linkShopBrands: 'تسوق الماركات',
  linkAccount: 'حسابك',
  linkSaved: 'المنتجات المحفوظة',
  linkAllProducts: 'كل المنتجات',
  linkCategories: 'تسوق حسب الفئة',
  linkOffers: 'العروض الحالية',
  linkCart: 'سلة التسوق',
  linkLocal: 'صيدلية في رأس الخيمة',
  linkGuides: 'أدلة العناية والشراء',
  linkAbout: 'عن المينة',
  linkContact: 'تواصل مع فريقنا',
  linkDelivery: 'استفسارات التوصيل والطلبات',
};

export const messages: Record<Locale, Record<MessageKey, string>> = { en, ar };
export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
