"use client";
import { useEffect, useState } from "react";
import { buttonVariants } from "./ui";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Platform = "installed" | "prompt" | "ios" | "other";

/** Installing the console as an app is what makes order alerts dependable: installed apps keep their push subscription,
 *  show the unconfirmed-order count on the icon and, on iPhone and iPad, are the only way to receive Web Push at all.
 *  Chromium browsers offer a one-tap prompt; Safari needs the Share menu, so it gets short steps instead. */
export function InstallApp() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Browser-only facts: they cannot be read during server rendering without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(standalone ? "installed" : ios ? "ios" : "other");
    const before = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); setPlatform("prompt"); };
    const installed = () => { setPrompt(null); setPlatform("installed"); };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", before); window.removeEventListener("appinstalled", installed); };
  }, []);
  if (!platform) return null;
  return (
    <div className="grid gap-2 rounded-lg bg-fill p-3" aria-label="Install the app">
      <p><strong className="font-semibold text-ink">{platform === "installed" ? "Installed as an app" : "Install as an app"}</strong></p>
      {platform === "installed" ? <p>Order alerts and the unconfirmed-order badge work best from the installed app. Keep notifications turned on for this device below.</p> : null}
      {platform === "prompt" ? (
        <>
          <p>Install Al Mina Operations on this device so order alerts keep arriving when the browser is closed, and the icon shows how many orders are waiting.</p>
          <div><button type="button" className={buttonVariants({ variant: "default" })} onClick={async () => {
            try { await prompt?.prompt(); const choice = await prompt?.userChoice; setMessage(choice?.outcome === "accepted" ? "Installed." : "Not installed. You can install later from the browser menu."); } catch { setMessage("Install from the browser menu instead."); }
            setPrompt(null);
          }}>Install app</button></div>
        </>
      ) : null}
      {platform === "ios" ? <p>On iPhone or iPad, order alerts only work from the installed app. In Safari tap Share, then Add to Home Screen, open Al Mina from the Home Screen, and turn notifications on below.</p> : null}
      {platform === "other" ? <p>Install this page from your browser: the install icon in the address bar on desktop, or the menu, then Install app. On Android Chrome it is Add to Home screen or Install app. Then open the installed app and turn notifications on below.</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
