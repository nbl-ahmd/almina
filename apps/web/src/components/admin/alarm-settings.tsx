"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getOrderAlarm } from "../../lib/admin/order-alarm";
import { buttonVariants } from "./ui";

/** The loud alarm for a screen that has the console open. With the app closed the normal push notification is used instead. */
export function AlarmSettings() {
  const alarm = getOrderAlarm();
  const status = useSyncExternalStore(alarm.subscribe, alarm.status, () => "off" as const);
  const [awake, setAwake] = useState(false), [canKeepAwake, setCanKeepAwake] = useState(false), [message, setMessage] = useState("");
  useEffect(() => {
    // Browser-only facts: they cannot be read during server rendering without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAwake(alarm.keepAwake()); setCanKeepAwake("wakeLock" in navigator);
  }, [alarm]);
  const on = status === "armed" || status === "ringing";
  return (
    <div className="grid gap-2 rounded-lg bg-fill p-3" aria-label="Loud order alarm">
      <p><strong className="font-semibold text-ink">Loud alarm while this page is open</strong></p>
      <p>When a new order arrives and this page is open, it rings like a delivery app until someone presses Silence or the order is confirmed (it stops by itself after 5 minutes). With the app closed or the screen off you get the normal notification and its sound instead. Browsers only allow sound after a tap, so turn it on once each time you open the app.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonVariants({ variant: on ? "outline" : "default" })}
          onClick={async () => { if (on) { alarm.disarm(); setMessage(""); } else setMessage((await alarm.arm()) ? "Alarm is on for this page." : "Your browser blocked sound. Tap again, or check the site's sound setting."); }}>
          {on ? "Turn alarm off" : status === "needs-tap" ? "Tap to arm alarm" : "Turn alarm on"}
        </button>
        <button type="button" className={buttonVariants({ variant: "outline" })} disabled={!on} onClick={() => alarm.test()}>Test alarm</button>
        {canKeepAwake ? (
          <label className="inline-flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={awake} onChange={(event) => { setAwake(event.target.checked); alarm.setKeepAwake(event.target.checked); }} />
            Keep this screen awake while the alarm is on
          </label>
        ) : null}
      </div>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
