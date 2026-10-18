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
import { orderLinePresentation } from '../../lib/admin/order-lines';
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
export function Table({
  caption,
  columns,
  data,
  actions,
}: {
  caption: string;
  columns: { key: string; label: string }[];
  data: AdminRecord[];
  actions?: (row: AdminRecord) => ReactNode;
}) {
  return (
    <div
      className="admin-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.label}
              </th>
            ))}
            {actions ? <th scope="col">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={display(row._id ?? index)}>
              {columns.map((column) => (
                <td key={column.key}>
                  {display(
                    column.key
                      .split(".")
                      .reduce<unknown>((value, key) => record(value)[key], row),
                  )}
                </td>
              ))}
              {actions ? (
                <td>
                  <div className="admin-actions">{actions(row)}</div>
                </td>
              ) : null}
            </tr>
          ))}
          {!data.length ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)}>
                No records found.
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
  const fields: Field[] = [
    {
      name: "name",
      label: "Product name",
      required: true,
      value: display(product?.name ?? ""),
    },
    {
      name: "price",
      label: "Price (AED)",
      type: "number",
      min: 0,
      step: "0.01",
      required: true,
      value: display(product?.price ?? ""),
    },
    {
      name: "stock",
      label: "Stock quantity",
      type: "number",
      min: 0,
      step: "1",
      required: true,
      value: display(product?.stock ?? ""),
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      value: display(product?.description ?? ""),
    },
    {
      name: "images",
      label: edit ? "Replace images (optional)" : "Product images",
      type: "file",
      multiple: true,
      hint: "Up to five images, 5 MB each.",
    },
  ];
  fields.push(
    {name:'familyKey',label:'Product family key (optional)',value:display(product?.familyKey??''),hint:'Same key for verified size/flavour/pack variants. Clear all family fields to keep this product standalone.'},
    {name:'familyName',label:'Family display name',value:display(product?.familyName??'')},
    {name:'familyBrand',label:'Family brand',value:display(product?.familyBrand??'')},
    {name:'familyForm',label:'Family form / model',value:display(product?.familyForm??''),hint:'Must match across all family members.'},
    {name:'familyStrength',label:'Family strength identity',value:display(product?.familyStrength??''),hint:'Use the verified strength, or not-applicable for non-medicines. Different strengths stay separate.'},
    {name:'variantSize',label:'Variant size',value:display(product?.variantSize??'')},
    {name:'variantFlavour',label:'Variant flavour',value:display(product?.variantFlavour??'')},
    {name:'variantPackSize',label:'Variant pack size',value:display(product?.variantPackSize??''),hint:'Each combination needs its own SKU and stock. Shared barcodes do not establish family membership.'},
  );
  for (const [name,label] of [['brand','Brand'],['manufacturer','Manufacturer'],['gtin','Verified GTIN (optional)'],['mpn','Manufacturer part number (optional)'],['saleUnit','Saleable unit'],['packLabel','Pack / specification'],['productForm','Product form'],['strength','Strength (display only)'],['summary','Short product summary'],['ingredients','Ingredients / materials'],['usage','Usage information'],['warnings','Warnings'],['storage','Storage'],['seoTitle','SEO title override'],['seoDescription','SEO description override'],['imageSource','Image source URL'],['googleProductCategory','Google product category']] as const) fields.push({name,label,value:display(product?.[name]??''),...(['ingredients','usage','warnings','storage'].includes(name)?{type:'textarea'}:{})});
  for (const [name,label,options] of [
    ['productType','Product classification',['unreviewed','general','otc','prescription']],
    ['condition','Item condition',['new','used','refurbished']],
    ['identifierStatus','Manufacturer identifier status',['unknown','assigned','not-assigned']],
    ['imageRights','Image usage permission',['unreviewed','authorized']],
  ] as const) fields.push({name,label,value:display(product?.[name]??''),options:[{value:'',label:'Not reviewed'},...options.map(value=>({value,label:value}))]});
  for (const [name,label] of [['contentReviewed','Content and exact image match reviewed'],['stockVerified','Physical stock verified'],['googleApproved','Approved for Google catalog export'],['metaApproved','Approved for Meta catalog export']] as const) fields.push({name,label,value:product?.[name]===true?'true':'false',options:[{value:'false',label:'No — pending review'},{value:'true',label:'Yes — reviewed'}]});
  fields.push({ name: "salePrice", label: "Sale price (AED, optional)", type: "number", min: 0, step: "0.01", value: product?.salePrice == null ? "" : display(product.salePrice), hint: "Required when sale is enabled; cannot exceed the regular price." });
  if (edit) fields.push({ name: "sale", label: "Sale", value: product?.sale === true ? "true" : "false", options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }] });
  if (edit) fields.push(
    { name: "expectedStock", label: "Stock at load", type: "hidden", value: display(product?.stock ?? "") },
    { name: "inventoryKey", label: "Adjustment receipt", type: "hidden", value: randomUUID() },
    { name: "stockReason", label: "Stock adjustment reason", required: true, hint: "Record the physical count or correction. A stale stock value requires reloading." },
  );
  if (!edit)
    fields.push(
      { name: "barcode", label: "Barcode (optional)", hint: "An ERP barcode is not automatically a verified GTIN." },
      {
        name: "category",
        label: "Category",
        required: true,
        value: selectedCategory,
        options: categories.map((category) => ({
          value: display(category._id),
          label: display(category.name),
        })),
      },
      ...["vat", "sale", "featured"].map((name) => ({
        name,
        label:
          name === "vat"
            ? "VAT applicable"
            : name.charAt(0).toUpperCase() + name.slice(1),
        options: [
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
      })),
    );
  const readinessProduct = edit ? readProduct({...product,disabled:false,category:typeof product.category==='object'?product.category:categories.find(category=>String(category._id)===String(product.category))}) : null;
  return (
    <>
    {readinessProduct ? <details className="admin-panel"><summary>Google / Meta catalog readiness</summary>{(['google','meta'] as const).map(channel=><div key={channel}><h3>{channel==='google'?'Google':'Meta'}</h3>{feedIssues(readinessProduct,channel,productImages(readinessProduct).filter(image=>image.startsWith('https://'))).length?<ul>{feedIssues(readinessProduct,channel,productImages(readinessProduct).filter(image=>image.startsWith('https://'))).map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>Product fields complete. Publishing, channel eligibility and live feed validation are separate steps.</p>}</div>)}</details>:null}
    {edit && product.catalogManaged===true ? <section className="admin-panel"><h2>Catalog review</h2><p>Proposed website stock: {display(product.websiteStockProposed)}. The opening stock is an estimate; verify it before publishing.</p>{storePublicationIssues(product).length?<ul>{storePublicationIssues(product).map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>Store publication checks complete. Publishing is a separate action.</p>}{publicationIssues(product).filter(issue=>!storePublicationIssues(product).includes(issue)).length ? <><h3>Photo and catalogue improvements</h3><p>A missing photo uses a labelled placeholder in the store. Advertising feeds still need an actual authorized photo and verified brand.</p><ul>{publicationIssues(product).filter(issue=>!storePublicationIssues(product).includes(issue)).map(issue=><li key={issue}>{issue}</li>)}</ul></> : null}</section>:null}
    <AdminForm
      path={edit ? `products/${display(product._id)}` : "products"}
      method={edit ? "PUT" : "POST"}
      multipart
      fields={fields}
      label={edit ? "Save product" : "Create product"}
    />
    {edit ? <MediaPreview item={product} kind="products" origin={getWebEnvironment().LEGACY_API_ORIGIN} /> : null}
    {edit ? <CloudinaryUpload productId={display(product._id)} revision={Number(product.mediaRevision ?? 0)} /> : null}
    </>
  );
}
export function OrderDetail({
  order,
  admin,
}: {
  order: AdminRecord;
  admin: boolean;
}) {
  const customer = record(order.customer);
  const id = display(order._id);
  return (
    <>
      <h1>Order {display(order.orderId)}</h1>
      <p>Status: {display(order.status)}</p>
      <section className="admin-panel">
        <h2>Customer and delivery</h2>
        <dl>
          {[
            "name",
            "mobile",
            "email",
            "buildingname",
            "flatno",
            "address",
            "city",
            "emirate",
            "note",
            "payment",
            "totalSalePrice",
            "deliveryFee",
            "totalAmount",
          ].map((key) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{display(customer[key])}</dd>
            </div>
          ))}
        </dl>
        {typeof customer.maplink === "string" &&
        /^https:\/\//.test(customer.maplink) ? (
          <a href={customer.maplink} rel="noreferrer" target="_blank">
            Delivery map
          </a>
        ) : null}
      </section>
      <Table
        caption={
          order.snapshotAvailable
            ? "Recorded order lines"
            : "Historical lines (current product labels; original snapshots unavailable)"
        }
        data={rows(order.cartItems).map(line => orderLinePresentation(line, order.snapshotAvailable === true))}
        columns={[
          { key: "_id.name", label: "Product" },
          { key: "variantLabel", label: "Selected option" },
          { key: "quantity", label: "Quantity" },
          { key: "displayedUnitPrice", label: order.snapshotAvailable ? "Charged unit price (AED)" : "Current unit price (AED)" },
          { key: "recordedLineTotal", label: "Recorded line total (AED)" },
        ]}
      />
      <section className="admin-panel">
        <h2>Order actions</h2>
        <AdminForm
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
            },
          ]}
          label="Dispatch order"
          confirm="Dispatch this order with the entered billing details?"
        />
        <Command
          path={`orders/cancel/${id}`}
          body={{ cancelled: true }}
          confirm="Cancel this order? The server will apply the existing cancellation and restocking policy."
        >
          Cancel order
        </Command>
        {admin ? (
          <AdminForm
            key={`${id}-${display(order.status)}`}
            path={`orders/edit/${id}`}
            method="PUT"
            fields={[
              {
                name: "status",
                label: "Order status",
                value: display(order.status),
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
            confirm="Apply this order status change?"
            label="Update status"
          />
        ) : null}
      </section>
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
