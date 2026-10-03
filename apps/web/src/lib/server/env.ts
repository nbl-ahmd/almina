import 'server-only';
import { readWebEnvironment } from '@almina/config/env';

// Read deployment settings at request time; never export process.env to a component.
export function getWebEnvironment() {
  return readWebEnvironment(process.env);
}
