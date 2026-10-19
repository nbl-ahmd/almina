"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminRequest } from "./controls";
import { whatsappRetryKey } from '../../lib/admin/whatsapp-retry';
import { adminFormClass } from '../../lib/admin/styles';
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string | undefined;
  options?: { value: string; label: string }[];
  multiple?: boolean;
  min?: number;
  step?: string;
  hint?: string;
};
export function AdminForm({
  path,
  method = "POST",
  fields,
  label = "Save",
  multipart = false,
  confirm,
}: {
  path: string;
  method?: string;
  fields: Field[];
  label?: string;
  multipart?: boolean;
  confirm?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError("");
    setMessage("");
    // Empty optional file parts must not masquerade as selected uploads.
    for (const [name, value] of data)
      if (value instanceof File && !value.size) data.delete(name);
    if (data.get("salePrice") === "") data.delete("salePrice");
    const json: Record<string, unknown> = Object.fromEntries(data);
    if ("billamount" in json) json.billamount = Number(json.billamount);
    if ("cities" in json)
      json.cities = String(json.cities)
        .split(",")
        .map((city) => city.trim())
        .filter(Boolean);
    try {
      const isWhatsapp = ['whatsapp/text', 'whatsapp/s'].includes(path);
      const key = isWhatsapp ? await whatsappRetryKey(path, json) : undefined;
      const result = await adminRequest(path, method, multipart ? data : json, key);
      setMessage(
        result && typeof result === "object" && "count" in result
          ? `Saved ${String(result.count)} products.`
          : isWhatsapp ? 'Accepted by provider. Delivery requires a delivery report.' : "Saved successfully.",
      );
      if (method === "POST") form.reset();
      router.refresh();
    } catch (error) {
      setError(['whatsapp/text', 'whatsapp/s'].includes(path) ? 'Send failed or uncertain. Review delivery reports; identical input in this tab reuses the recovery receipt.' : error instanceof Error ? error.message : "Request failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form className={adminFormClass} onSubmit={submit} aria-busy={pending}>
      {fields.map((field) => {
        const id = `${path.replace(/[^a-z0-9]/gi, "-")}-${field.name}`;
        const props = {
          id,
          name: field.name,
          required: field.required,
          defaultValue: field.type === "file" ? undefined : field.value,
          "aria-describedby": field.hint ? `${id}-hint` : undefined,
        };
        if (field.type === "hidden") return <input key={field.name} {...props} type="hidden" />;
        return (
          <label key={field.name} htmlFor={id}>
            {field.label}
            {field.options ? (
              <select {...props}>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea {...props} maxLength={4000} />
            ) : (
              <input
                {...props}
                type={field.type ?? "text"}
                multiple={field.multiple}
                min={field.min}
                step={field.step}
                maxLength={field.type === "password" ? 72 : 500}
                autoComplete={
                  field.type === "password" ? "new-password" : undefined
                }
                accept={
                  field.type === "file"
                    ? field.name === "file"
                      ? ".csv,text/csv"
                      : "image/jpeg,image/png,image/webp,image/avif"
                    : undefined
                }
              />
            )}
            {field.hint ? <small id={`${id}-hint`}>{field.hint}</small> : null}
          </label>
        );
      })}
      <div className="admin-actions">
        <button disabled={pending}>{pending ? "Saving…" : label}</button>
        {error ? <p role="alert" className="admin-alert admin-alert--danger">{error}</p> : null}
        {message ? <p role="status" className="admin-alert admin-alert--success">{message}</p> : null}
      </div>
    </form>
  );
}
export function NotificationSettings({
  publicKey,
}: {
  publicKey?: string | undefined;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="admin-actions">
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await adminRequest("orders/subscribe", "DELETE");
            if ("serviceWorker" in navigator) {
              const registration =
                await navigator.serviceWorker.getRegistration("/admin/");
              await (
                await registration?.pushManager.getSubscription()
              )?.unsubscribe();
            }
            setMessage("Push subscription removed.");
          } catch {
            setMessage("Could not remove subscription. Retry.");
          } finally {
            setPending(false);
          }
        }}
      >
        Disable push notifications
      </button>
      <button
        disabled={pending || !publicKey}
        onClick={async () => {
          setPending(true);
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
              atob(publicKey!.replace(/-/g, "+").replace(/_/g, "/")),
              (c) => c.charCodeAt(0),
            );
            const subscription =
              (await registration.pushManager.getSubscription()) ??
              (await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: bytes,
              }));
            await adminRequest("orders/subscribe", "POST", {
              subscription: subscription.toJSON(),
            });
            setMessage("Push notifications enabled.");
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Could not enable notifications.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        Enable push notifications
      </button>
      {!publicKey ? (
        <p>
          Push delivery is not configured. Order updates remain active while
          administration is open.
        </p>
      ) : null}
      <p role="status" className="admin-alert admin-alert--success">{message}</p>
    </div>
  );
}
export function BulkTemplates({
  recipients,
}: {
  recipients: { from: string; name: string; promotionStatus: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [csvNumbers, setCsvNumbers] = useState<string[]>([]);
  const [csvError, setCsvError] = useState("");
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !window.confirm(
        `Send this approved template to ${selected.length} selected recipients?`,
      )
    )
      return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setResults([]);
    for (const recipient of selected) {
      try {
        const payload = {
          recipient,
          template: data.get("template"),
          link: data.get("link"),
        };
        await adminRequest("whatsapp/s", "POST", payload, await whatsappRetryKey('whatsapp/s', payload));
        setResults((previous) => [
          ...previous,
          `${recipient}: accepted by provider`,
        ]);
      } catch {
        setResults((previous) => [
          ...previous,
          `${recipient}: failed or uncertain; check delivery reports before retrying`,
        ]);
      }
    }
    setPending(false);
  }
  return (
    <form className="admin-panel" onSubmit={send}>
      <h2>Broadcast template</h2>
      <label htmlFor="recipient-csv">
        Recipient CSV (first column)
        <input
          id="recipient-csv"
          type="file"
          accept=".csv,text/csv"
          disabled={pending}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 256000) {
              setCsvError("CSV must be smaller than 256 KB.");
              return;
            }
            const numbers = [
              ...new Set(
                (await file.text())
                  .split(/\r?\n/)
                  .filter((line) => line.trim())
                  .map((line) =>
                    line.split(",")[0]!.trim().replace(/^"|"$/g, ""),
                  ),
              ),
            ];
            if (
              numbers.length > 25 ||
              numbers.some((value) => !/^\+?[0-9]{1,20}$/.test(value))
            ) {
              setCsvError(
                "Use up to 25 recipient numbers in the first column, without a header.",
              );
              return;
            }
            setCsvNumbers(numbers);
            setSelected(numbers);
            setCsvError("");
          }}
        />
      </label>
      {csvError ? <p role="alert" className="admin-alert admin-alert--danger">{csvError}</p> : null}
      {csvNumbers.length ? (
        <p>
          Imported {csvNumbers.length} recipient numbers. Review the CSV and
          promotion permissions before sending.
        </p>
      ) : null}
      <p>
        Select recipients on this page. Identical sends in this tab reuse their
        recovery receipt, including after reload. Review delivery reports before
        starting another campaign or closing this tab after an uncertain send.
      </p>
      <fieldset disabled={pending}>
        <legend>Recipients</legend>
        {recipients.map((item) => {
          const eligible =
            item.promotionStatus !== "Stop promotions" &&
            item.promotionStatus !== "false";
          return (
            <label key={item.from} className="admin-actions">
              <input
                type="checkbox"
                disabled={!eligible}
                checked={selected.includes(item.from)}
                onChange={(event) =>
                  setSelected((previous) =>
                    event.target.checked
                      ? [...previous, item.from]
                      : previous.filter((value) => value !== item.from),
                  )
                }
              />
              {item.name} ({item.from})
              {!eligible ? " · Promotions disabled" : ""}
            </label>
          );
        })}
      </fieldset>
      <div className={adminFormClass}>
        <label htmlFor="bulk-template">
          Template name
          <input id="bulk-template" name="template" required />
        </label>
        <label htmlFor="bulk-link">
          Image URL
          <input id="bulk-link" name="link" type="url" required />
        </label>
        <button disabled={pending || !selected.length}>
          {pending ? "Sending…" : `Send to ${selected.length} recipients`}
        </button>
      </div>
      <div role="status">
        {results.map((value) => (
          <p key={value}>{value}</p>
        ))}
      </div>
    </form>
  );
}
