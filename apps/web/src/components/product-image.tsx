'use client';
import Image, { type ImageProps, type ImageLoaderProps } from 'next/image';
import { cloudinaryDelivery } from '../lib/catalog/image-delivery';

type Props = Omit<ImageProps, 'loader'> & { cloudName?: string | undefined };

export function ProductImage({ cloudName, alt, ...props }: Props) {
  const useCdn = cloudinaryDelivery(props.src, cloudName, 640) !== null;
  const loader = ({ src, width }: ImageLoaderProps) => cloudinaryDelivery(src, cloudName, width) ?? src;
  // Non-Cloudinary/local/legacy media retains Next's existing optimizer and host policy.
  return <Image {...props} alt={alt} {...(useCdn ? { loader } : {})} />;
}
