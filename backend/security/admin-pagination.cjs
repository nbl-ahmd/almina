const { fail } = require("./boundary.cjs");
// Opt-in for legacy clients; Next admin always supplies a bounded limit.
function adminPagination(query) {
  if (query.limit === undefined && query.offset === undefined) return undefined;
  const limit = Number(query.limit ?? 25);
  const offset = Number(query.offset ?? 0);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 10000
  )
    throw fail(400, "INVALID_REQUEST");
  return { limit, offset };
}
module.exports = { adminPagination };
