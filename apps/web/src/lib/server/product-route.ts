import 'server-only';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { getProductByPublicId, resolveProduct } from './catalog';
import { productReplacement } from './product-replacements';
import { productHref, slugIdentity } from '../catalog/model';
export const resolveProductRoute = cache(async (slug: string) => {
  const product = await resolveProduct(slug);
  if (product) return product;
  const id = slugIdentity(slug);
  const replacementId = id ? productReplacement(id) : undefined;
  const replacement = replacementId ? await getProductByPublicId(replacementId) : null;
  if (replacement) permanentRedirect(productHref(replacement));
  notFound();
});
