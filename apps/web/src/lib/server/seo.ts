import 'server-only';
import { getWebEnvironment } from './env';
import { pageMetadata, type Query } from '../seo';
export function metadataFor(title: string, description: string, path: string, query: Query = {}, image?: string) {
  const env = getWebEnvironment();
  return pageMetadata(env.WEB_ORIGIN, env.APP_ENV === 'production', title, description, path, query, image);
}
