// Missing audience preserves legacy visibility. Unknown values fail closed.
export const retailAudienceFilter = { $or: [{ audience: { $exists: false } }, { $expr: { $in: ['$audience', ['all', 'retail']] } }] };
export function wholesaleAudienceFilter(typeId: string, prefix = '') {
  return { $and: [
    { $or: [{ [prefix + 'audience']: { $exists: false } }, { $expr: { $in: ['$' + prefix + 'audience', ['all', 'wholesale']] } }] },
    { $or: [{ [prefix + 'wholesaleAudience']: { $exists: false } }, { $expr: { $eq: ['$' + prefix + 'wholesaleAudience', 'all'] } },
      { $expr: { $and: [{ $eq: ['$' + prefix + 'wholesaleAudience', 'selected'] }, { $in: [typeId, { $cond: [{ $isArray: '$' + prefix + 'wholesaleTypeIds' }, '$' + prefix + 'wholesaleTypeIds', []] }] }] } }] },
  ] };
}
