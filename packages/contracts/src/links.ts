import { z } from 'zod';
/** A path on this site: no external, API or admin destinations. */
export const localLink = z.string().max(250).refine(value => /^\/(?!\/)[a-zA-Z0-9/_?=&%-]*$/.test(value) && !value.startsWith('/api') && !value.startsWith('/admin'));
