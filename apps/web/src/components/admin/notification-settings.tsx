"use client";
import { useEffect, useState } from 'react';
import { adminRequest } from './controls';
import { buttonVariants } from './ui';
import { InstallApp } from './install-app';

export function NotificationSettings({
  publicKey,
}: {
  publicKey?: string | undefined;
}) {
  const [message, setMessage] = useState("");
  const [feedback,setFeedback]=useState<'success'|'error'>('success');
  const [deviceSubscribed,setDeviceSubscribed]=useState(false);
  const [deviceConnected,setDeviceConnected]=useState(false);
  const [deviceChecked,setDeviceChecked]=useState(false);
  const [supported,setSupported]=useState(true);
  const [pending, setPending] = useState(false);
  const [serverKey,setServerKey]=useState(publicKey);
  const [configurationChecked,setConfigurationChecked]=useState(false);
  useEffect(()=>{
    let stopped=false;
    void (async()=>{
      try{
        const settings=await adminRequest('orders/notification-settings') as {enabled:boolean;publicKey:string|null;registeredDeviceIds:string[]};
        if(!stopped)setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
        const registration='serviceWorker' in navigator?await navigator.serviceWorker.getRegistration('/admin/'):undefined;
        const subscription=await registration?.pushManager.getSubscription();
        let connected=false;
        if(subscription){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subscription.endpoint));const fingerprint=[...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');connected=settings.registeredDeviceIds.includes(fingerprint);}
        if(stopped)return;
        setServerKey(settings.enabled?settings.publicKey??undefined:undefined);setConfigurationChecked(true);setDeviceSubscribed(!!subscription);setDeviceConnected(connected);setDeviceChecked(true);
      }catch{if(!stopped){setFeedback('error');setMessage('Could not check notification delivery. Reload before enabling notifications.');}}
    })();
    return()=>{stopped=true;};
  },[]);
  return (
    <div className="grid gap-3 [&_p]:m-0 [&_p]:text-[13px] [&_p]:leading-5 [&_p]:text-ink-2">
      {!supported?<p role="status">Push is not available in this browser. On iPhone or iPad, add this admin page to your Home Screen, open the installed app, then enable notifications.</p>:null}
      <InstallApp />
      <p role="status">{feedback==='error'&&!configurationChecked?'Device status unavailable.':!deviceChecked?'Checking this device…':deviceConnected?'This device is registered for this account.':deviceSubscribed?'This browser has a notification registration. Enable it to connect this account.':'Notifications are off on this device.'}</p>
      <div className="flex flex-wrap gap-2"><button
        className={buttonVariants({ variant: "outline" })}
        disabled={pending || !deviceChecked || !deviceSubscribed}
        onClick={async () => {
          setPending(true);setMessage('');
          try {
            const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/admin/") : undefined;
            const subscription=await registration?.pushManager.getSubscription();
            if(subscription){
              await adminRequest("orders/subscribe", "DELETE", {endpoint:subscription.endpoint});
              await subscription.unsubscribe();
            }
            setDeviceSubscribed(false);setDeviceConnected(false);setFeedback('success');
            setMessage("Notifications are off on this device. Other store devices are unchanged.");
          } catch {
            setFeedback('error');setMessage("Could not remove subscription. Retry.");
          } finally {
            setPending(false);
          }
        }}
      >
        Disable on this device
      </button>
      <button className={buttonVariants({ variant: "default" })}
        disabled={!supported || pending || !serverKey || !configurationChecked || (deviceConnected && deviceSubscribed)}
        onClick={async () => {
          setPending(true);setMessage('');
          try {
            if (!("serviceWorker" in navigator) || !("PushManager" in window))
              throw new Error(
                "This browser does not support push notifications.",
              );
            if ((await Notification.requestPermission()) !== "granted")
              throw new Error(
                "Allow notifications in your browser to enable push.",
              );
            const registration = await navigator.serviceWorker.register(
              "/admin/worker.js",
              { scope: "/admin/" },
            );
            await new Promise<void>((resolve, reject) => {
              if (registration.active) return resolve();
              const worker = registration.installing ?? registration.waiting;
              if (!worker)
                return reject(
                  new Error("Notification worker unavailable. Retry."),
                );
              const timer = setTimeout(() => {
                worker.removeEventListener("statechange", changed);
                reject(new Error("Notification setup timed out. Retry."));
              }, 15000);
              function changed() {
                if (
                  worker!.state === "activated" ||
                  worker!.state === "redundant"
                ) {
                  clearTimeout(timer);
                  worker!.removeEventListener("statechange", changed);
                  if (worker!.state === "activated") resolve();
                  else
                    reject(
                      new Error("Notification worker failed to start. Retry."),
                    );
                }
              }
              worker.addEventListener("statechange", changed);
              changed();
            });
            const bytes = Uint8Array.from(
              atob(serverKey!.replace(/-/g, "+").replace(/_/g, "/")),
              (c) => c.charCodeAt(0),
            );
            let subscription=await registration.pushManager.getSubscription();
            const priorKey=subscription?.options.applicationServerKey;
            if(subscription&&priorKey&&(priorKey.byteLength!==bytes.length||[...new Uint8Array(priorKey)].some((byte,index)=>byte!==bytes[index]))){await subscription.unsubscribe();subscription=null;}
            subscription??=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
            setDeviceSubscribed(true);
            await adminRequest("orders/subscribe", "POST", {
              subscription: subscription.toJSON(),
            });
            setDeviceConnected(true);setFeedback('success');
            setMessage("Notifications enabled on this device. Keep browser notifications allowed; up to five devices can be registered per account.");
          } catch (error) {
            setFeedback('error');setMessage(
              error instanceof Error
                ? error.message
                : "Could not enable notifications.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        Enable on this device
      </button></div>
      {configurationChecked&&!serverKey ? (
        <p>
          Background push is not configured on the order service. Ask an administrator to configure delivery; keep Orders open with sound enabled until then.
        </p>
      ) : null}
      {message?<p role={feedback==='error'?'alert':'status'} className={`rounded-lg px-4 py-3 text-[13px] font-medium ${feedback==='error'?'bg-bad-soft text-bad':'bg-ok-soft text-ok'}`}>{message}</p>:null}
    </div>
  );
}
