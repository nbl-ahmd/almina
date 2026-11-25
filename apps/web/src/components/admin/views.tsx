import { ZoneOrderReassignment } from './delivery-management';
import type { OrderRouting } from '@almina/contracts';
import { OrderCosts } from './order-costs';
import { feedIssues } from '../../lib/catalog/feed';
import { readProduct } from '../../lib/catalog/model';
import { productImages } from '../../lib/server/catalog';
import { storePublicationIssues, cloudinaryImage, type CatalogueContext } from "@almina/contracts";
import { getWebEnvironment } from "../../lib/server/env";
import { randomUUID } from "node:crypto";
import { ProductPhotos } from "./product-photos";
import Image from "next/image";
import type { ReactNode } from "react";
import type { AdminRecord } from "../../lib/admin/policy";
import { Command } from "./controls";
import { AdminForm, type Field } from "./forms";
import { Badge, Card, PageHeader, buttonVariants, orderStatusTone } from "./ui";
import { orderLinePresentation } from '../../lib/admin/order-lines';
import Link from '../app-link';
export function record(value: unknown): AdminRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AdminRecord)
    : {};
}
export function rows(value: unknown): AdminRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}
export function display(value: unknown): string {
  return value === null || value === undefined
    ? "—"
    : typeof value === "object"
      ? Array.isArray(value)
        ? value.map(display).join(", ")
        : String(record(value).name ?? record(value)._id ?? "—")
      : String(value);
}
export type Column = {
  key: string;
  label: string;
  align?: "end";
  render?: (row: AdminRecord) => ReactNode;
};
const cellAction = '[&_a]:inline-flex [&_a]:h-8 [&_a]:items-center [&_a]:rounded-lg [&_a]:border [&_a]:border-line-strong [&_a]:bg-surface [&_a]:px-3.5 [&_a]:text-xs [&_a]:font-medium [&_a]:text-ink [&_a]:no-underline hover:[&_a]:bg-soft [&_button]:h-8 [&_button]:rounded-lg [&_button]:px-3.5 [&_button]:text-xs';
export function Table({
  caption,
  columns,
  data,
  actions,
  empty,
  compact,
}: {
  caption: string;
  columns: Column[];
  data: AdminRecord[];
  actions?: (row: AdminRecord) => ReactNode;
  empty?: { title?: string; description?: string };
  /** Keep the table layout on phones (scrolls sideways) instead of stacking each row into a card. */
  compact?: boolean;
}) {
  const stack = !compact;
  return (
    <div className="mb-4 overflow-hidden rounded-lg bg-surface border border-line">
      <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-ink" tabIndex={0} role="region" aria-label={caption}>
        <table className={`w-full border-collapse ${stack ? "block md:table" : "table text-[13px]"}`}>
          <caption className="sr-only">{caption}</caption>
          <thead className={stack ? "hidden md:table-header-group" : undefined}>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`whitespace-nowrap bg-soft ${stack ? "px-5" : "px-4"} py-3 text-xs font-semibold text-mute ${column.align === 'end' ? 'text-right' : 'text-left'}`}>
                  {column.label}
                </th>
              ))}
              {actions ? <th scope="col" className="bg-soft px-5 py-3 text-left text-xs font-semibold text-mute">Actions</th> : null}
            </tr>
          </thead>
          <tbody className={stack ? "block md:table-row-group" : undefined}>
            {data.map((row, index) => (
              <tr key={display(row._id ?? index)} className={stack ? "block border-b border-line px-4 py-2.5 last:border-0 md:table-row md:border-0 md:p-0 md:even:bg-soft md:hover:bg-soft" : "even:bg-soft"}>
                {columns.map((column) => (
                  <td key={column.key} data-label={column.label}
                    className={stack ? `flex items-center justify-between gap-4 py-0.5 text-[13.5px] before:text-xs before:font-medium before:text-mute before:content-[attr(data-label)] md:table-cell md:px-5 md:py-3.5 md:[overflow-wrap:normal] md:before:content-none ${column.align === 'end' ? 'md:text-right md:tabular-nums' : ''}` : `whitespace-nowrap px-4 py-2.5 ${column.align === 'end' ? 'text-right tabular-nums' : ''}`}>
                    <span className="min-w-0 text-right md:text-inherit">
                      {column.render ? column.render(row) : display(column.key.split('.').reduce<unknown>((value, key) => record(value)[key], row))}
                    </span>
                  </td>
                ))}
                {actions ? (
                  <td className={stack ? "block pt-2 md:table-cell md:px-5 md:py-3.5" : "px-4 py-2.5"}>
                    <div className={`flex flex-wrap items-center gap-1.5 ${cellAction}`}>{actions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
            {!data.length ? (
              <tr className="block md:table-row">
                <td className="block md:table-cell" colSpan={columns.length + (actions ? 1 : 0)}>
                  <div className="grid justify-items-center gap-1 px-6 py-12 text-center">
                    <p className="m-0 text-[15px] font-semibold text-ink">{empty?.title ?? 'No records found.'}</p>
                    {empty?.description ? <p className="m-0 max-w-sm text-[13px] text-mute">{empty.description}</p> : null}
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
/** Every photo the product shows today, as addresses the browser can load. */
function gallery(product: AdminRecord): string[] {
  const environment = getWebEnvironment();
  const cdn = Array.isArray(product.cloudinaryImages) ? product.cloudinaryImages.map(value => cloudinaryImage(value, environment.CLOUDINARY_CLOUD_NAME)).filter((value): value is string => Boolean(value)) : [];
  if (cdn.length) return cdn.slice(0, 8);
  const legacy = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter((value): value is string => typeof value === 'string' && /^[A-Za-z0-9_.-]+$/.test(value));
  return [...new Set(legacy)].slice(0, 8).map(filename => `${environment.LEGACY_API_ORIGIN}/api/products/images/${filename}`);
}
export function ProductForm({
  product,
  categories,
  selectedCategory,
  queue,
}: {
  product?: AdminRecord | undefined;
  categories: AdminRecord[];
  selectedCategory?: string | undefined;
  /** The product list this editor is working through. */
  queue?: { context: CatalogueContext; nextId: string | null } | undefined;
}) {
  const edit = !!product;
  const section = (
    title: string,
    description: string,
    list: Field[],
    advanced = false,
  ): Field[] =>
    list.map((field) => ({
      ...field,
      section: title,
      sectionDescription: description,
      ...(advanced ? { advanced: true } : {}),
    }));
  const fields: Field[] = [
    ...section(
      "Product details",
      "The name, brand and copy customers see on the product page.",
      [
        {
          name: "name",
          label: "Product name",
          required: true,
          value: display(product?.name ?? ""),
          span: "full",
        },
        { name: "brand", label: "Brand", value: display(product?.brand ?? "") },
        {
          name: "manufacturer",
          label: "Manufacturer",
          value: display(product?.manufacturer ?? ""),
        },
        {
          name: "summary",
          label: "Short summary",
          value: display(product?.summary ?? ""),
          span: "full",
          hint: "One line used in listings. Keep claims factual and specific to the pack.",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          required: true,
          value: display(product?.description ?? ""),
          rows: 5,
        },
        {
          name: "ingredients",
          label: "Ingredients / materials",
          type: "textarea",
          value: display(product?.ingredients ?? ""),
        },
        {
          name: "usage",
          label: "Usage information",
          type: "textarea",
          value: display(product?.usage ?? ""),
        },
        {
          name: "warnings",
          label: "Warnings",
          type: "textarea",
          value: display(product?.warnings ?? ""),
        },
        {
          name: "storage",
          label: "Storage",
          type: "textarea",
          value: display(product?.storage ?? ""),
        },
      ],
    ),
    ...section(
      "Pricing & stock",
      "Prices are VAT-inclusive AED amounts. The server recalculates order totals.",
      [
        {
          name: "price",
          label: "Price (AED)",
          type: "number",
          min: 0,
          step: "0.01",
          required: true,
          value: display(product?.price ?? ""),
          prefix: "AED",
        },
        {
          name: "stock",
          label: "Stock quantity",
          type: "number",
          min: 0,
          step: "1",
          required: true,
          value: display(product?.stock ?? ""),
          suffix: "units",
        },
        {
          name: "salePrice",
          label: "Sale price (AED, optional)",
          type: "number",
          min: 0,
          step: "0.01",
          value: product?.salePrice == null ? "" : display(product.salePrice),
          hint: "Leave blank when the product is not on sale. The store shows the sale price automatically.",
          prefix: "AED",
        },
      ],
    ),
    ...section(
      "Catalogue",
      "Classification, identifiers and the storefront category.",
      [
        {
          name: "category",
          label: "Category",
          required: true,
          value: selectedCategory ?? (edit ? (typeof product?.category === 'object' && product.category ? display(record(product.category)._id) : display(product?.category)) : undefined),
          options: categories.map((category) => ({
            value: display(category._id),
            label: display(category.name),
          })),
        },
        ...(!edit ? [{
          name: "barcode",
          label: "Barcode (optional)",
          hint: "An ERP barcode is not automatically a verified GTIN.",
        }] : []),
        {
          name: "gtin",
          label: "Verified GTIN (optional)",
          value: display(product?.gtin ?? ""),
        },
        {
          name: "mpn",
          label: "Manufacturer part number (optional)",
          value: display(product?.mpn ?? ""),
        },
        { name: "saleUnit", label: "Saleable unit", value: display(product?.saleUnit ?? ""), hint: "How one unit is sold. Defaults to Each when left blank." },
        { name: "packLabel", label: "Pack / specification", required: true, value: display(product?.packLabel ?? ""), placeholder: "e.g. 30 tablets, 200 ml" },
        { name: "productForm", label: "Product form", value: display(product?.productForm ?? "") },
        {
          name: "strength",
          label: "Strength (display only)",
          value: display(product?.strength ?? ""),
        },
        {
          name: "productType",
          label: "Product type",
          required: true,
          value: display(product?.productType ?? ""),
          options: [
            { value: "", label: "Select product type" },
            { value: "general", label: "General sale" },
            { value: "otc", label: "Pharmacy medicine (OTC)" },
            { value: "prescription", label: "Prescription only — not sold online" },
          ],
          kind: "segmented",
          span: "full",
          hint: "Medicines must be classified before they can be published.",
        },
        {
          name: "condition",
          label: "Item condition",
          value: display(product?.condition ?? ""),
          options: [
            { value: "", label: "Not set" },
            { value: "new", label: "New" },
            { value: "used", label: "Used" },
            { value: "refurbished", label: "Refurbished" },
          ],
          kind: "segmented",
        },
        {
          name: "identifierStatus",
          label: "Manufacturer identifier status",
          value: display(product?.identifierStatus ?? ""),
          options: [
            { value: "", label: "Not reviewed" },
            { value: "unknown", label: "Unknown" },
            { value: "assigned", label: "Assigned" },
            { value: "not-assigned", label: "Not assigned" },
          ],
        },
        {
          name: "googleProductCategory",
          label: "Google product category",
          value: display(product?.googleProductCategory ?? ""),
        },
      ],
    ),
    ...section(
      "Marketing",
      "Optional channel approvals and search overrides. Storefront publishing does not require these.",
      [
        {
          name: "googleApproved",
          label: "Approved for Google catalog export",
          value: product?.googleApproved === true ? "true" : "false",
          options: [
            { value: "false", label: "Not approved" },
            { value: "true", label: "Approved" },
          ],
        },
        {
          name: "metaApproved",
          label: "Approved for Meta catalog export",
          value: product?.metaApproved === true ? "true" : "false",
          options: [
            { value: "false", label: "Not approved" },
            { value: "true", label: "Approved" },
          ],
        },
        {
          name: "imageSource",
          label: "Image source URL",
          value: display(product?.imageSource ?? ""),
          span: "full",
          hint: "Record where the approved image came from. Upload the actual file on the Photos tab.",
        },
        {
          name: "seoTitle",
          label: "SEO title override",
          value: display(product?.seoTitle ?? ""),
        },
        {
          name: "seoDescription",
          label: "SEO description override",
          type: "textarea",
          value: display(product?.seoDescription ?? ""),
        },
      ],
    ),
    ...(edit
      ? section(
          "Inventory adjustment",
          "Every stock edit needs a reason so the change can be reconciled later.",
          [
            {
              name: "stockReason",
              label: "Stock adjustment reason",
              required: true,
              span: "full",
              hint: "Record the physical count or correction. A stale stock value requires reloading.",
            },
          ],
        )
      : []),
    ...section(
      "Family & variants",
      "Only products that are genuinely the same item in another size, flavour or pack.",
      [
        {
          name: "familyKey",
          label: "Product family key (optional)",
          value: display(product?.familyKey ?? ""),
          span: "full",
          hint: "Same key for verified size/flavour/pack variants. Clear all family fields to keep this product standalone.",
        },
        { name: "familyName", label: "Family display name", value: display(product?.familyName ?? "") },
        { name: "familyBrand", label: "Family brand", value: display(product?.familyBrand ?? "") },
        {
          name: "familyForm",
          label: "Family form / model",
          value: display(product?.familyForm ?? ""),
          hint: "Must match across all family members.",
        },
        {
          name: "familyStrength",
          label: "Family strength identity",
          value: display(product?.familyStrength ?? ""),
          hint: "Use the verified strength, or not-applicable for non-medicines. Different strengths stay separate.",
        },
        { name: "variantSize", label: "Variant size", value: display(product?.variantSize ?? "") },
        { name: "variantFlavour", label: "Variant flavour", value: display(product?.variantFlavour ?? "") },
        {
          name: "variantPackSize",
          label: "Variant pack size",
          value: display(product?.variantPackSize ?? ""),
          hint: "Each combination needs its own SKU and stock. Shared barcodes do not establish family membership.",
        },
      ],
      true,
    ),
    ...(edit
      ? ([
          { name: "expectedStock", label: "Stock at load", type: "hidden", value: display(product?.stock ?? "") },
          { name: "inventoryKey", label: "Adjustment receipt", type: "hidden", value: randomUUID() },
        ] as Field[])
      : []),
  ];
  const sectionOf = (name: string) =>
    ['name', 'brand', 'category', 'productType'].includes(name) ? 'Basics'
    : ['price', 'salePrice', 'stock', 'stockReason'].includes(name) ? 'Pricing'
    : ['packLabel', 'summary', 'description'].includes(name) ? 'Listing'
    : ['ingredients', 'usage', 'warnings', 'storage'].includes(name) ? 'Care & usage'
    : ['barcode', 'gtin', 'mpn', 'manufacturer', 'identifierStatus', 'saleUnit'].includes(name) ? 'Identifiers'
    : ['familyKey', 'familyName', 'familyBrand', 'familyForm', 'familyStrength', 'variantSize', 'variantFlavour', 'variantPackSize'].includes(name) ? 'Variants'
    : 'Catalogue feeds';
  const order = ['name', 'brand', 'category', 'productType', 'price', 'stock', 'stockReason', 'salePrice', 'packLabel', 'summary', 'description'];
  // A new product starts as General. An existing product whose type was never confirmed starts with none selected, so no
  // save or queue shortcut can classify it: a person has to choose.
  const typeConfirmed = typeof product?.productType === 'string' && ['general', 'otc', 'prescription'].includes(product.productType);
  const typeUnconfirmed = edit && !typeConfirmed;
  const productTypeValue = typeConfirmed ? String(product.productType) : edit ? '' : 'general';
  const stockReasons = ['Stock count', 'Received stock', 'Damaged or expired', 'Correction'].map(value => ({ value, label: value }));
  const overrides: Record<string, Partial<Field>> = {
    name: { required: true, span: 'full', placeholder: 'e.g. Panadol Extra 500mg' },
    brand: { kind: 'combobox', creatable: 'brand', required: true, placeholder: 'Choose or add a brand' },
    category: { kind: 'combobox', creatable: 'category', required: true, placeholder: 'Choose or add a category', hint: '' },
    productType: { kind: 'segmented', label: 'Type', required: !typeUnconfirmed, span: 'full', value: productTypeValue, hint: typeUnconfirmed ? 'Not confirmed yet. Check the pack and choose a type before publishing. Prescription items are never sold online.' : 'Prescription items are never sold online.',
      options: [{ value: 'general', label: 'General' }, { value: 'otc', label: 'Pharmacy medicine (OTC)' }, { value: 'prescription', label: 'Prescription' }] },
    price: { label: 'Price (AED)', required: true, prefix: 'AED', min: 0, step: '0.01' },
    salePrice: { kind: 'offer', label: 'Offer', span: 'full' },
    stock: { label: 'Stock', required: true, min: 0, step: '1' },
    stockReason: { kind: 'select', label: 'Reason for stock change', required: false, value: 'Stock count', options: stockReasons, hint: '' },
    packLabel: { label: 'Pack size', required: false, placeholder: 'e.g. 24 tablets, 200 ml' },
    summary: { span: 'full', hint: '' },
    description: { required: false, rows: 4, span: 'full', placeholder: 'Optional' },
  };
  const compactFields = fields.filter(field => field.name !== 'imageSource').map((field): Field => ({
    ...field, section: sectionOf(field.name), advanced: false, sectionDescription: '', ...(overrides[field.name] ?? {}),
  })).sort((left, right) => (order.indexOf(left.name) + 1 || 99) - (order.indexOf(right.name) + 1 || 99));
  const readinessProduct = edit ? readProduct({...product,disabled:false,category:typeof product.category==='object'?product.category:categories.find(category=>String(category._id)===String(product.category))}) : null;
  const readinessIssues = edit ? storePublicationIssues({ ...product, contentReviewed: true, stockVerified: true, saleUnit: product.saleUnit || 'Each', imageRights: 'authorized' }) : [];
  return (
    <div className="grid gap-4">
      <AdminForm
      path={edit ? `products/${display(product._id)}` : "products"}
      method={edit ? "PUT" : "POST"}
      multipart
      productAudience={{ audience: typeof product?.audience === 'string' ? product.audience : undefined, wholesaleAudience: typeof product?.wholesaleAudience === 'string' ? product.wholesaleAudience : undefined, wholesaleTypeIds: Array.isArray(product?.wholesaleTypeIds) ? product.wholesaleTypeIds.filter((id): id is string => typeof id === 'string') : [] }}
      fields={compactFields}
      label="Save & publish"
      publishDefault={edit ? product.disabled !== true : true}
      productLive={edit ? product.disabled !== true : true}
      {...(queue ? { queue } : {})}
      {...(edit ? { mediaRevision: Number(product.mediaRevision ?? 0) } : {})}
      typeUnconfirmed={typeUnconfirmed}
      productMedia={<aside className="grid content-start gap-4" aria-label="Product media">
          {edit ? <ProductPhotos key={display(product._id)} productId={display(product._id)} revision={Number(product.mediaRevision ?? 0)} current={gallery(product)} /> :
            <ProductPhotos />}
        </aside>}
      productChecks={<div className="grid gap-4">
    {edit ? <details className="mb-4 rounded-xl bg-surface p-5 border border-line [&>summary]:cursor-pointer [&>summary]:text-sm [&>summary]:font-semibold [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[13px] [&_p]:text-[13px]" open={readinessIssues.length > 0}><summary>{readinessIssues.length ? `${readinessIssues.length} details to complete before publishing` : 'Ready to publish'}</summary>{readinessIssues.length ? <ul>{readinessIssues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p>All required storefront details are present. Saving publishes this product.</p>}{product.catalogManaged === true && typeof product.websiteStockProposed === 'number' ? <p className="mt-3 text-xs text-mute">Imported stock estimate: {display(product.websiteStockProposed)}. Confirm the counted stock before saving.</p> : null}</details> : <p className="m-0 text-xs text-mute">The product publishes as soon as you save. Required fields are marked.</p>}
    {readinessProduct ? <details className="mb-4 rounded-xl bg-surface p-5 border border-line [&>summary]:cursor-pointer [&>summary]:text-sm [&>summary]:font-semibold [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[13px] [&_p]:text-[13px]"><summary>Google / Meta catalog readiness</summary>{(['google','meta'] as const).map(channel=><div key={channel}><h2>{channel==='google'?'Google':'Meta'}</h2>{feedIssues(readinessProduct,channel,productImages(readinessProduct).filter(image=>image.startsWith('https://'))).length?<ul>{feedIssues(readinessProduct,channel,productImages(readinessProduct).filter(image=>image.startsWith('https://'))).map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>Product fields complete. Channel eligibility and live feed validation are separate steps.</p>}</div>)}</details>:null}
      </div>}
    />
    </div>
  );
}
/** Shop time, as staff read it. */
function orderTime(value: unknown): string {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? new Date(time).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }) : display(value);
}
export function OrderDetail({
  order,
  admin,
  branches,
}: {
  order: AdminRecord;
  admin: boolean;
  branches?:OrderRouting['branches']|undefined;
}) {
  const customer = record(order.customer);
  const id = display(order._id);
  const status = display(order.status);
  const stripePayment=order.payment as {provider?:string;state?:string;testMode?:boolean;reference?:string;refundIssue?:string}|undefined;
  const readyForFulfilment = !stripePayment || (stripePayment.testMode === false && stripePayment.state === 'paid');
  return (
    <>
      <PageHeader
        title={`Order ${display(order.orderId)}`}
        description={order.channel==='wholesale'?`Wholesale · ${display(record(order.wholesale).businessName)} · ${display(record(order.wholesale).typeId)}`:"Customer, delivery and recorded line details for this order."}
        actions={
          <>
            <Badge tone={orderStatusTone(status)} dot>
              {status}
            </Badge>
            <Link className={buttonVariants({ variant: "outline" })} href="/admin/orders">Back to orders</Link>
          </>
        }
      />

      {stripePayment?.provider==='stripe'?<div className="mb-3 grid gap-2 rounded-lg bg-fill px-4 py-3 text-[13px] [&_p]:m-0" role="status"><strong>{stripePayment.testMode?'Stripe test payment':'Stripe online payment'} · {display(stripePayment.state)}</strong><p>Only verified paid orders can be fulfilled. Paid-order cancellation requests a refund; cancellation finishes after Stripe confirms it. Dispatched goods are not automatically restocked.</p>{stripePayment.reference?<p>Stripe reference: {stripePayment.reference}</p>:null}{stripePayment.refundIssue?<p>{stripePayment.refundIssue}</p>:null}</div>:null}
      <Table
        caption={
          order.snapshotAvailable
            ? "Recorded order lines"
            : "Historical lines (current product labels; original snapshots unavailable)"
        }
        data={rows(order.cartItems).map((line) =>
          orderLinePresentation(line, order.snapshotAvailable === true),
        )}
        columns={[
          { key: "_id.name", label: "Product" },
          { key: "variantLabel", label: "Selected option" },
          { key: "quantity", label: "Quantity", align: "end" },
          {
            key: "displayedUnitPrice",
            label: order.snapshotAvailable
              ? "Charged unit price (AED)"
              : "Current unit price (AED)",
            align: "end",
          },
          {
            key: "recordedLineTotal",
            label: "Recorded line total (AED)",
            align: "end",
          },
        ]}
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start [&>section]:mb-4">
      <div className="mb-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 [&>section]:mb-0">
        <Card
          title="Customer and delivery"
          description="Contact and address details supplied at checkout."
        >
          <dl className="m-0 grid gap-2 [&>div]:rounded-lg [&>div]:bg-soft [&>div]:px-4 [&>div]:py-3 [&_dt]:text-xs [&_dt]:text-mute [&_dd]:m-0 [&_dd]:mt-0.5 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-medium">
            {(
              [
                ["name", "Customer"],
                ["mobile", "Mobile"],
                ["email", "Email"],
                ["buildingname", "Building"],
                ["flatno", "Flat / unit"],
                ["address", "Address"],
                ["city", "City"],
                ["emirate", "Emirate"],
                ["note", "Delivery note"],
                ["payment", "Payment"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{display(customer[key])}</dd>
              </div>
            ))}
          </dl>
          {typeof customer.maplink === "string" &&
          /^https:\/\//.test(customer.maplink) ? (
            <p className="m-0 mt-3 text-xs">
              <a href={customer.maplink} rel="noreferrer" target="_blank">
                Open delivery map
              </a>
            </p>
          ) : null}
        </Card>
        <Card
          title="Recorded amounts"
          description="Stored figures only. The server remains authoritative."
        >
          <dl className="m-0 grid gap-2 [&>div]:rounded-lg [&>div]:bg-soft [&>div]:px-4 [&>div]:py-3 [&_dt]:text-xs [&_dt]:text-mute [&_dd]:m-0 [&_dd]:mt-0.5 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-medium">
            {typeof order.couponDiscountMinor === 'number' && typeof order.couponCode === 'string' && <div>
              <dt>Coupon discount ({order.couponCode})</dt>
              <dd>−AED {(order.couponDiscountMinor / 100).toFixed(2)}</dd>
            </div>}
            {(
              [
                ["totalSalePrice", "Product subtotal (AED)"],
                ["deliveryFee", "Delivery fee (AED)"],
                ["vatAmount", "VAT (AED)"],
                ["totalAmount", "Order total (AED)"],
                ["createdAt", "Received"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{key === "createdAt" ? orderTime(customer[key] ?? order[key]) : display(customer[key] ?? order[key])}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      {order.channel==='wholesale'?<Card title="Business at time of order" description="Recorded when the order was placed. Later account edits do not change these details."><dl className="m-0 grid gap-2 [&>div]:rounded-lg [&>div]:bg-soft [&>div]:px-4 [&>div]:py-3 [&_dt]:text-xs [&_dt]:text-mute [&_dd]:m-0 [&_dd]:mt-0.5 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-medium">{[['businessName','Business'],['typeId','Business type'],['contactName','Contact'],['phone','Business phone'],['tradeLicense','Trade licence'],['taxRegistrationNumber','Tax registration number']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{display(record(order.wholesale)[key!])}</dd></div>)}</dl></Card>:null}
      {admin && order.schemaVersion===2?<details className="mb-4 rounded-xl bg-surface p-5 border border-line [&>summary]:cursor-pointer [&>summary]:text-sm [&>summary]:font-semibold [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[13px] [&_p]:text-[13px]"><summary>Contribution reporting · actual costs</summary><OrderCosts key={id} orderId={id}/></details>:null}
        </div>
        <div className="grid min-w-0 content-start max-xl:order-first [&>section]:mb-4 xl:sticky xl:top-20">
      <Card title="Order actions" description={status === "pending" ? "Next step: check the address and payment, then confirm." : status === "confirmed" ? "Next step: pack and check every item." : status === "packed" ? "Next step: dispatch with the bill details." : undefined}>
        {!readyForFulfilment ? <p className="mb-3 grid gap-2 rounded-lg bg-fill px-4 py-3 text-[13px] [&_p]:m-0">Payment is not ready for fulfilment. Await a verified live payment before confirming, packing or dispatching.</p> : null}
        {status === 'pending' && readyForFulfilment ? <div className="mb-3 grid gap-2 rounded-lg bg-fill px-4 py-3 text-[13px] [&_p]:m-0"><p>Verify the delivery address and payment status, then accept this order for your pharmacy.</p><Command path={`orders/${id}/confirm`} method="POST" variant="primary">Confirm order</Command></div> : null}
        {status === 'confirmed' && readyForFulfilment ? <div className="mb-3 grid gap-2 rounded-lg bg-fill px-4 py-3 text-[13px] [&_p]:m-0"><p>Prepare and check every item before marking the order ready for dispatch.</p><Command path={`orders/${id}/pack`} method="POST" variant="primary">Mark as packed</Command></div> : null}
        {readyForFulfilment ? <AdminForm
          path={`orders/${id}`}
          method="PUT"
          fields={[
            { name: "billno", label: "Bill number", required: true },
            {
              name: "billamount",
              label: "Bill amount (AED)",
              type: "number",
              min: 0,
              step: "0.01",
              required: true,
              prefix: "AED",
            },
          ]}
          label="Dispatch order"
          confirm="Dispatch this order with the entered billing details?"
        /> : null}
        <hr className="my-5 border-0 border-t border-line" />
        <div className="flex flex-wrap items-center gap-2">
          <Command
            path={`orders/cancel/${id}`}
            body={{ cancelled: true }}
            variant="danger"
            confirm={stripePayment?.provider==='stripe'?"Cancel this Stripe order? A paid order requires a full refund; cancellation and any eligible restock complete only after Stripe confirms the refund.":"Cancel this order? The server will apply the existing cancellation and restocking policy."}
          >
            Cancel order
          </Command>
        </div>
        {admin ? (
          <>
            <hr className="my-5 border-0 border-t border-line" />
            <AdminForm
              key={`${id}-${status}`}
              path={`orders/edit/${id}`}
              method="PUT"
              fields={[
                {
                  name: "status",
                  label: "Order status",
                  value: status,
                  options: [
                    "pending",
                    "confirmed",
                    "packed",
                    "dispatched",
                    "cancelled",
                    "refunded",
                  ].map((value) => ({ value, label: value })),
                },
              ]}
              confirm={stripePayment?.provider==='stripe'?"Apply this Stripe order change? Selecting cancelled or refunded on a live order requests a real refund; completion waits for Stripe confirmation.":"Apply this order status change?"}
              label="Update status"
            />
          </>
        ) : null}
      </Card>
      <Card title="Receiving branch"><p><strong>{display(record(order.routing).branchName)}</strong> · {display(record(order.routing).areaLabel)}</p>{record(order.routing).needsReview ? <p className="mb-3 rounded-lg bg-bad-soft px-4 py-3 text-[13px] font-medium text-bad">Check this address before dispatch. The order remains visible to administrators.</p> : null}{!order.deliveryAssignment?<p className="text-sm">This older order has no saved polygon assignment. Verify the original address before dispatch. Administrators retain access.</p>:null}</Card>
      {admin&&order.deliveryAssignment&&branches?<ZoneOrderReassignment orderId={id} branchId={String(record(order.deliveryAssignment).branchId)} branches={branches} />:null}
        </div>
      </div>
    </>
  );
}
export function MediaPreview({
  item,
  kind,
  origin,
}: {
  item: AdminRecord;
  kind: string;
  origin: string;
}) {
  const cloudinary = Array.isArray(item.cloudinaryImages) ? cloudinaryImage(item.cloudinaryImages[0], getWebEnvironment().CLOUDINARY_CLOUD_NAME) : null;
  const firstImage = item.image ?? (Array.isArray(item.images) ? item.images[0] : undefined);
  const filename =
    typeof firstImage === "string" && /^[A-Za-z0-9_.-]+$/.test(firstImage)
      ? firstImage
      : "";
  return cloudinary || filename ? (
    <Image
      src={cloudinary ?? `${origin}/api/${kind}/${kind === "whatsapp" ? "image" : "images"}/${filename}`}
      alt={display(item.name ?? "Uploaded media")}
      width={160}
      height={100}
    />
  ) : null;
}
