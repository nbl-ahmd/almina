"use client";
import { ProductAudienceFields, type ProductAudience } from "./product-audience";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { adminRequest } from "./controls";
import { whatsappRetryKey } from '../../lib/admin/whatsapp-retry';

export type FieldKind =
  | "text"
  | "number"
  | "password"
  | "date"
  | "url"
  | "email"
  | "search"
  | "textarea"
  | "select"
  | "segmented"
  | "toggle"
  | "tags"
  | "file"
  | "hidden";

export type Field = {
  name: string;
  label: string;
  type?: string;
  kind?: FieldKind;
  required?: boolean;
  value?: string | undefined;
  options?: { value: string; label: string }[];
  multiple?: boolean;
  min?: number | string;
  max?: number | string;
  step?: string;
  hint?: string;
  section?: string;
  sectionDescription?: string;
  advanced?: boolean;
  span?: "full" | "half";
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  rows?: number;
  accept?: string;
  disabled?: boolean;
};

function isBooleanOptions(field: Field) {
  if (!field.options || field.options.length !== 2) return false;
  const values = field.options.map((option) => option.value).sort();
  return values[0] === "false" && values[1] === "true";
}

function resolveKind(field: Field): FieldKind {
  if (field.kind) return field.kind;
  if (field.type === "hidden") return "hidden";
  if (field.type === "file") return "file";
  if (field.type === "textarea") return "textarea";
  if (field.options) return isBooleanOptions(field) ? "toggle" : "select";
  if (field.type === "password") return "password";
  if (field.type === "number") return "number";
  if (field.type === "date") return "date";
  if (field.type === "url") return "url";
  if (field.type === "email") return "email";
  if (field.type === "search") return "search";
  return "text";
}

function isWide(field: Field, kind: FieldKind) {
  if (field.span === "full") return true;
  if (field.span === "half") return false;
  return kind === "textarea" || kind === "file" || kind === "tags";
}

function FieldShell({
  id,
  label,
  hint,
  required,
  wide,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: string | undefined;
  required?: boolean | undefined;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`admin-field${wide ? " admin-field--wide" : ""}`}>
      <label htmlFor={id} className="admin-field__label">
        <span>
          {label}
          {required ? (
            <span className="admin-field__required" aria-hidden="true">
              {' '}· required
            </span>
          ) : null}
        </span>
      </label>
      {children}
      {hint ? (
        <p className="admin-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ToggleField({
  id,
  field,
}: {
  id: string;
  field: Field;
}) {
  const [on, setOn] = useState(field.value === "true");
  return (
    <div className="admin-field admin-field--half">
      <input type="hidden" name={field.name} value={on ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={field.label}
        className="admin-switch"
        onClick={() => setOn((value) => !value)}
      >
        <span className="admin-switch__text">
          <strong>{field.label}</strong>
          {field.hint ? <span>{field.hint}</span> : null}
        </span>
        <span className="admin-switch__track" aria-hidden="true" />
      </button>
      {!field.hint ? null : <span className="sr-only" id={`${id}-hint`}>{field.hint}</span>}
    </div>
  );
}

function SegmentedField({
  id,
  field,
  kind,
}: {
  id: string;
  field: Field;
  kind: FieldKind;
}) {
  const options = field.options ?? [];
  return (
    <fieldset className={`admin-field${isWide(field, kind) ? " admin-field--wide" : ""}`}>
      <legend className="admin-field__label">
        {field.label}
        {field.required ? (
          <span className="admin-field__required" aria-hidden="true">
            {' '}· required
          </span>
        ) : null}
      </legend>
      <div className="admin-choice">
        {options.map((option) => {
          const optionId = `${id}-${option.value || "none"}`;
          return (
            <label key={option.value} htmlFor={optionId}>
              <input
                id={optionId}
                type="radio"
                name={field.name}
                value={option.value}
                defaultChecked={field.value === option.value}
                required={field.required}
                disabled={field.disabled}
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {field.hint ? (
        <p className="admin-field__hint" id={`${id}-hint`}>
          {field.hint}
        </p>
      ) : null}
    </fieldset>
  );
}

function TagsField({ id, field }: { id: string; field: Field }) {
  const [value, setValue] = useState(field.value && field.value !== "—" ? field.value : "");
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const update = (next: string[]) => setValue(next.join(", "));
  return (
    <div className="admin-field admin-field--wide">
      <label htmlFor={id} className="admin-field__label">
        {field.label}
        {field.required ? (
          <span className="admin-field__required" aria-hidden="true">
            {' '}· required
          </span>
        ) : null}
      </label>
      <div className="admin-tags">
        {tags.length ? (
          <span className="admin-tags__chips">
            {tags.map((tag) => (
              <span className="admin-tag" key={tag}>
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => update(tags.filter((value) => value !== tag))}
                >
                  ×
                </button>
              </span>
            ))}
          </span>
        ) : null}
        <input
          id={id}
          name={field.name}
          value={value}
          maxLength={500}
          placeholder={field.placeholder}
          aria-label={field.label}
          aria-describedby={field.hint ? `${id}-hint` : undefined}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => update(tags)}
        />
      </div>
      {field.hint ? (
        <p className="admin-field__hint" id={`${id}-hint`}>
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}

function FileField({ id, field }: { id: string; field: Field }) {
  return (
    <label htmlFor={id} className="admin-dropzone admin-field--wide">
      <span className="admin-dropzone__icon" aria-hidden="true">
        <CloudArrowUpIcon />
      </span>
      <span className="admin-dropzone__text">
        <strong>{field.label}</strong>
        <span>{field.hint ?? "PNG, JPG, WebP or CSV · up to 3 MB"}</span>
      </span>
      <input
        id={id}
        name={field.name}
        type="file"
        multiple={field.multiple}
        required={field.required}
        disabled={field.disabled}
        aria-label={field.label}
        accept={field.accept ?? (field.name === "file" ? ".csv,text/csv" : "image/jpeg,image/png,image/webp,image/avif")}
      />
    </label>
  );
}

function renderField(field: Field) {
  const id = `${field.name}-${Math.abs(hash(field.name + (field.label ?? "")))}`;
  const kind = resolveKind(field);
  if (kind === "hidden") {
    return <input key={field.name} type="hidden" name={field.name} defaultValue={field.value} />;
  }
  if (kind === "toggle") {
    return <ToggleField key={field.name} id={id} field={field} />;
  }
  if (kind === "segmented") {
    return <SegmentedField key={field.name} id={id} field={field} kind={kind} />;
  }
  if (kind === "tags") {
    return <TagsField key={field.name} id={id} field={field} />;
  }
  if (kind === "file") {
    return <FileField key={field.name} id={id} field={field} />;
  }

  const describedBy = field.hint ? `${id}-hint` : undefined;
  const common = {
    id,
    name: field.name,
    required: field.required,
    disabled: field.disabled,
    "aria-label": field.label,
    "aria-describedby": describedBy,
  };
  let control: ReactNode;
  if (kind === "select") {
    control = (
      <select {...common} defaultValue={field.value}>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (kind === "textarea") {
    control = (
      <textarea
        {...common}
        defaultValue={field.value}
        rows={field.rows ?? 4}
        maxLength={4000}
        placeholder={field.placeholder}
      />
    );
  } else if (field.prefix || field.suffix) {
    control = (
      <div className="admin-input-shell">
        {field.prefix ? (
          <span className="admin-input-shell__affix admin-input-shell__affix--prefix">{field.prefix}</span>
        ) : null}
        <input
          {...common}
          type={kind}
          defaultValue={field.value}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          maxLength={kind === "password" ? 72 : 500}
          autoComplete={kind === "password" ? "new-password" : undefined}
        />
        {field.suffix ? (
          <span className="admin-input-shell__affix">{field.suffix}</span>
        ) : null}
      </div>
    );
  } else {
    control = (
      <input
        {...common}
        type={kind}
        defaultValue={field.value}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        maxLength={kind === "password" ? 72 : 500}
        autoComplete={kind === "password" ? "new-password" : undefined}
      />
    );
  }
  return (
    <FieldShell
      key={field.name}
      id={id}
      label={field.label}
      hint={field.hint}
      required={field.required}
      wide={isWide(field, kind)}
    >
      {control}
    </FieldShell>
  );
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return result;
}

type Section = {
  title: string;
  description?: string;
  advanced: boolean;
  fields: Field[];
};

function groups(fields: Field[]): Section[] {
  const sections: Section[] = [];
  for (const field of fields) {
    if (resolveKind(field) === "hidden") continue;
    const title = field.section ?? "";
    const advanced = field.advanced === true;
    // Only the first field of a section carries its description; matching on it
    // as well would split one section into duplicates when the rest omit it.
    const existing = sections.find(
      (section) => section.title === title && section.advanced === advanced,
    );
    if (existing) {
      if (!existing.description && field.sectionDescription)
        existing.description = field.sectionDescription;
      existing.fields.push(field);
    } else
      sections.push({
        title,
        ...(field.sectionDescription ? { description: field.sectionDescription } : {}),
        advanced,
        fields: [field],
      });
  }
  return sections;
}

export function AdminForm({
  path,
  method = "POST",
  fields,
  label = "Save",
  multipart = false,
  confirm,
  productAudience,
  footerNote,
}: {
  path: string;
  method?: string;
  fields: Field[];
  label?: string;
  multipart?: boolean;
  confirm?: string;
  productAudience?: ProductAudience;
  footerNote?: ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(0);
  const sections = groups(fields);
  const singleOpenSection = sections.length === 1 && !sections[0]!.title;
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
      if (method === "POST" && path === "products" && result && typeof result === 'object' && 'product' in result) {
        const created = result.product as { _id?: unknown };
        if (typeof created?._id === 'string' && /^[a-f0-9]{24}$/i.test(created._id)) {
          router.push(`/admin/products/${created._id}`); router.refresh(); return;
        }
      }
      if (method === "POST") {
        form.reset();
        setVersion((value) => value + 1);
      }
      router.refresh();
    } catch (error) {
      setError(['whatsapp/text', 'whatsapp/s'].includes(path) ? 'Send failed or uncertain. Review delivery reports; identical input in this tab reuses the recovery receipt.' : error instanceof Error ? error.message : "Request failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="admin-form" onSubmit={submit} aria-busy={pending}>
      {/* Hidden fields carry the inventory receipt and expected stock, so they must
          stay submitted even though they are not rendered inside a section. */}
      {fields.map((field) => (resolveKind(field) === "hidden" ? renderField(field) : null))}
      {productAudience ? (
        <div className="admin-form__section" key={`audience-${version}`}>
          <ProductAudienceFields initial={productAudience} />
        </div>
      ) : null}
      <div key={version} className="admin-form__sections">
        {sections.map((section, index) => {
          const content = <div className="admin-form__grid">{section.fields.map(renderField)}</div>;
          if (section.advanced) {
            return (
              <details className="admin-form__section" key={`${section.title}-${index}`}>
                <summary>{section.title || "More options"}</summary>
                {section.description ? <p className="admin-card__hint">{section.description}</p> : null}
                {content}
              </details>
            );
          }
          if (singleOpenSection) {
            return <div className="admin-form__section" key={`${section.title}-${index}`}>{content}</div>;
          }
          return (
            <section className="admin-form__section" key={`${section.title}-${index}`}>
              <div className="admin-form__heading">
                <div>
                  <h2>{section.title || "Details"}</h2>
                  {section.description ? <p>{section.description}</p> : null}
                </div>
              </div>
              {content}
            </section>
          );
        })}
      </div>
      <div className="admin-form__footer">
        <div className="admin-form__status">
          {error ? <p role="alert" className="admin-alert admin-alert--danger">{error}</p> : null}
          {message ? <p role="status" className="admin-alert admin-alert--success">{message}</p> : null}
          {!error && !message && footerNote ? <p className="admin-card__hint admin-hint--tight">{footerNote}</p> : null}
        </div>
        <button disabled={pending}>{pending ? "Saving…" : label}</button>
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
        className="admin-btn--secondary"
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
    <form className="admin-card admin-form" onSubmit={send}>
      <div className="admin-card__head">
        <div>
          <h2>Broadcast template</h2>
          <p className="admin-card__hint">Send one approved template to a reviewed recipient list. Delivery requires a provider report.</p>
        </div>
      </div>
      <div className="admin-form__section">
        <div className="admin-form__grid">
          <label className="admin-dropzone admin-field--wide" htmlFor="recipient-csv">
            <span className="admin-dropzone__icon" aria-hidden="true">
              <CloudArrowUpIcon />
            </span>
            <span className="admin-dropzone__text">
              <strong>Recipient CSV</strong>
              <span>First column · up to 25 numbers · 256 KB</span>
            </span>
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
            <p className="admin-card__hint">
              Imported {csvNumbers.length} recipient numbers. Review the CSV and
              promotion permissions before sending.
            </p>
          ) : null}
        </div>
      </div>
      <fieldset disabled={pending}>
        <legend>Recipients</legend>
        <div className="admin-checklist">
          {recipients.map((item) => {
            const eligible =
              item.promotionStatus !== "Stop promotions" &&
              item.promotionStatus !== "false";
            return (
              <label key={item.from}>
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
        </div>
      </fieldset>
      <div className="admin-form-panel">
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
