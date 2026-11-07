import { ZoneOrderReassignment } from './delivery-management';
import type { OrderRouting } from '@almina/contracts';
import { OrderAreaReview } from './order-routing';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { OrderCosts } from './order-costs';
import { feedIssues } from '../../lib/catalog/feed';
import { readProduct } from '../../lib/catalog/model';
import { productImages } from '../../lib/server/catalog';
import { publicationIssues, storePublicationIssues, cloudinaryImage } from "@almina/contracts";
import { getWebEnvironment } from "../../lib/server/env";
import { randomUUID } from "node:crypto";
import { CloudinaryUpload } from "./cloudinary-upload";
import Image from "next/image";
import type { ReactNode } from "react";
import type { AdminRecord } from "../../lib/admin/policy";
import { Command } from "./controls";
import { AdminForm, type Field } from "./forms";
import { Badge, Card, PageHeader, orderStatusTone } from "./ui";
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
export function Table({
  caption,
  columns,
  data,
  actions,
  empty,
}: {
  caption: string;
  columns: Column[];
  data: AdminRecord[];
  actions?: (row: AdminRecord) => ReactNode;
  empty?: { title?: string; description?: string };
}) {
  return (
    <div
      className="admin-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table role="table">
        <caption>{caption}</caption>
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((column) => (
              <th
                scope="col"
                role="columnheader"
                key={column.key}
                className={column.align === "end" ? "admin-num" : undefined}
              >
                {column.label}
              </th>
            ))}
            {actions ? (
              <th scope="col" role="columnheader">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {data.map((row, index) => (
            <tr key={display(row._id ?? index)} role="row">
              {columns.map((column) => (
                <td
                  key={column.key}
                  role="cell"
                  data-label={column.label}
                  className={column.align === "end" ? "admin-num" : undefined}
                >
                  {column.render
                    ? column.render(row)
                    : display(
                        column.key
                          .split(".")
                          .reduce<unknown>(
                            (value, key) => record(value)[key],
                            row,
                          ),
                      )}
                </td>
              ))}
              {actions ? (
                <td role="cell" data-label="Actions">
                  <div className="admin-row-actions">{actions(row)}</div>
                </td>
              ) : null}
            </tr>
          ))}
          {!data.length ? (
            <tr role="row">
              <td
                role="cell"
                colSpan={columns.length + (actions ? 1 : 0)}
              >
                <div className="admin-empty">
                  <p className="admin-empty__title">
                    {empty?.title ?? "No records found."}
                  </p>
                  {empty?.description ? <p>{empty.description}</p> : null}
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
export function ProductForm({
  product,
  categories,
  selectedCategory,
}: {
  product?: AdminRecord | undefined;
  categories: AdminRecord[];
  selectedCategory?: string | undefined;
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
          hint: "Required when sale is enabled; cannot exceed the regular price.",
          prefix: "AED",
        },
        ...(edit ? [{
          name: "sale",
          label: "On sale",
          value: product?.sale === true ? "true" : "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
        }] as Field[] : []),
      ],
    ),
    ...section(
      "Catalogue",
      "Classification, identifiers and the storefront category.",
      [
        ...(edit
          ? []
          : ([
              {
                name: "category",
                label: "Category",
                required: true,
                value: selectedCategory,
                options: categories.map((category) => ({
                  value: display(category._id),
                  label: display(category.name),
                })),
                hint: "Products stay in this category until moved.",
              },
            ] as Field[])),
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
        { name: "saleUnit", label: "Saleable unit", value: display(product?.saleUnit ?? "") },
        { name: "packLabel", label: "Pack / specification", value: display(product?.packLabel ?? "") },
        { name: "productForm", label: "Product form", value: display(product?.productForm ?? "") },
        {
          name: "strength",
          label: "Strength (display only)",
          value: display(product?.strength ?? ""),
        },
        {
          name: "productType",
          label: "Product classification",
          value: display(product?.productType ?? ""),
          options: [
            { value: "", label: "Not reviewed" },
            { value: "unreviewed", label: "Unreviewed" },
            { value: "general", label: "General sale" },
            { value: "otc", label: "OTC medicine" },
            { value: "prescription", label: "Prescription" },
          ],
          kind: "segmented",
          span: "full",
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
          name: "imageRights",
          label: "Image usage permission",
          value: display(product?.imageRights ?? ""),
          options: [
            { value: "", label: "Not reviewed" },
            { value: "unreviewed", label: "Unreviewed" },
            { value: "authorized", label: "Authorised" },
          ],
          kind: "segmented",
        },
        {
          name: "googleProductCategory",
          label: "Google product category",
          value: display(product?.googleProductCategory ?? ""),
        },
      ],
    ),
    ...section(
      "Review & publishing",
      "Each confirmation is an explicit editorial decision. Nothing publishes automatically.",
      [
        {
          name: "contentReviewed",
          label: "Content and exact image match reviewed",
          value: product?.contentReviewed === true ? "true" : "false",
          options: [
            { value: "false", label: "No — pending review" },
            { value: "true", label: "Yes — reviewed" },
          ],
        },
        {
          name: "stockVerified",
          label: "Physical stock verified",
          value: product?.stockVerified === true ? "true" : "false",
          options: [
            { value: "false", label: "No — pending review" },
            { value: "true", label: "Yes — reviewed" },
          ],
        },
        {
          name: "googleApproved",
          label: "Approved for Google catalog export",
          value: product?.googleApproved === true ? "true" : "false",
          options: [
            { value: "false", label: "No — pending review" },
            { value: "true", label: "Yes — reviewed" },
          ],
        },
        {
          name: "metaApproved",
          label: "Approved for Meta catalog export",
          value: product?.metaApproved === true ? "true" : "false",
          options: [
            { value: "false", label: "No — pending review" },
            { value: "true", label: "Yes — reviewed" },
          ],
        },
        {
          name: "imageSource",
          label: "Image source URL",
          value: display(product?.imageSource ?? ""),
          span: "full",
          hint: "Record where the approved image came from. Upload the actual file below.",
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
  const compactFields = fields.map((field): Field => {
    const section = ['price', 'salePrice', 'sale', 'stock', 'stockReason'].includes(field.name) ? 'Overview'
      : ['name', 'brand', 'category', 'summary', 'description'].includes(field.name) ? 'Overview'
      : ['ingredients', 'usage', 'warnings', 'storage'].includes(field.name) ? 'Care & usage'
      : field.section === 'Catalogue' || field.name === 'manufacturer' ? 'Organisation'
      : field.section === 'Review & publishing' ? 'Publishing' : 'Variants';
    return { ...field, section, advanced: false, sectionDescription: '',
      ...(field.name === 'price' ? { label: 'Retail price (AED)' } : {}),
      ...(field.name === 'description' ? { rows: 3 } : {}),
      ...(['productType', 'condition', 'imageRights'].includes(field.name) ? { kind: 'select' as const } : {}) };
  });
  const categoryIndex = compactFields.findIndex(field => field.name === 'category');
  if (categoryIndex >= 0) {
    const categoryField = compactFields.splice(categoryIndex, 1)[0]!;
    compactFields.splice(compactFields.findIndex(field => field.name === 'brand') + 1, 0, categoryField);
  }
  const readinessProduct = edit ? readProduct({...product,disabled:false,category:typeof product.category==='object'?product.category:categories.find(category=>String(category._id)===String(product.category))}) : null;
  return (
    <div className="admin-product-page">
      <AdminForm
      path={edit ? `products/${display(product._id)}` : "products"}
      method={edit ? "PUT" : "POST"}
      multipart
      productAudience={{ audience: typeof product?.audience === 'string' ? product.audience : undefined, wholesaleAudience: typeof product?.wholesaleAudience === 'string' ? product.wholesaleAudience : undefined, wholesaleTypeIds: Array.isArray(product?.wholesaleTypeIds) ? product.wholesaleTypeIds.filter((id): id is string => typeof id === 'string') : [] }}
      fields={compactFields}
      label={edit ? "Save product" : "Create product"}
      productMedia={<aside className="admin-product-media" aria-label="Product media">
          {edit ? <><div className="admin-product-gallery"><MediaPreview item={product} kind="products" origin={getWebEnvironment().LEGACY_API_ORIGIN} /></div><CloudinaryUpload productId={display(product._id)} revision={Number(product.mediaRevision ?? 0)} /></> :
            <Card title="Product photos"><div className="admin-product-photo-empty"><PhotoIcon width={32} height={32} aria-hidden="true" /><p>Create this product to add photos.</p><span>You can then upload up to five product images.</span></div></Card>}
          <div className="admin-product-helper"><strong>{edit ? 'Editing an existing product' : 'Start with the essentials'}</strong><p>{edit ? 'Changes are saved together. Stock adjustments require a reason.' : 'Add a name, category, price and opening stock. Additional details can be completed later.'}</p></div>
        </aside>}
      productChecks={<div className="admin-product-checks">
    {readinessProduct ? <details className="admin-panel"><summary>Google / Meta catalog readiness</summary>{(['google','meta'] as const).map(channel=><div key={channel}><h2>{channel==='google'?'Google':'Meta'}</h2>{feedIssues(readinessProduct,channel,productImages(readinessProduct).filter(image=>image.startsWith('https://'))).length?<ul>{feedIssues(readinessProduct,channel,productImages(readinessProduct).filter(image=>image.startsWith('https://'))).map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>Product fields complete. Publishing, channel eligibility and live feed validation are separate steps.</p>}</div>)}</details>:null}
    {edit && product.catalogManaged===true ? <details className="admin-panel"><summary>Catalogue review</summary><p>Proposed website stock: {display(product.websiteStockProposed)}. The opening stock is an estimate; verify it before publishing.</p>{storePublicationIssues(product).length?<ul>{storePublicationIssues(product).map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>Store publication checks complete. Publishing is a separate action.</p>}{publicationIssues(product).filter(issue=>!storePublicationIssues(product).includes(issue)).length ? <><h3>Photo and catalogue improvements</h3><p>A missing photo uses a labelled placeholder in the store. Advertising feeds still need an actual authorized photo and verified brand.</p><ul>{publicationIssues(product).filter(issue=>!storePublicationIssues(product).includes(issue)).map(issue=><li key={issue}>{issue}</li>)}</ul></> : null}</details>:null}

      </div>}
    />
    </div>
  );
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
            <Link href="/admin/orders">Back to orders</Link>
          </>
        }
      />

      <Card title="Receiving branch"><p><strong>{display(record(order.routing).branchName)}</strong> · {display(record(order.routing).areaLabel)}</p>{record(order.routing).needsReview ? <p className="admin-alert admin-alert--danger">Check this address before dispatch. Its area was not recognized; the order remains in the fallback branch and administrator inbox.</p> : null}{admin && !order.deliveryAssignment ? <OrderAreaReview key={id + String(record(order.routing).revision)} orderId={id} revision={Number(record(order.routing).revision ?? 0)} currentArea={typeof record(order.routing).areaId === 'string' ? record(order.routing).areaId as string : null} /> : null}</Card>
      {admin&&order.deliveryAssignment&&branches?<ZoneOrderReassignment orderId={id} branchId={String(record(order.deliveryAssignment).branchId)} branches={branches} />:null}
      {order.channel==='wholesale'?<Card title="Business at time of order" description="Recorded when the order was placed. Later account edits do not change these details."><dl className="admin-dl--cards">{[['businessName','Business'],['typeId','Business type'],['contactName','Contact'],['phone','Business phone'],['tradeLicense','Trade licence'],['taxRegistrationNumber','Tax registration number']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{display(record(order.wholesale)[key!])}</dd></div>)}</dl></Card>:null}
      {stripePayment?.provider==='stripe'?<div className="admin-alert" role="status"><strong>{stripePayment.testMode?'Stripe test payment':'Stripe online payment'} · {display(stripePayment.state)}</strong><p>Only verified paid orders can be fulfilled. Paid-order cancellation requests a refund; cancellation finishes after Stripe confirms it. Dispatched goods are not automatically restocked.</p>{stripePayment.reference?<p>Stripe reference: {stripePayment.reference}</p>:null}{stripePayment.refundIssue?<p>{stripePayment.refundIssue}</p>:null}</div>:null}
      <div className="admin-grid admin-grid--2">
        <Card
          title="Customer and delivery"
          description="Contact and address details supplied at checkout."
        >
          <dl className="admin-dl--cards">
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
            <p className="admin-hint admin-hint--tight">
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
          <dl className="admin-dl--cards">
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
                <dd>{display(customer[key] ?? order[key])}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
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
      <Card title="Order actions">
        {!readyForFulfilment ? <p className="admin-alert">Payment is not ready for fulfilment. Await a verified live payment before confirming, packing or dispatching.</p> : null}
        {status === 'pending' && readyForFulfilment ? <div className="admin-alert"><p>Verify the delivery address and payment status, then accept this order for your pharmacy.</p><Command path={`orders/${id}/confirm`} method="POST" variant="primary">Confirm order</Command></div> : null}
        {status === 'confirmed' && readyForFulfilment ? <div className="admin-alert"><p>Prepare and check every item before marking the order ready for dispatch.</p><Command path={`orders/${id}/pack`} method="POST" variant="primary">Mark as packed</Command></div> : null}
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
        <hr className="admin-divider" />
        <div className="admin-actions">
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
            <hr className="admin-divider" />
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
      {admin && order.schemaVersion===2?<details className="admin-panel"><summary>Contribution reporting · actual costs</summary><OrderCosts key={id} orderId={id}/></details>:null}
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
