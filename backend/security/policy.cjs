// Retained allowlist import contract; TypeScript owns the exact route authorization map.
const domain = require('../commerce/dist/service.cjs');
module.exports = { routePolicies: domain.retainedRoutePolicies, lookupPolicy: domain.lookupPolicy };
