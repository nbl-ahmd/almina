"use client";
import { useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";
import { staffAlertFeedSchema } from "@almina/contracts";
import { newStaffAlerts } from "../../lib/admin/alert-events";

export function AlertMonitor({ actor }: { actor: string }) {
  const cutoff = useRef<string | null>(null),
    seen = useRef(new Set<string>());
  useEffect(() => {
    let stopped = false,
      busy = false;
    const abort = new AbortController();
    const key = `almina:alerts:${actor}`;
    async function poll() {
      if (busy || document.visibilityState !== "visible" || !navigator.onLine)
        return;
      busy = true;
      try {
        const response = await fetch("/api/admin/orders/notifications", {
          cache: "no-store",
          signal: abort.signal,
        });
        if (!response.ok) throw new Error();
        const feed = staffAlertFeedSchema.parse(await response.json());
        if (stopped) return;
        if (!cutoff.current) {
          cutoff.current = feed.observedAt;
          for (const item of feed.items) seen.current.add(item.id);
          return;
        }
        const fresh = newStaffAlerts(feed.items, cutoff.current, seen.current);
        let interrupted = false;
        for (const item of fresh) {
          seen.current.add(item.id);
          if (seen.current.size > 1000)
            seen.current = new Set([...seen.current].slice(-1000));
          const claim = async () => {
            let known: string[] = [];
            try {
              known = JSON.parse(localStorage.getItem(key) ?? "[]");
              if (!Array.isArray(known)) known = [];
            } catch {
              /* Storage can be unavailable in private browsing. */
            }
            if (known.includes(item.id)) return;
            try {
              localStorage.setItem(
                key,
                JSON.stringify([...known, item.id].slice(-1000)),
              );
            } catch {
              /* Dedupe remains in memory. */
            }
            toast(item.title, {
              id: item.id,
              description: item.description,
              duration: 8000,
              action: {
                label: "View",
                onClick: () => window.location.assign(item.href),
              },
            });
            interrupted = true;
          };
          if (navigator.locks) await navigator.locks.request(key, claim);
          else await claim();
        }
        if (interrupted)
          window.dispatchEvent(new CustomEvent("almina:new-alert"));
        window.dispatchEvent(
          new CustomEvent("almina:alert-feed", { detail: feed }),
        );
        const badge = navigator as Navigator & {
          setAppBadge?: (count: number) => Promise<void>;
          clearAppBadge?: () => Promise<void>;
        };
        if (feed.unread)
          void badge.setAppBadge?.(feed.unread).catch(() => undefined);
        else void badge.clearAppBadge?.().catch(() => undefined);
      } catch {
        /* OrderMonitor shows transport health; polling retries without noisy toasts. */
      } finally {
        busy = false;
      }
    }
    function resume() {
      cutoff.current = null;
      void poll();
    } // Returning to a tab never chimes through a backlog.
    function message() {
      void poll();
    }
    // Updating an existing registration never prompts for permission or adds a device.
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker
        .getRegistration("/admin/")
        .then((registration) => registration?.update())
        .catch(() => undefined);
    void poll();
    // Order events trigger an immediate poll (below); this interval is only the safety net for stock and payment alerts.
    const timer = setInterval(() => void poll(), 60000);
    window.addEventListener("almina:orders-updated", message);
    window.addEventListener("almina:notifications-changed", message);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    navigator.serviceWorker?.addEventListener("message", message);
    return () => {
      stopped = true;
      abort.abort();
      clearInterval(timer);
      window.removeEventListener("almina:orders-updated", message);
      window.removeEventListener("almina:notifications-changed", message);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      navigator.serviceWorker?.removeEventListener("message", message);
    };
  }, [actor]);
  return (
    <Toaster
      position="top-right"
      closeButton
      visibleToasts={3}
      toastOptions={{ style: { fontFamily: "inherit", borderRadius: "12px" } }}
    />
  );
}
