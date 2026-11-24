// Dependency-free so client components can format amounts without loading the catalogue schemas.
// Presentation only: amounts come from existing catalogue or checkout responses.
export const money = (value: number, locale: 'en' | 'ar' = 'en') => locale === 'en' ? `AED ${value.toFixed(2)}` : new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
