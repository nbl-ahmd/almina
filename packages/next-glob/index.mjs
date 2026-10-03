// Next lint root discovery is the sole consumer. Keep fast-glob directory
// semantics without its vulnerable micromatch/braces dependency.
import { globSync as find } from 'tinyglobby';
export const globSync = (patterns, options = {}) => find(patterns, {
  ...options,
  expandDirectories: false,
});
