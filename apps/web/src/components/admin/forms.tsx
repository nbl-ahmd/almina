"use client";
import { buttonVariants, inputClass, selectClass, textareaClass } from './shadcn/styles';
import { ProductAudienceFields, type ProductAudience } from "./product-audience";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { SwitchRow } from "./kit";
import { OfferField } from "./offer-field";
import { PendingPhotosContext } from "./photo-context";
import { uploadProductPhotos } from "./direct-upload";
import { Combobox, type ComboOption } from "./shadcn/combobox";
import { createCategory, loadBrands, rememberBrand } from "../../lib/admin/catalogue-options";
import { ProductChannels, WholesalePrices, useProductTrade, productTradeTerms, type TradeTerms } from './product-pricing';
import { wholesaleRequest } from '../wholesale/request';
import { useRouter } from "next/navigation";
import Link from '../app-link';
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { adminRequest } from "./controls";
import { useConfirm } from "./confirm-dialog";
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
  | "combobox"
  | "offer"
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
  /** Combobox: "brand" or "category" lets the admin add a missing value from the dropdown. */
  creatable?: "brand" | "category";
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
    <div className={`grid min-w-0 content-start gap-1.5${wide ? " sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        <span>
          {label}
          {required ? (
            <span className="font-normal text-mute" aria-hidden="true">
              {' '}· required
            </span>
          ) : null}
        </span>
      </label>
      {children}
      {hint ? (
        <p className="m-0 text-xs text-mute" id={`${id}-hint`}>
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
    <div className="grid min-w-0 content-start gap-1.5">
      <input type="hidden" name={field.name} value={on ? "true" : "false"} />
      <SwitchRow checked={on} onCheckedChange={setOn} title={field.label} hint={field.hint} ariaLabel={field.label} />
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
    <fieldset className={`m-0 grid min-w-0 content-start gap-1.5 border-0 p-0${isWide(field, kind) ? " sm:col-span-2" : ""}`}>
      <legend className="text-[13px] font-medium text-ink">
        {field.label}
        {field.required ? (
          <span className="font-normal text-mute" aria-hidden="true">
            {' '}· required
          </span>
        ) : null}
      </legend>
      <div className="flex flex-wrap gap-2 [&_label]:inline-flex [&_label]:cursor-pointer [&_label]:items-center [&_label]:gap-2 [&_label]:rounded-lg [&_label]:bg-fill [&_label]:px-4 [&_label]:py-2.5 [&_label]:text-[13px] [&_label:has(:checked)]:bg-fill">
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
        <p className="m-0 text-xs text-mute" id={`${id}-hint`}>
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
    <div className="grid min-w-0 content-start gap-1.5 sm:col-span-2">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {field.label}
        {field.required ? (
          <span className="font-normal text-mute" aria-hidden="true">
            {' '}· required
          </span>
        ) : null}
      </label>
      <div className="grid gap-2">
        {tags.length ? (
          <span className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span className="inline-flex items-center gap-1 rounded-lg bg-fill px-3 py-1 text-xs font-medium" key={tag}>
                {tag}
                <button className={buttonVariants({ variant: "default" })}
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
        <input className={inputClass}
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
        <p className="m-0 text-xs text-mute" id={`${id}-hint`}>
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}

function FileField({ id, field }: { id: string; field: Field }) {
  return (
    <label htmlFor={id} className="flex min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border-2 border-dashed border-line-strong bg-soft p-4 hover:bg-fill sm:col-span-2">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-fill [&>svg]:size-5" aria-hidden="true">
        <CloudArrowUpIcon />
      </span>
      <span className="grid min-w-0 text-[13px] [&>strong]:font-semibold [&>span]:text-xs [&>span]:text-mute">
        <strong>{field.label}</strong>
        <span>{field.hint ?? "PNG, JPG, WebP or CSV · up to 3 MB"}</span>
      </span>
      <input
        id={id}
        name={field.name}
        type="file" className="ml-auto min-w-0 max-w-[45%] text-xs text-mute"
        multiple={field.multiple}
        required={field.required}
        disabled={field.disabled}
        aria-label={field.label}
        accept={field.accept ?? (field.name === "file" ? ".csv,text/csv" : "image/jpeg,image/png,image/webp,image/avif")}
      />
    </label>
  );
}

function ComboField({ id, field }: { id: string; field: Field }) {
  const [value, setValue] = useState(field.value ?? '');
  const [brands, setBrands] = useState<string[] | null>(null);
  const [added, setAdded] = useState<ComboOption[]>([]);
  useEffect(() => { if (field.creatable === 'brand') void loadBrands().then(setBrands).catch(() => setBrands([])); }, [field.creatable]);
  const base: ComboOption[] = field.creatable === 'brand' ? (brands ?? []).map(brand => ({ value: brand, label: brand })) : (field.options ?? []).filter(option => option.value);
  const options = [...base, ...added.filter(item => !base.some(option => option.value === item.value))];
  if (value && !options.some(option => option.value === value)) options.push({ value, label: value });
  return (
    <FieldShell id={id} label={field.label} hint={field.hint} required={field.required} wide={isWide(field, 'combobox')}>
      <Combobox id={id} name={field.name} value={value} options={options} onValueChange={setValue} {...(field.required ? { required: true } : {})}
        placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`} searchPlaceholder={`Search ${field.label.toLowerCase()}`}
        loading={field.creatable === 'brand' && brands === null} createNoun={field.creatable ?? 'item'}
        {...(field.creatable ? { onCreate: async (label: string) => {
          const created = field.creatable === 'brand' ? (rememberBrand(label), { value: label, label }) : await createCategory(label);
          setAdded(list => [...list, created]); return created;
        } } : {})} />
    </FieldShell>
  );
}

function renderField(field: Field) {
  if (field.kind === "offer") return <OfferField key={field.name} name={field.name} label={field.label} initial={field.value} />;
  if (field.kind === "combobox") return <ComboField key={field.name} id={`field-${field.name}`} field={field} />;
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
      <select className={selectClass} {...common} defaultValue={field.value}>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (kind === "textarea") {
    control = (
      <textarea className={textareaClass}
        {...common}
        defaultValue={field.value}
        rows={field.rows ?? 4}
        maxLength={4000}
        placeholder={field.placeholder}
      />
    );
  } else if (field.prefix || field.suffix) {
    control = (
      <div className="flex items-center overflow-hidden rounded-lg border border-line-strong bg-surface focus-within:ring-2 focus-within:ring-ink/80 [&_input]:rounded-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:ring-0 [&_input]:focus-visible:ring-0">
        {field.prefix ? (
          <span className="shrink-0 whitespace-nowrap pl-3.5 text-[13px] text-mute">{field.prefix}</span>
        ) : null}
        <input className={inputClass}
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
          <span className="shrink-0 whitespace-nowrap pr-3.5 text-[13px] text-mute">{field.suffix}</span>
        ) : null}
      </div>
    );
  } else {
    control = (
      <input className={inputClass}
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
  productMedia,
  productChecks,
  publishDefault = true,
  productLive,
  nextHref,
}: {
  path: string;
  method?: string;
  fields: Field[];
  label?: string;
  multipart?: boolean;
  confirm?: string;
  productAudience?: ProductAudience;
  footerNote?: ReactNode;
  productMedia?: ReactNode;
  productChecks?: ReactNode;
  /** Initial storefront visibility. Saving always publishes by default. */
  publishDefault?: boolean;
  /** Whether the saved record is currently live. Defaults to publishDefault. */
  productLive?: boolean;
  /** Product editor: where "Save & next" goes, for working through many products quickly. */
  nextHref?: string;
}) {
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (message) toast.success(message); }, [message]);
  useEffect(() => {
    if (!path.startsWith('products')) return;
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); formRef.current?.requestSubmit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [path]);
  const [version, setVersion] = useState(0);
  const productEditor = path === 'products' || path.startsWith('products/');
  const productId = productEditor && path !== 'products' ? path.split('/')[1] : undefined;
  const pricing = useProductTrade(productId, productAudience);
  const formRef = useRef<HTMLFormElement>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const saveMode = useRef<'save' | 'next' | 'another'>('save');
  const [stockChanged, setStockChanged] = useState(false);
  const [published, setPublished] = useState(publishDefault);
  const [partialSave, setPartialSave] = useState<{ terms: TradeTerms; created: boolean } | null>(null);
  const sections = groups(fields);
  if (productEditor) sections.sort((a, b) => Number(a.advanced) - Number(b.advanced));
  const singleOpenSection = sections.length === 1 && !sections[0]!.title;
  const liveAtLoad = productLive ?? publishDefault;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (confirm && !(await ask(confirm, { action: label ?? 'Save' }))) return;
    if (partialSave) return;
    let terms: TradeTerms | undefined;
    if (productAudience) {
      try { terms = productTradeTerms(pricing.trade, productId ?? '000000000000000000000000'); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Check channel prices.'); return; }
    }
    const data = new FormData(form);
    setPending(true);
    setError("");
    setMessage("");
    // Empty optional file parts must not masquerade as selected uploads.
    for (const [name, value] of data)
      if (value instanceof File && !value.size) data.delete(name);
    if (data.get("salePrice") === "") data.delete("salePrice");
    if (productEditor && !pricing.trade.retail) {
      for (const name of ['price', 'salePrice']) {
        const saved = fields.find(field => field.name === name)?.value;
        if (saved) data.set(name, saved);
        else if (name === 'price') data.set(name, '0');
      }
    }
    let publish = published;
    let downgraded = '';
    if (productEditor) {
      // The sale price is the source of truth; the store derives "on sale" from it.
      data.set('sale', data.get('salePrice') ? 'true' : 'false');
      if (!data.get('productType')) data.set('productType', 'general');
      const brand = String(data.get('brand') ?? '').trim();
      const category = String(data.get('category') ?? '').trim();
      const required = [!String(data.get('name') ?? '').trim() ? 'name' : '', !brand ? 'brand' : '', !category ? 'category' : '', data.get('price') === '' ? 'price' : '', data.get('stock') === '' ? 'stock' : ''].filter(Boolean);
      if (required.length && pricing.trade.retail) {
        setPending(false);
        setError(`Add ${required.join(', ')} to save.`);
        return;
      }
      if (publish) {
        // The server never publishes prescription items: save a draft instead of failing.
        if (data.get('productType') === 'prescription') { publish = false; downgraded = 'Prescription products cannot be sold online, so this was saved as a draft.'; }
      }
      if (publish) {
        data.set('contentReviewed', 'true');
        data.set('stockVerified', 'true');
        if (!data.get('saleUnit')) data.set('saleUnit', 'Each');
        // Adding photos is the admin's confirmation that they may be used.
        if (!data.get('imageRights')) data.set('imageRights', 'authorized');
      }
    }
    if (productEditor && (data.get('stockReason') === '' || !stockChanged)) data.delete('stockReason');
    const json: Record<string, unknown> = Object.fromEntries(data);
    if ("branchId" in json && json.branchId === "") json.branchId = null;
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
      let savedProductId = productId;
      if (path === 'products' && result && typeof result === 'object' && 'product' in result) {
        const created = result.product as { _id?: unknown };
        if (typeof created._id === 'string') savedProductId = created._id;
      }
      if (terms && savedProductId && pricing.trade.dirty) {
        const requested = { ...terms, productId: savedProductId };
        try { pricing.saved((await wholesaleRequest<TradeTerms>('admin/terms', requested)).data); }
        catch {
          setPartialSave({ terms: requested, created: path === 'products' });
          setError('Product details saved. Wholesale pricing was not confirmed. Retry only wholesale pricing below; product and stock changes will not be repeated.');
          return;
        }
      }
      setStockChanged(false);
      if (productEditor) {
        if (!savedProductId) throw new Error('Product saved, but its identifier was not returned. Reload Products to continue.');
        if (publish !== liveAtLoad) await adminRequest(`products/publish/${savedProductId}`, 'PUT', {});
        if (path === 'products' && photoFiles.length) {
          try {
            await uploadProductPhotos(savedProductId, photoFiles, { uploadKey: crypto.randomUUID(), expectedMediaRevision: 0 });
          } catch (failure) { toast.error(`Product saved, but photos were not added: ${failure instanceof Error ? failure.message : 'upload failed'} Add them on the product page.`); }
        }
        const mode = saveMode.current;
        saveMode.current = 'save';
        const state = publish ? 'published' : 'draft';
        toast.success(downgraded || (publish ? 'Saved and live' : 'Saved as draft'));
        if (mode === 'next' && nextHref) router.push(nextHref);
        else if (mode === 'another') router.push('/admin/products/new');
        else if (path === 'products') router.push(`/admin/products/${savedProductId}`);
        else { setPublished(publish); router.refresh(); setVersion(value => value + 1); setStockChanged(false); }
        void state;
        return;
      }
      setMessage(
        result && typeof result === "object" && "count" in result
          ? `Saved ${String(result.count)} products.`
          : isWhatsapp ? 'Accepted by provider. Delivery requires a delivery report.' : "Saved successfully.",
      );
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
  const saveControls = (
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 border border-line shadow-pop md:bottom-3">
        <div className="min-w-0 flex-1 text-[13px] max-sm:[&>p:not([role=alert])]:hidden">
          {error ? <p role="alert" className="m-0 rounded-lg bg-bad-soft px-3 py-2 text-[13px] font-medium text-bad">{error}</p> : null}
          {!error && !message && footerNote ? <p className="m-0 text-xs text-mute">{footerNote}</p> : null}
          {!error && !message && productEditor ? <p className="m-0 text-xs text-mute">{published ? 'Saving publishes this product to the storefront.' : 'Saving keeps this product hidden from customers.'}</p> : null}
        </div>
        {productEditor ? <SwitchRow className="border-0 px-0 py-0 max-sm:[&_span_span]:hidden sm:w-auto sm:min-w-56" checked={published} disabled={pending} onCheckedChange={setPublished} title={published ? 'Published' : 'Draft'} hint={published ? 'Visible in the storefront' : 'Hidden from customers'} /> : null}
        {partialSave ? <button className={buttonVariants({ variant: "default" })} type="button" disabled={pending} onClick={async () => {
          setPending(true);
          try {
            // A lost response may have committed. Read back before replaying a revision-sensitive write.
            const current = (await wholesaleRequest<TradeTerms>('admin/terms?' + new URLSearchParams({ productId: partialSave.terms.productId }))).data;
            const same = current.enabled === partialSave.terms.enabled && JSON.stringify(current.prices) === JSON.stringify(partialSave.terms.prices);
            if (!same && current.revision !== partialSave.terms.revision) throw Error('Wholesale pricing changed elsewhere. Open the product again to review the current rates.');
            pricing.saved(same ? current : (await wholesaleRequest<TradeTerms>('admin/terms', partialSave.terms)).data);
            setPartialSave(null); setError(''); setMessage('Product and channel prices saved.');
            if (published !== liveAtLoad) await adminRequest(`products/publish/${partialSave.terms.productId}`, 'PUT', {});
            router.push(`/admin/products?saved=${published ? 'published' : 'draft'}`);
            router.refresh();
          } catch (failure) { setError(failure instanceof Error ? failure.message : 'Wholesale pricing could not be saved.'); }
          finally { setPending(false); }
        }}>{pending ? 'Retrying…' : 'Retry wholesale pricing'}</button> : <>
          {productEditor && nextHref ? <button type="submit" onClick={() => { saveMode.current = 'next'; }} className={buttonVariants({ variant: "outline" })} disabled={pending || !pricing.trade.ready}>Save & next</button> : null}
          {productEditor && path === 'products' ? <button type="submit" onClick={() => { saveMode.current = 'another'; }} className={buttonVariants({ variant: "outline" })} disabled={pending || !pricing.trade.ready}>Save & add another</button> : null}
          <button type="submit" onClick={() => { saveMode.current = 'save'; }} className={buttonVariants({ variant: "default" })} disabled={pending || (productEditor && !pricing.trade.ready)}>{pending ? "Saving…" : productEditor ? (published ? 'Save & publish' : 'Save draft') : label}</button>
        </>}
        {partialSave ? <Link href={`/admin/products/${partialSave.terms.productId}`}>Open saved product</Link> : null}
      </div>
  );
  const ordinarySections = sections.map((section, index) => <section className="grid gap-4 rounded-xl bg-surface p-5 border border-line md:p-6" key={`${section.title}-${index}`}>
    {!singleOpenSection ? <div className="[&_h2]:m-0 [&_h2]:text-base [&_h2]:font-semibold [&_p]:m-0 [&_p]:mt-0.5 [&_p]:text-[13px] [&_p]:text-mute"><div><h2>{section.title || 'Details'}</h2>{section.description ? <p>{section.description}</p> : null}</div></div> : null}
    <div className="grid gap-4 sm:grid-cols-2">{section.fields.map(renderField)}</div>
  </section>);
  const named = (name: string) => fields.filter(field => field.section === name && resolveKind(field) !== 'hidden');
  const grid = (list: Field[]) => <div className="grid gap-4 sm:grid-cols-2">{list.map(field => field.name === 'stockReason'
    ? <div key={field.name} hidden={!stockChanged} className="sm:col-span-2">{renderField({ ...field, required: stockChanged })}</div>
    : renderField(field))}</div>;
  const card = (title: string, description: string, body: ReactNode) => <section className="grid content-start gap-4 rounded-xl border border-line bg-surface p-5 md:p-6">
    <div className="[&_h2]:m-0 [&_h2]:text-base [&_h2]:font-semibold [&_p]:m-0 [&_p]:mt-0.5 [&_p]:text-[13px] [&_p]:text-mute"><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{body}
  </section>;
  const stockFieldNames = ['stock', 'stockReason'];
  const moreGroups = ['Care & usage', 'Identifiers', 'Variants', 'Catalogue feeds'].filter(name => named(name).length);
  const productBody = <>
    {card('Basics', '', grid(named('Basics')))}
    {card('Price & stock', '', <>
      {/* Stock is shared by every channel, so only the retail price and offer follow the Retail switch. */}
      <fieldset disabled={!pricing.trade.retail} hidden={!pricing.trade.retail} className="m-0 min-w-0 border-0 p-0">{grid(named('Pricing').filter(field => !stockFieldNames.includes(field.name)))}</fieldset>
      {!pricing.trade.retail ? <p className="m-0 text-[13px] text-mute">Retail is off for this product. Turn it on under More details to set a retail price.</p> : null}
      {grid(named('Pricing').filter(field => stockFieldNames.includes(field.name)))}
    </>)}
    {card('Listing', 'Optional. A pack size and description help customers choose.', grid(named('Listing')))}
    <details className="group rounded-xl border border-line bg-surface" onInvalidCapture={event => { (event.target as HTMLElement).closest('details')?.setAttribute('open', ''); }}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        More details <span className="text-xs font-normal text-mute">Channels, care, identifiers, variants, feeds</span>
      </summary>
      <div className="grid gap-6 border-t border-line p-5 md:p-6">
        <div className="grid gap-3">
          <h3 className="m-0 text-sm font-semibold">Sales channels</h3>
          <ProductChannels trade={pricing.trade} onChange={pricing.setTrade} reload={pricing.reload} />
          <WholesalePrices trade={pricing.trade} onChange={pricing.setTrade} />
          {productAudience ? <div hidden={!pricing.trade.wholesale} className="grid gap-3"><ProductAudienceFields initial={productAudience} types={pricing.trade.types} /></div> : null}
        </div>
        {moreGroups.map(name => <div key={name} className="grid gap-3"><h3 className="m-0 text-sm font-semibold">{name}</h3>{grid(named(name))}</div>)}
        {productChecks}
      </div>
    </details>
  </>;
  return <PendingPhotosContext.Provider value={{ files: photoFiles, setFiles: setPhotoFiles }}><div className="grid gap-4">{dialog}
    <div className={productEditor && productMedia ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]' : ''}>
    <form ref={formRef} className="grid min-w-0 gap-4" onSubmit={submit} aria-busy={pending} onChange={event => {
      if (productEditor && event.target instanceof HTMLInputElement && event.target.name === 'stock') setStockChanged(event.target.value !== fields.find(field => field.name === 'expectedStock')?.value);
    }}>
      {fields.map(field => resolveKind(field) === 'hidden' ? renderField(field) : null)}
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={pending || Boolean(partialSave)}>
      <div key={version} className="grid gap-4">
      {productEditor ? productBody : ordinarySections}
      </div>
      </fieldset>
      {saveControls}
    </form>
    {productEditor && productMedia ? <div className="min-w-0 max-xl:order-first xl:sticky xl:top-20">{productMedia}</div> : null}
    </div>
  </div></PendingPhotosContext.Provider>;
}

export { NotificationSettings } from './notification-settings';
export function BulkTemplates({
  recipients,
}: {
  recipients: { from: string; name: string; promotionStatus: string }[];
}) {
  const { ask, dialog } = useConfirm();
  const [selected, setSelected] = useState<string[]>([]);
  const [csvNumbers, setCsvNumbers] = useState<string[]>([]);
  const [csvError, setCsvError] = useState("");
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(await ask(`Send this approved template to ${selected.length} selected recipients?`, { action: 'Send template' }))) return;
    const data = new FormData(form);
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
    <form className="mb-4 grid gap-4 rounded-xl bg-surface p-5 border border-line md:p-6" onSubmit={send}>
      {dialog}
      <div className="mb-1 [&_h2]:m-0 [&_h2]:text-base [&_h2]:font-semibold">
        <div>
          <h2>Broadcast template</h2>
          <p className="m-0 text-[13px] text-mute">Send one approved template to a reviewed recipient list. Delivery requires a provider report.</p>
        </div>
      </div>
      <div className="grid gap-4 rounded-xl bg-surface p-5 border border-line md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border-2 border-dashed border-line-strong bg-soft p-4 hover:bg-fill sm:col-span-2" htmlFor="recipient-csv">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-fill [&>svg]:size-5" aria-hidden="true">
              <CloudArrowUpIcon />
            </span>
            <span className="grid min-w-0 text-[13px] [&>strong]:font-semibold [&>span]:text-xs [&>span]:text-mute">
              <strong>Recipient CSV</strong>
              <span>First column · up to 25 numbers · 256 KB</span>
            </span>
            <input
              id="recipient-csv"
              type="file" className="ml-auto min-w-0 max-w-[45%] text-xs text-mute"
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
          {csvError ? <p role="alert" className="m-0 rounded-lg bg-bad-soft px-3 py-2 text-[13px] font-medium text-bad">{csvError}</p> : null}
          {csvNumbers.length ? (
            <p className="m-0 text-[13px] text-mute">
              Imported {csvNumbers.length} recipient numbers. Review the CSV and
              promotion permissions before sending.
            </p>
          ) : null}
        </div>
      </div>
      <fieldset disabled={pending}>
        <legend>Recipients</legend>
        <div className="grid max-h-80 gap-1 overflow-y-auto rounded-lg bg-soft p-2 [&_label]:flex [&_label]:items-center [&_label]:gap-3 [&_label]:rounded-lg [&_label]:p-2.5 [&_label]:text-[13px]">
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
      <div className="grid gap-3 rounded-xl bg-surface p-4 border border-line">
        <label htmlFor="bulk-template">
          Template name
          <input className={inputClass} id="bulk-template" name="template" required />
        </label>
        <label htmlFor="bulk-link">
          Image URL
          <input className={inputClass} id="bulk-link" name="link" type="url" required />
        </label>
        <button className={buttonVariants({ variant: "default" })} disabled={pending || !selected.length}>
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
