"use client";
import { useState, type ReactNode } from "react";
import Image, { type ImageProps, type ImageLoaderProps } from "next/image";
import { cloudinaryDelivery } from "../lib/catalog/image-delivery";

type Props = Omit<ImageProps, "loader"> & { cloudName?: string | undefined; fallback?: ReactNode };

export function ProductImage({ cloudName, alt, fallback, ...props }: Props) {
  const [failed, setFailed] = useState<ImageProps["src"] | null>(null);
  const source = failed === props.src ? "/product-placeholder.svg" : props.src;
  if (failed === props.src && fallback) return fallback;
  // Local fixture rasters are fetched by the browser during development, avoiding
  // a server-side private-IP optimizer exception. Production keeps its existing
  // trusted-host/optimizer policy; no global local-network access is enabled.
  const localFixture = process.env.NODE_ENV === 'development' && typeof source === 'string'
    && /^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/api\/products\/images\/[a-z0-9_.-]+$/i.test(source);
  const useCdn = cloudinaryDelivery(source, cloudName, 640) !== null;
  const loader = ({ src, width }: ImageLoaderProps) =>
    cloudinaryDelivery(src, cloudName, width) ?? src;
  // Local artwork/placeholders retain Next's optimizer; product photos avoid double encoding.
  return (
    <Image
      {...props}
      src={source}
      alt={alt}
      unoptimized={localFixture || props.unoptimized === true}
      {...(useCdn ? { loader } : {})}
      onError={(event) => {
        if (source !== "/product-placeholder.svg") setFailed(props.src);
        props.onError?.(event);
      }}
    />
  );
}
