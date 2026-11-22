"use client";
import { inputClass } from './shadcn/styles';
import { buttonVariants } from "./ui";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import Link from "../app-link";
import {
  ShoppingBagIcon,
  CubeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  staffAlertFeedSchema,
  staffAlertPreferencesSchema,
  staffAlertRulesSchema,
  type StaffAlert,
} from "@almina/contracts";
import { adminRequest } from "./controls";
type Preferences = ReturnType<typeof staffAlertPreferencesSchema.parse>;
type Rules = ReturnType<typeof staffAlertRulesSchema.parse>;
export function NotificationCenter({ admin }: { admin: boolean }) {
  const [items, setItems] = useState<StaffAlert[]>([]),
    [filter, setFilter] = useState<"all" | "unread">("all"),
    [cursor, setCursor] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [preferences, setPreferences] = useState<Preferences | null>(null),
    [rules, setRules] = useState<Rules | null>(null),
    [threshold, setThreshold] = useState(5);
  const load = useCallback(
    async (before?: string) => {
      const feed = staffAlertFeedSchema.parse(
        await adminRequest(
          `orders/notifications?filter=${filter}${before ? `&before=${before}` : ""}`,
        ),
      );
      setItems((prior) =>
        before
          ? [
              ...prior,
              ...feed.items.filter(
                (item) => !prior.some((old) => old.id === item.id),
              ),
            ]
          : feed.items,
      );
      setCursor(feed.nextCursor);
      setLoaded(true);
    },
    [filter],
  );
  useEffect(() => {
    let stopped = false;
    void Promise.resolve()
      .then(() => load())
      .catch(() => {
        if (!stopped) setError("Could not load notifications. Try refreshing.");
      });
    const refresh = (event: Event) => {
      const parsed = staffAlertFeedSchema.safeParse(
        (event as CustomEvent<unknown>).detail,
      );
      if (!parsed.success) return;
      setItems((prior) => {
        const merged = [
          ...parsed.data.items,
          ...prior.filter(
            (item) => !parsed.data.items.some((fresh) => fresh.id === item.id),
          ),
        ];
        return filter === "unread"
          ? merged.filter((item) => !item.read)
          : merged;
      });
    };
    window.addEventListener("almina:alert-feed", refresh);
    return () => {
      stopped = true;
      window.removeEventListener("almina:alert-feed", refresh);
    };
  }, [load, filter]);
  useEffect(() => {
    void Promise.all([
      adminRequest("orders/notifications/preferences").then((value) =>
        setPreferences(staffAlertPreferencesSchema.parse(value)),
      ),
      ...(admin
        ? [
            adminRequest("orders/notifications/rules").then((value) => {
              const parsed = staffAlertRulesSchema.parse(value);
              setRules(parsed);
              setThreshold(parsed.lowStockThreshold);
            }),
          ]
        : []),
    ]).catch(() =>
      setError("Could not load alert settings. Refresh before saving."),
    );
  }, [admin]);
  async function act(task: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      setMessage(success);
      await load();
      window.dispatchEvent(new Event("almina:notifications-changed"));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function markVisible() {
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    for (let index = 0; index < ids.length; index += 25)
      await adminRequest("orders/notifications/read", "POST", {
        ids: ids.slice(index, index + 25),
      });
  }
  useEffect(() => { if (message) toast.success(message); }, [message]);
  useEffect(() => { if (error) toast.error(error); }, [error]);
  return (
    <>
      <section
        className="mb-4 grid gap-4 rounded-xl bg-surface p-5 border border-line md:p-6"
        aria-labelledby="notification-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 [&_h2]:m-0 [&_h2]:text-base [&_h2]:font-semibold [&_p]:m-0 [&_p]:mt-0.5 [&_p]:text-[13px] [&_p]:text-mute">
          <div>
            <h2 id="notification-heading">Activity inbox</h2>
            <p>
              Read status is personal. Marking an alert as read does not confirm
              an order.
            </p>
          </div>
          <button
            className={buttonVariants({ variant: "outline", size: "sm" })}
            disabled={busy}
            onClick={() =>
              void act(
                () =>
                  adminRequest("orders/notifications/test", "POST", {
                    key: crypto.randomUUID(),
                  }),
                "Test added to your inbox and queued for your registered devices. Browser delivery may take a moment.",
              )
            }
          >
            Send test notification
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 [&>div]:flex [&>div]:gap-2">
          <div role="group" aria-label="Filter notifications">
            {(["all", "unread"] as const).map((value) => (
              <button
                key={value}
                className={`h-9 rounded-lg px-4 text-[13px] font-medium ${filter === value ? "bg-ink text-white" : "bg-fill text-ink-2 hover:bg-line"}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "All activity" : "Unread"}
              </button>
            ))}
          </div>
          <button
            className={buttonVariants({ variant: "outline", size: "sm" })}
            disabled={busy || !items.some((item) => !item.read)}
            onClick={() =>
              void act(markVisible, "Visible notifications marked as read.")
            }
          >
            Mark page as read
          </button>
        </div>
        {!loaded ? (
          <p role="status">Loading activity…</p>
        ) : items.length === 0 ? (
          <div className="grid justify-items-center gap-1 rounded-lg bg-soft px-6 py-10 text-center [&_h3]:m-0 [&_h3]:text-[15px] [&_h3]:font-semibold [&_p]:m-0 [&_p]:text-[13px] [&_p]:text-mute">
            <h3>You’re up to date</h3>
            <p>
              {filter === "unread"
                ? "No unread activity."
                : "New orders and operational alerts will appear here."}
            </p>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {items.map((item) => (
              <li key={item.id} data-unread={!item.read} className={`grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 rounded-lg p-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center ${item.read ? "bg-soft" : "bg-soft ring-1 ring-ink/10"} [&_p]:m-0 [&_p]:text-[13px] [&_p]:text-ink-2 [&_time]:text-xs [&_time]:text-mute [&>button]:col-start-2 [&>button]:justify-self-start sm:[&>button]:col-start-3`}>
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-ink" aria-hidden="true">
                  {item.kind === "order" ? (
                    <ShoppingBagIcon width={18} height={18} />
                  ) : item.kind === "test" ? (
                    <CheckCircleIcon width={18} height={18} />
                  ) : item.kind === "payment" ? (
                    <ExclamationTriangleIcon width={18} height={18} />
                  ) : (
                    <CubeIcon width={18} height={18} />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 [&>a]:text-sm [&>a]:font-semibold [&>a]:text-ink [&>a]:no-underline hover:[&>a]:underline [&>span]:rounded-lg [&>span]:bg-fill [&>span]:px-2 [&>span]:py-0.5 [&>span]:text-[11px] [&>span]:font-medium [&>span]:text-mute">
                    <Link href={item.href}>{item.title}</Link>
                    <span>
                      {item.resolved
                        ? "Resolved"
                        : item.read
                          ? "Read"
                          : "Unread"}
                    </span>
                  </div>
                  <p>{item.description}</p>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <button
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  disabled={busy}
                  aria-label={`${item.read ? "Mark unread" : "Mark read"}: ${item.title}`}
                  onClick={() =>
                    void act(
                      () =>
                        adminRequest("orders/notifications/read", "POST", {
                          ids: [item.id],
                          read: !item.read,
                        }),
                      "Notification updated.",
                    )
                  }
                >
                  {item.read ? "Mark unread" : "Mark read"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {cursor ? (
          <button
            className={buttonVariants({ variant: "outline", size: "sm" })}
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void load(cursor)
                .catch(() => setError("Could not load earlier activity."))
                .finally(() => setBusy(false));
            }}
          >
            Load earlier activity
          </button>
        ) : null}
        <p className="m-0 text-xs text-mute">
          Activity is retained for 30 days. The Orders inbox remains the source
          of truth for work awaiting confirmation.
        </p>
      </section>
      <section className="mb-4 grid gap-4 rounded-xl bg-surface p-5 border border-line md:p-6 [&_h2]:m-0 [&_h2]:text-base [&_h2]:font-semibold [&>p]:m-0 [&>p]:text-[13px] [&>p]:text-mute">
        <h2>Background alert preferences</h2>
        <p>
          Choose which updates reach your registered devices. All relevant
          activity stays in your inbox.
        </p>
        {preferences ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void act(
                () =>
                  adminRequest(
                    "orders/notifications/preferences",
                    "PUT",
                    preferences,
                  ),
                "Alert preferences saved.",
              );
            }}
          >
            <div className="mb-4 grid gap-2 sm:grid-cols-2 [&_label]:flex [&_label]:items-center [&_label]:gap-3 [&_label]:rounded-lg [&_label]:bg-soft [&_label]:p-3 [&_label]:text-[13px] [&_label]:font-medium">
              {(
                [
                  ["pushOrders", "New orders"],
                  ...(admin
                    ? [
                        ["pushStock", "Low and out-of-stock products"],
                        ["pushPayment", "Payment reconciliation issues"],
                      ]
                    : []),
                ] as [keyof Preferences, string][]
              ).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        [key]: event.target.checked,
                      })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <button className={buttonVariants({ variant: "default" })} disabled={busy}>Save preferences</button>
          </form>
        ) : (
          <p>Loading preferences…</p>
        )}
        {admin && rules ? (
          <form
            className="grid gap-2 border-t border-line pt-4 [&_label]:text-[13px] [&_label]:font-medium [&_p]:m-0 [&_p]:text-xs [&_p]:text-mute [&>div]:flex [&>div]:flex-wrap [&>div]:gap-2 [&_input]:max-w-40"
            onSubmit={(event) => {
              event.preventDefault();
              void act(async () => {
                const updated = staffAlertRulesSchema.parse(
                  await adminRequest("orders/notifications/rules", "PUT", {
                    lowStockThreshold: threshold,
                    revision: rules.revision,
                  }),
                );
                setRules(updated);
              }, "Stock threshold saved. Existing stock will be updated quietly.");
            }}
          >
            <label htmlFor="low-stock-threshold">Low-stock threshold</label>
            <p>
              Alert when main catalogue stock reaches this quantity or below.
              Out-of-stock alerts appear at zero. Changing this setting does not
              notify through existing backlog.
            </p>
            <div>
              <input className={inputClass}
                id="low-stock-threshold"
                type="number"
                min={0}
                max={1000}
                required
                value={threshold}
                onChange={(event) => setThreshold(event.target.valueAsNumber)}
              />
              <button className={buttonVariants({ variant: "default" })} disabled={busy}>Save threshold</button>
            </div>
          </form>
        ) : null}
      </section>
    </>
  );
}
