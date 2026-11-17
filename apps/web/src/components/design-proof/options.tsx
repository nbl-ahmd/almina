import Link from "../app-link";
import { sameFamilyIdentity } from "@almina/contracts";
import { productOptionLabel, type Product } from "../../lib/catalog/model";
import { proofHref, words, type Lang } from "./shared";
import s from "./proof.module.css";
export function ProductOptions({
  product,
  variants,
  returnTo,
  lang,
  headingAs: Heading = "h2",
}: {
  product: Product;
  variants: Product[];
  returnTo: string;
  lang: Lang;
  headingAs?: "h2" | "h3";
}) {
  const members = variants.filter((member) =>
    sameFamilyIdentity(product, member),
  );
  if (members.length < 2) return null;
  return (
    <div className={s.options}>
      <Heading className={s.optionTitle}>{words(lang, "Choose your pack", "اختر العبوة")}</Heading>
      {members.map((item) => (
        <Link
          key={item._id}
          href={proofHref(item) + "?returnTo=" + encodeURIComponent(returnTo)}
          data-store-control="option"
          aria-current={item._id === product._id ? "page" : undefined}
        >
          {productOptionLabel(item) || item.name}
        </Link>
      ))}
    </div>
  );
}
