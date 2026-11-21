"use client";
import { useState } from "react";
import Image, { type ImageProps, type ImageLoaderProps } from "next/image";
import { cloudinaryDelivery } from "../lib/catalog/image-delivery";

type Props = Omit<ImageProps, "loader"> & { cloudName?: string | undefined };

export function ProductImage({ cloudName, alt, ...props }: Props) {
  const [failed, setFailed] = useState<ImageProps["src"] | null>(null);
  const source = failed === props.src ? "/product-placeholder.svg" : props.src;
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
