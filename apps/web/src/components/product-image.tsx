"use client";
import { ShoppingBagIcon } from "./storefront-icons";
import { useState } from "react";
import Image, { type ImageProps, type ImageLoaderProps } from "next/image";
import { cloudinaryDelivery } from "../lib/catalog/image-delivery";

type Props = Omit<ImageProps, "loader"> & { cloudName?: string | undefined; locale?: "en" | "ar" };

export function ProductImage({ cloudName, alt, locale = "en", ...props }: Props) {
  const [failed, setFailed] = useState<ImageProps["src"] | null>(null);
  if (failed === props.src || props.src === "/product-placeholder.svg") {
    const label = locale === "ar" ? "الصورة غير متاحة" : "Image unavailable";
    return <span className={`${props.className ?? ""} product-image-fallback`} role="img" aria-label={alt || label}><ShoppingBagIcon aria-hidden="true" /><span>{label}</span></span>;
  }
  const source = props.src;
  const useCdn = cloudinaryDelivery(source, cloudName, 640) !== null;
  const loader = ({ src, width }: ImageLoaderProps) =>
    cloudinaryDelivery(src, cloudName, width) ?? src;
  // Local artwork/placeholders retain Next's optimizer; product photos avoid double encoding.
  return (
    <Image
      {...props}
      src={source}
      alt={alt}
      {...(useCdn ? { loader } : {})}
      onError={(event) => {
        if (source !== "/product-placeholder.svg") setFailed(props.src);
        props.onError?.(event);
      }}
    />
  );
}
