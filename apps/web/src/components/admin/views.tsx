import Image from "next/image";
import type { ReactNode } from "react";
import type { AdminRecord } from "../../lib/admin/policy";
import { Command } from "./controls";
import { AdminForm, type Field } from "./forms";
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
  if (edit) fields.push({ name: "expectedStock", label: "Stock at load", type: "hidden", value: display(product?.stock ?? "") });
  if (!edit)
    fields.push(
      { name: "barcode", label: "Barcode", required: true },
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
  return (
    <AdminForm
      path={edit ? `products/${display(product._id)}` : "products"}
      method={edit ? "PUT" : "POST"}
      multipart
      fields={fields}
      label={edit ? "Save product" : "Create product"}
    />
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
        data={rows(order.cartItems)}
        columns={[
          { key: "_id.name", label: "Product" },
          { key: "quantity", label: "Quantity" },
          { key: "_id.price", label: "Unit price (AED)" },
          { key: "lineTotalMinor", label: "Recorded line total (fils)" },
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
            path={`orders/edit/${id}`}
            method="PUT"
            fields={[
              {
                name: "status",
                label: "Order status",
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
  const filename =
    typeof item.image === "string" && /^[A-Za-z0-9_.-]+$/.test(item.image)
      ? item.image
      : "";
  return filename ? (
    <Image
      src={`${origin}/api/${kind}/${kind === "whatsapp" ? "image" : "images"}/${filename}`}
      alt={display(item.name ?? "Uploaded media")}
      width={160}
      height={100}
    />
  ) : null;
}
