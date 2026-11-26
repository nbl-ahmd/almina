import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient, type Document, type Filter } from 'mongodb';
import { areaKey, areaReplacements, rakDeliveryAreas, rakEmirateKeys, resolveDeliveryArea } from '../packages/contracts/src/order-routing';
import { areaScope } from '../apps/api/src/modules/orders/routing';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');

// The query this one replaced (one $switch branch for each area), kept as the reference for staff order access.
function previousAreaScope(areaIds: string[], complement: boolean): Filter<Document> {
  const key = (field: string) => areaReplacements.reduce<Document>((input, [find, replacement]) => ({ $replaceAll: { input, find, replacement } }),
    { $toLower: { $trim: { chars: ' \t\r\n', input: { $cond: [{ $eq: [{ $type: field }, 'string'] }, field, ''] } } } });
  const aliases = new Map<string, string[]>();
  for (const area of rakDeliveryAreas) for (const name of [area.name, ...area.aliases]) aliases.set(areaKey(name), [...new Set([...(aliases.get(areaKey(name)) ?? []), area.id])]);
  const area = { $cond: [{ $in: [key('$customer.emirate'), rakEmirateKeys] }, { $switch: {
    branches: rakDeliveryAreas.map(row => ({ case: { $in: [key('$customer.city'), [...aliases].filter(([, ids]) => ids.length === 1 && ids[0] === row.id).map(([name]) => name)] }, then: row.id })), default: null,
  } }, null] };
  return { $or: [
    { 'routing.version': 1, 'routing.areaId': { [complement ? '$nin' : '$in']: areaIds } },
    { 'routing.version': { $ne: 1 }, $expr: complement ? { $not: [{ $in: [area, areaIds] }] } : { $in: [area, areaIds] } },
  ] };
}
function samples(): Document[] {
  const ids = rakDeliveryAreas.map(area => area.id), names = rakDeliveryAreas.flatMap(area => [area.name, ...area.aliases]);
  const upper = (value: string) => value.replace(/[a-z]/g, letter => letter.toUpperCase());
  const emirates = ['Ras al-Khaimah', 'Ras Al Khaimah', 'RAK', ' rak ', 'رأس الخيمة', 'راس الخيمة'];
  const typed = names.flatMap((name, index) => [name, upper(name), `\t ${name.replaceAll(' ', '-')} \n`, `${name.replaceAll(' ', '_')}.`]
    .map((city, variant) => ({ customer: { city, emirate: emirates[(index + variant) % emirates.length] } })));
  const odd: Document[] = [
    ...['Dubai', 'Sharjah', 'Ras al-Khaimah Emirate', '', 5, null].map(emirate => ({ customer: { city: names[0], emirate } })),
    ...['Unlisted place', `${names[0]} extra`, '', 5, null, [names[0]], { name: names[0] }].map(city => ({ customer: { city, emirate: 'RAK' } })),
    { customer: { city: names[0] } }, { customer: { emirate: 'RAK' } }, { customer: {} }, {},
    // Reviewed or newer orders use the stored area and ignore the typed name; any other version reads the typed name.
    ...[ids[0], ids[1], ids.at(-1), 'rak-unknown', null, undefined].map(areaId => ({ routing: { version: 1, ...(areaId === undefined ? {} : { areaId }) }, customer: { city: names[0], emirate: 'RAK' } })),
    { routing: { version: 2, areaId: ids[1] }, customer: { city: rakDeliveryAreas[0]!.name, emirate: 'RAK' } },
    { routing: { reviewedAt: new Date() }, customer: { city: rakDeliveryAreas[0]!.name, emirate: 'RAK' } },
  ];
  return [...typed, ...odd].map((row, index) => ({ _id: index, ...row }));
}

test('the area query selects exactly the orders the previous query and the delivery-area resolver select', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_area_' + randomUUID().replaceAll('-', ''));
  try {
    const rows = samples(), collection = db.collection<Document & { _id: number }>('orders');
    await collection.insertMany(rows as (Document & { _id: number })[]);
    const selected = async (filter: Filter<Document>) => (await collection.find(filter as unknown as Filter<Document & { _id: number }>, { projection: { _id: 1 } }).sort({ _id: 1 }).toArray()).map(row => row._id);
    // The resolver is slow enough in a loop that each order's area is worked out once.
    const areaOf = rows.map(row => (row.routing?.version === 1 ? row.routing.areaId : resolveDeliveryArea(row.customer ?? {})) as string);
    const expected = (ids: string[], complement: boolean) => rows.filter((_, index) => ids.includes(areaOf[index]!) !== complement).map(row => row._id as number);
    const ids = rakDeliveryAreas.map(area => area.id);
    const shared = new Map<string, Set<string>>();
    for (const area of rakDeliveryAreas) for (const name of [area.name, ...area.aliases]) shared.set(areaKey(name), (shared.get(areaKey(name)) ?? new Set<string>()).add(area.id));
    const ambiguous = [...shared.values()].filter(owners => owners.size > 1).flatMap(owners => [...owners]);
    const sets = [[], [ids[0]!], ids.filter((_, index) => index % 7 === 0), ids.slice(0, 90), ids.slice(90), [...new Set(ambiguous)], ['rak-unknown'], ids];
    for (const set of sets) for (const complement of [false, true]) {
      const actual = await selected(areaScope(set, complement));
      assert.deepEqual(actual, await selected(previousAreaScope(set, complement)), `previous query, ${set.length} areas, complement ${complement}`);
      assert.deepEqual(actual, expected(set, complement), `resolver, ${set.length} areas, complement ${complement}`);
    }
    for (const area of rakDeliveryAreas) assert.deepEqual(await selected(areaScope([area.id])), expected([area.id], false), area.name);
  } finally { await db.dropDatabase(); await client.close(); }
});
