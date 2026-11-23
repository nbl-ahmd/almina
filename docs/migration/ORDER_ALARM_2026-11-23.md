# New-order alarm and push (2026-11-23)

## Behaviour
- **App closed or screen off (Android, Windows):** the normal Web Push notification, with the device's own notification sound,
  the "N orders to confirm" text, the icon badge and an "Open orders" action. Web push cannot set a custom or long sound.
- **App open (page visible, or alive in the background):** a loud, looping "telephone" ring until staff press **Silence**, every
  waiting order is confirmed (on any device), or 5 minutes pass. It needs no polling: the server pushes the news (the live
  order stream, or a push message reaching the page) and the ring is a local audio loop with no network.
- **Arming:** browsers only allow sound after a tap, so the alarm is turned on once per page load (button in the order strip and
  in Notifications). The choice is remembered; after a reload the strip shows "Tap to arm alarm" and any first tap or key press
  unlocks it. Until armed, a new order only produces the notification and its system sound.
- **No double sound:** the service worker keeps the system notification silent only when a visible page has told it the alarm is
  armed; in every other case the notification sounds normally.
- **Keep screen awake** (optional, Notifications page): holds a screen wake lock while the alarm is armed, for a shop tablet.
- Ordinary alerts (stock, payments) play a short two-beep chime instead of the ring.

## How a ring starts
The order strip reads the receiving counts when the live stream says orders changed (and once when a push message reaches the page,
even in the background). If more orders are waiting than at the previous read, it calls `alarm.ring()`. Zero waiting orders silences it.
Sound is scheduled on the audio clock about 12 s ahead and refilled every 6 s, so a throttled background timer cannot stutter it.

## Also in this change
- `pushsubscriptionchange` handling in the service worker: when the browser replaces a device's push subscription, the worker
  registers the new one with the API so alerts keep arriving.
- `pageshow` and `focus` reopen the stream when an installed app returns from the background.

## Limits
- A hidden page can only ring if it was armed earlier and the browser keeps it alive; many phones freeze background tabs, and
  then the system notification is what rings.
- iPhone and iPad are not targeted here: Web Push there needs the installed Home Screen app and Apple decides timing.
- Not verified on real devices; verify with Notifications -> Test alarm on each station, then send a test notification with the
  app closed.
