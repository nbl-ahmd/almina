import Link from "next/link";
import { notFound } from "next/navigation";
import {
  requireIdentity,
  adminRead,
  adminPushPublicKey,
} from "../../../../../lib/server/admin/gateway";
import {
  canVisit,
  sections,
  type Section,
} from "../../../../../lib/admin/policy";
import { getWebEnvironment } from "../../../../../lib/server/env";
import {
  Table,
  rows,
  record,
  display,
  ProductForm,
  OrderDetail,
  MediaPreview,
} from "../../../../../components/admin/views";
import {
  AdminForm,
  NotificationSettings,
  BulkTemplates,
} from "../../../../../components/admin/forms";
import { Command } from "../../../../../components/admin/controls";
type Query = Record<string, string | string[] | undefined>;
function pagination(section: string, query: Query, length: number) {
  const offset = Number(query.offset ?? 0);
  const link = (value: number) =>
    `/admin/${section}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string")), offset: String(value) })}`;
  return (
    <nav aria-label="Pagination" className="admin-actions">
      {offset > 0 ? (
        <Link href={link(Math.max(0, offset - 25))}>Previous page</Link>
      ) : null}
      {length === 25 ? <Link href={link(offset + 25)}>Next page</Link> : null}
    </nav>
  );
}
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Query>;
}) {
  const user = await requireIdentity();
  const path = (await params).section ?? [];
  const section = (path[0] ?? "dashboard") as Section;
  const detail = path[1];
  const query = await searchParams;
  if (!sections.includes(section) || path.length > 2) notFound();
  if (!canVisit(user.role, section))
    return (
      <>
        <h1>Access denied</h1>
        <p>You do not have permission to use this area.</p>
        <Link href="/admin/orders">View assigned orders</Link>
      </>
    );
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string" && value) qs.set(key, value);
    else if (Array.isArray(value)) notFound();
  }
  if (
    detail &&
    detail !== "new" &&
    !/^[a-f0-9]{24}$/i.test(detail) &&
    !(section === "whatsapp" && /^\+?[0-9]{1,20}$/.test(detail))
  )
    notFound();
  if (detail === "new" && !["products", "categories"].includes(section))
    notFound();
  if (
    detail &&
    !["products", "categories", "orders", "whatsapp"].includes(section)
  )
    notFound();
  if (section === "dashboard") {
    const orders = rows(await adminRead("orders"));
    return (
      <>
        <h1>Dashboard</h1>
        <p>
          Recent orders within your current permissions. Open an order to review
          its details.
        </p>
        <Table
          caption="Recent orders"
          columns={[
            { key: "orderId", label: "Order" },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Received" },
          ]}
          data={orders}
          actions={(order) => (
            <Link href={`/admin/orders/${display(order._id)}`}>
              Open order {display(order.orderId)}
            </Link>
          )}
        />
      </>
    );
  }
  if (section === "products") {
    if (detail && user.role !== "admin")
      return (
        <>
          <h1>Read-only inventory</h1>
          <p>Product changes require an administrator.</p>
          <Link href="/admin/products">Back to products</Link>
        </>
      );
    if (detail) {
      const categories = rows(
        await adminRead("category", new URLSearchParams({ limit: "100" })),
      );
      const selectedCategory =
        typeof query.category === "string" &&
        /^[a-f0-9]{24}$/i.test(query.category)
          ? query.category
          : undefined;
      if (
        selectedCategory &&
        !categories.some((item) => item._id === selectedCategory)
      )
        categories.push(
          record(await adminRead(`category/${selectedCategory}`)),
        );
      const product =
        detail === "new"
          ? undefined
          : record(await adminRead(`products/${detail}`));
      return (
        <>
          <h1>{product ? "Edit product" : "Create product"}</h1>
          <ProductForm
            product={product}
            categories={categories}
            selectedCategory={selectedCategory}
          />
          <Link href="/admin/products">Back to products</Link>
        </>
      );
    }
    const products = rows(
      await adminRead(qs.has("q") ? "products/search" : "products", qs),
    );
    return (
      <>
        <h1>Products</h1>
        {user.role === "admin" ? (
          <Link href="/admin/products/new">Create product</Link>
        ) : (
          <p>Read-only inventory</p>
        )}
        <form className="admin-form">
          <label htmlFor="q">
            Search products
            <input
              id="q"
              name="q"
              defaultValue={display(query.q ?? "")}
              maxLength={80}
            />
          </label>
          <label htmlFor="view">
            Inventory view
            <select
              id="view"
              name="view"
              defaultValue={display(query.view ?? "all")}
            >
              <option value="all">All products</option>
              <option value="sale">On sale</option>
              <option value="outofstock">Out of stock</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <button>Apply filters</button>
        </form>
        <Table
          caption="Product inventory"
          data={products}
          columns={[
            { key: "name", label: "Name" },
            { key: "product_id", label: "Product ID" },
            { key: "price", label: "Price (AED)" },
            { key: "stock", label: "Stock" },
            { key: "disabled", label: "Disabled" },
          ]}
          actions={(item) =>
            user.role !== "admin" ? (
              "Read-only"
            ) : (
              <>
                <Link href={`/admin/products/${display(item._id)}`}>
                  Edit {display(item.name)}
                </Link>
                <Command
                  path={`products/publish/${display(item._id)}`}
                  confirm="Change this product's published status?"
                >
                  Toggle publishing
                </Command>
                <Command
                  path={`products/${display(item._id)}`}
                  method="DELETE"
                  confirm="Permanently delete this product and its media?"
                >
                  Delete product
                </Command>
              </>
            )
          }
        />
        {pagination(section, query, products.length)}
      </>
    );
  }
  if (section === "categories") {
    if (detail && detail !== "new") {
      const item = record(await adminRead(`category/${detail}`));
      return (
        <>
          <h1>Edit category</h1>
          <AdminForm
            path={`category/${detail}`}
            method="PUT"
            multipart
            fields={[
              {
                name: "name",
                label: "Category name",
                required: true,
                value: display(item.name),
              },
              {
                name: "color",
                label: "Color (R, G, B)",
                value: display(item.color),
              },
              {
                name: "image",
                label: "Replace image (optional)",
                type: "file",
              },
            ]}
          />
        </>
      );
    }
    const categories = rows(await adminRead("category", qs));
    return (
      <>
        <h1>Categories</h1>
        <section className="admin-panel">
          <h2>Create category</h2>
          <AdminForm
            path="category"
            multipart
            fields={[
              { name: "name", label: "Category name", required: true },
              {
                name: "image",
                label: "Category image (optional)",
                type: "file",
              },
            ]}
          />
        </section>
        <Table
          caption="Categories"
          data={categories}
          columns={[
            { key: "name", label: "Name" },
            { key: "disabled", label: "Disabled" },
          ]}
          actions={(item) => (
            <>
              <Link href={`/admin/products/new?category=${display(item._id)}`}>
                Create product in {display(item.name)}
              </Link>
              <Link href={`/admin/categories/${display(item._id)}`}>
                Edit {display(item.name)}
              </Link>
              <Command path={`category/disable/${display(item._id)}`}>
                Toggle availability
              </Command>
              <Command
                path={`category/${display(item._id)}`}
                method="DELETE"
                confirm="Permanently delete this category and its media?"
              >
                Delete category
              </Command>
            </>
          )}
        />
        {pagination(section, query, categories.length)}
      </>
    );
  }
  if (section === "banners") {
    const banners = rows(await adminRead("banners", qs));
    return (
      <>
        <h1>Banners</h1>
        <AdminForm
          path="banners"
          multipart
          fields={[
            { name: "name", label: "Banner name", required: true },
            {
              name: "link",
              label: "Destination URL",
              type: "url",
              required: true,
            },
            {
              name: "image",
              label: "Banner image",
              type: "file",
              required: true,
            },
          ]}
        />
        <Table
          caption="Published banners"
          data={banners}
          columns={[
            { key: "name", label: "Name" },
            { key: "link", label: "Destination" },
          ]}
          actions={(item) => (
            <>
              <MediaPreview
                item={item}
                kind="banners"
                origin={getWebEnvironment().LEGACY_API_ORIGIN}
              />
              <Command
                path={`banners/${display(item._id)}`}
                method="DELETE"
                confirm="Delete this banner and its media?"
              >
                Delete banner
              </Command>
            </>
          )}
        />
        {pagination(section, query, banners.length)}
      </>
    );
  }
  if (section === "orders") {
    if (detail)
      return (
        <OrderDetail
          order={record(await adminRead(`orders/${detail}`))}
          admin={user.role === "admin"}
        />
      );
    // Status is a presentation filter; city authorization is always applied by the API.
    const orders = rows(await adminRead("orders", qs));
    return (
      <>
        <h1>Orders</h1>
        <p>
          Only orders permitted by your current role and city assignments are
          shown.
        </p>
        <nav aria-label="Order views" className="admin-actions">
          {[
            "all",
            "pending",
            "confirmed",
            "packed",
            "dispatched",
            "cancelled",
            "refunded",
          ].map((status) => (
            <Link
              key={status}
              href={`/admin/orders${status === "all" ? "" : `?status=${status}`}`}
            >
              {status}
            </Link>
          ))}
        </nav>
        <Table
          caption="Orders"
          data={orders}
          columns={[
            { key: "orderId", label: "Order" },
            { key: "customer.name", label: "Customer" },
            { key: "customer.city", label: "City" },
            { key: "customer.totalAmount", label: "Total (AED)" },
            { key: "status", label: "Status" },
          ]}
          actions={(order) => (
            <Link href={`/admin/orders/${display(order._id)}`}>
              Open order {display(order.orderId)}
            </Link>
          )}
        />
        {pagination(section, query, orders.length)}
      </>
    );
  }
  if (section === "users") {
    const users = rows(await adminRead("auth/users", qs));
    return (
      <>
        <h1>User management</h1>
        <AdminForm
          path="auth/signup"
          label="Create staff account"
          fields={[
            { name: "name", label: "Full name", required: true },
            { name: "username", label: "Username", required: true },
            {
              name: "password",
              label: "Password (at least 12 characters)",
              type: "password",
              required: true,
            },
            {
              name: "role",
              label: "Role",
              options: [
                { value: "user", label: "Staff" },
                { value: "admin", label: "Administrator" },
              ],
            },
            {
              name: "cities",
              label: "Assigned cities",
              hint: "Comma-separated exact city names. Unassigned staff cannot access orders.",
            },
          ]}
        />
        <Table
          caption="Staff accounts"
          data={users}
          columns={[
            { key: "name", label: "Name" },
            { key: "username", label: "Username" },
            { key: "role", label: "Role" },
            { key: "cities", label: "Cities" },
          ]}
          actions={(item) =>
            display(item._id) === user.id ? (
              "Current account"
            ) : (
              <Command
                path={`auth/users/${display(item._id)}`}
                method="DELETE"
                confirm="Delete this staff account and revoke all of its sessions?"
              >
                Delete account
              </Command>
            )
          }
        />
        {users.length === 25 ? (
          <Link href={`/admin/users?before=${display(users.at(-1)?._id)}`}>
            Next page
          </Link>
        ) : null}
      </>
    );
  }
  if (section === "settings") {
    const store = record(await adminRead("store/status"));
    return (
      <>
        <h1>Store settings</h1>
        <p>Current store status: {display(store.status)}</p>
        <Command
          path="store/status"
          body={{ status: store.status !== "open" }}
          confirm="Change store availability?"
        >
          {store.status === "open" ? "Close store" : "Open store"}
        </Command>
      </>
    );
  }
  if (section === "batch")
    return (
      <>
        <h1>Batch product upload</h1>
        <p>
          CSV columns: name, category, price, stock, barcode, vat, featured,
          sale. Boolean columns use TRUE or FALSE. This creates products using
          the existing import workflow.
        </p>
        <AdminForm
          path="batch"
          multipart
          fields={[
            {
              name: "file",
              label: "Product CSV",
              type: "file",
              required: true,
              hint: "Maximum 2 MB. Review the file before importing.",
            },
          ]}
          label="Import products"
          confirm="Create products from this CSV using the existing import workflow?"
        />
      </>
    );
  if (section === "notifications")
    return (
      <>
        <h1>Notification management</h1>
        <p>
          Order updates stream from the server, with a recovery check every 10
          seconds after missed events or a connection loss. The dashboard and
          order lists show committed, authorized records.
        </p>
        <NotificationSettings publicKey={adminPushPublicKey()} />
        <Command
          path="auth/logout-all"
          method="POST"
          confirm="Sign out all sessions for your account?"
        >
          Revoke all my sessions
        </Command>
      </>
    );
  if (section === "whatsapp") {
    if (detail) {
      const conversation = record(
        await adminRead(`whatsapp/messages/${detail}`),
      );
      return (
        <>
          <h1>Conversation with {display(conversation.name)}</h1>
          <Table
            caption="Conversation history"
            data={rows(conversation.messages)}
            columns={[
              { key: "sender", label: "Sender" },
              { key: "content", label: "Message" },
              { key: "timestamp", label: "Sent" },
            ]}
          />
          <AdminForm
            path="whatsapp/text"
            label="Send message"
            fields={[
              {
                name: "recipient",
                label: "Recipient",
                required: true,
                value: detail,
              },
              {
                name: "name",
                label: "Name",
                required: true,
                value: display(conversation.name),
              },
              {
                name: "text",
                label: "Message",
                type: "textarea",
                required: true,
              },
            ]}
          />
        </>
      );
    }
    const [recipients, posters, reports] = await Promise.all([
      adminRead("whatsapp/recipients", qs),
      adminRead("whatsapp/image", qs),
      adminRead("whatsapp/reports", qs),
    ]);
    return (
      <>
        <h1>WhatsApp tools</h1>
        <Table
          caption="Recipients"
          data={rows(recipients)}
          columns={[
            { key: "name", label: "Name" },
            { key: "from", label: "Number" },
            { key: "promotionStatus", label: "Promotions" },
          ]}
          actions={(item) => (
            <Link href={`/admin/whatsapp/${display(item.from)}`}>
              Open conversation
            </Link>
          )}
        />
        {pagination(section, query, rows(recipients).length)}
        <BulkTemplates
          recipients={rows(recipients).map((item) => ({
            from: display(item.from),
            name: display(item.name),
            promotionStatus: display(item.promotionStatus),
          }))}
        />
        <section className="admin-panel">
          <h2>Send template</h2>
          <AdminForm
            path="whatsapp/s"
            label="Send template"
            confirm="Send this template to the entered recipient?"
            fields={[
              { name: "recipient", label: "Recipient number", required: true },
              {
                name: "template",
                label: "Approved template name",
                required: true,
              },
              {
                name: "link",
                label: "Template image URL",
                type: "url",
                required: true,
              },
            ]}
          />
          <h2>Upload poster</h2>
          <AdminForm
            path="whatsapp/image"
            multipart
            fields={[
              {
                name: "image",
                label: "Poster image",
                type: "file",
                required: true,
              },
            ]}
          />
        </section>
        <Table
          caption="Posters"
          data={rows(posters)}
          columns={[{ key: "image", label: "Filename" }]}
          actions={(item) => (
            <>
              <MediaPreview
                item={item}
                kind="whatsapp"
                origin={getWebEnvironment().LEGACY_API_ORIGIN}
              />
              <Command
                path={`whatsapp/image/${display(item._id)}`}
                method="DELETE"
                confirm="Delete this poster and its media?"
              >
                Delete poster
              </Command>
            </>
          )}
        />
        <Table
          caption="Delivery reports"
          data={rows(reports).flatMap((report) => rows(report.broadcast))}
          columns={[
            { key: "recipient", label: "Recipient" },
            { key: "messageStatus", label: "Status" },
            { key: "errorDetails", label: "Details" },
          ]}
        />
      </>
    );
  }
  notFound();
}
