import 'server-only';
import { cache } from 'react';
import { readWebEnvironment } from '@almina/config/env';

// Read deployment settings at request time; never export process.env to a component.
export const getWebEnvironment = cache(() => {
  return readWebEnvironment(process.env);
});
