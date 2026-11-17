import Image from "next/image";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Link from "../app-link";
import { shopText } from "../../lib/i18n-storefront";
import { words, type Lang } from "./shared";
import type { Category } from "../../lib/catalog/model";
import s from "./proof.module.css";
export function Campaign({
  lang,
  headingId = "campaign-heading",
  headingAs: Heading = "h1",
  priority = true,
}: {
  lang: Lang;
  headingId?: string;
  headingAs?: "h1" | "h3";
  priority?: boolean;
}) {
  return (
    <section className={s.campaign} aria-labelledby={headingId}>
      <div>
        <Heading id={headingId} className={s.campaignTitle}>
          {words(
            lang,
            "Everyday care.\nOne easy stop.",
            "عنايتك اليومية.\nفي مكان واحد.",
          )}
        </Heading>
        <p>
          {words(
            lang,
            "Find your skincare and daily essentials.",
            "اكتشف منتجات العناية والبضائع اليومية.",
          )}
        </p>
        <Link className={s.primary} href="/design-proof/products">
          {words(lang, "Shop essentials", "تسوق الأساسيات")}
          <ArrowUpRightIcon aria-hidden="true" />
        </Link>
      </div>
      <Image
        src="/design/campaigns/almina-care-courier.png"
        alt=""
        width={500}
        height={500}
        priority={priority}
        className={s.courier}
      />
    </section>
  );
}
export function CategoryLane({
  categories,
  lang,
  headingId = "categories-heading",
  headingAs: Heading = "h2",
}: {
  categories: readonly Pick<Category, "_id" | "name">[];
  lang: Lang;
  headingId?: string;
  headingAs?: "h2" | "h3";
}) {
  return (
    <section className={s.categories} aria-labelledby={headingId}>
      <div className={s.sectionHead}>
        <Heading id={headingId} className={s.categoryTitle}>
          {words(lang, "Shop by category", "تسوق حسب الفئة")}
        </Heading>
        <Link href="/design-proof/products">
          {words(lang, "View all", "عرض الكل")}
        </Link>
      </div>
      <div className={s.categoryList}>
        {categories.map((category, index) => (
          <Link
            key={category._id}
            href={`/design-proof/products?category=${category._id}`}
            className={s.category}
          >
            <span className={s.categoryArt}>
              <Image
                src="/design/categories/pharmacy-categories.png"
                alt=""
                width={1536}
                height={1024}
                style={{
                  left: `-${(index % 3) * 100}%`,
                  top: `-${Math.floor(index / 3) * 100}%`,
                }}
              />
            </span>
            <span>{shopText(lang, category.name)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
