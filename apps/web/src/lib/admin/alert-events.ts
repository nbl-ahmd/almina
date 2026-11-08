import type { StaffAlert } from "@almina/contracts";
/** Only events created after this visible session's server baseline may interrupt it. */
export function newStaffAlerts(
  items: StaffAlert[],
  observedAfter: string,
  seen: ReadonlySet<string>,
) {
  const cutoff = Date.parse(observedAfter);
  return items.filter(
    (item) =>
      item.announce &&
      !item.read &&
      !item.resolved &&
      !seen.has(item.id) &&
      Date.parse(item.createdAt) > cutoff,
  );
}
