import { displayPrice, type Product } from "./model";

export const homeCollections = [
  {
    slug: "skin-essentials",
    title: "The skincare shelf",
    description:
      "Explore cleansers, moisturisers and daily skincare from our current range.",
    queries: ["cerave", "bioderma", "cetaphil"],
    theme: "skin",
  },
  {
    slug: "baby-care",
    title: "Care for their little world",
    description: "Discover baby care, feeding and everyday family essentials.",
    queries: ["baby", "avent", "chicco"],
    theme: "baby",
  },
  {
    slug: "daily-care",
    title: "Everyday personal care",
    description:
      "Browse body, hair and personal care products for your daily routine.",
    queries: ["sebamed", "johnson", "oral"],
    theme: "daily",
  },
  {
    slug: "under-50",
    title: "Little essentials, AED 50 & under",
    description:
      "Explore currently available essentials priced at AED 50 or less.",
    queries: ["sebamed", "johnson", "oral"],
    theme: "value",
  },
] as const;
export type HomeCollection = (typeof homeCollections)[number];
export function findCollection(slug: string) {
  return homeCollections.find((collection) => collection.slug === slug);
}
export const collectionHref = (collection: HomeCollection) =>
  `/collections/${collection.slug}`;
export function uniqueProducts(products: Product[]) {
  return [
    ...new Map(products.map((product) => [product._id, product])).values(),
  ];
}
/** New discoveries first; overlap must not erase a useful shopping collection. */
export function prioritizeShelf(products: Product[], earlier: Product[]) {
  const shown = new Set(earlier.map(product => product._id));
  return uniqueProducts([...products.filter(product => !shown.has(product._id)), ...products]);
}
export function collectionProducts(
  collection: HomeCollection,
  products: Product[],
) {
  return uniqueProducts(products).filter((product) => {
    if (product.disabled || product.category.disabled || product.stock <= 0)
      return false;
    const text = `${product.name} ${product.category.name}`;
    if (collection.theme === "value") return displayPrice(product) <= 50;
    if (collection.theme === "skin")
      return /skin|cerave|bioderma|cetaphil|cleanser|moistur/i.test(text);
    if (collection.theme === "baby")
      return /baby|avent|chicco|feeding|nappy|diaper/i.test(text);
    return /sebamed|johnson|oral|hair|shampoo|body|personal|tooth|deodorant/i.test(
      text,
    );
  });
}
const knownBrands = [
  "CeraVe",
  "Bioderma",
  "Cetaphil",
  "Sebamed",
  "Philips Avent",
  "Chicco",
  "Johnson",
];
export function catalogueBrands(products: Product[]) {
  const counts = new Map<string, number>();
  for (const product of uniqueProducts(products).filter(
    (item) => item.stock > 0,
  )) {
    const brand =
      product.brand?.trim() ||
      product.familyBrand?.trim() ||
      knownBrands.find((name) =>
        product.name.toLowerCase().startsWith(name.toLowerCase()),
      );
    if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }
  return [...counts.keys()].sort((a, b) => a.localeCompare(b)).slice(0, 8);
}
export function bannerDestination(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 2000 ||
    /[\\\s]/.test(value) ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** URL name for a brand landing page: "Dolce & Gabbana" → "dolce-gabbana". Stable for the same brand text. */
export function brandSlug(name: string) {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
