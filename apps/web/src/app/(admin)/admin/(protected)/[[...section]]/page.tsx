import {MarketingManager} from '../../../../../components/admin/marketing-manager';
import {headers} from 'next/headers';
import type { AdminRecord } from '../../../../../lib/admin/policy';
import { NeedsAction } from '../../../../../components/admin/needs-action';
import { CatalogImport } from '../../../../../components/admin/catalog-import';
import { RecoveryImport } from "../../../../../components/admin/recovery-import";
import { operationsSnapshotSchema } from '@almina/contracts';
import { OperationsView } from '../../../../../components/admin/operations-view';
import { AdminDashboard } from '../../../../../components/admin/dashboard';
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
  Badge,
  Card,
  PageHeader,
  orderStatusTone,
} from '../../../../../components/admin/ui';
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
const formPanel = 'admin-form-panel';
function pagination(section: string, query: Query, length: number) {
  const offset = Number(query.offset ?? 0);
  const link = (value: number) =>
    `/admin/${section}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string")), offset: String(value) })}`;
  return (
    <nav aria-label="Pagination" className="admin-pagination">
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
        <PageHeader
          eyebrow="Restricted"
          title="Access denied"
          description="You do not have permission to use this area. Ask an administrator if you need access."
          actions={<Link href="/admin/orders">View assigned orders</Link>}
        />
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
  if(section==='marketing')return <MarketingManager admin={user.role==='admin'} nonce={(await headers()).get('x-nonce')??''}/>;
  if (section === 'operations') {
    const snapshot = operationsSnapshotSchema.parse(await adminRead('operations'));
    return (
      <>
        <PageHeader
          eyebrow="Overview"
          title="Operations"
          description="Bounded, per-process measurements. Collect every deployed API instance before making a release decision."
        />
        <OperationsView snapshot={snapshot} />
      </>
    );
  }
  if (section === 'needs-action') {
    // Fixed page size keeps count labels and navigation consistent.
    qs.set('limit', '25');
    return <NeedsAction data={await adminRead('products/needs-action', qs)}
      {...(typeof query.q === 'string' ? { q: query.q } : {})}
      {...(typeof query.reason === 'string' ? { reason: query.reason } : {})}
      {...(typeof query.status === 'string' ? { status: query.status } : {})} />;
  }
  if (section === "dashboard") {
    return <AdminDashboard user={user} />;
  }
  if (section === "products") {
    if (detail && user.role !== "admin")
      return (
        <>
          <PageHeader
            eyebrow="Catalogue"
            title="Read-only inventory"
            description="Product changes require an administrator."
            actions={<Link href="/admin/products">Back to products</Link>}
          />
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
          <PageHeader
            eyebrow="Catalogue"
            title={product ? "Edit product" : "Create product"}
            description={
              product
                ? `Update content, stock and channel readiness for ${display(product.name)}.`
                : "Add a product with reviewed content and opening stock."
            }
            actions={
              <>
                <Link href="/admin/products">Back to products</Link>
                {product ? (
                  <Link href="/admin/needs-action">Back to Needs action</Link>
                ) : null}
              </>
            }
          />
          <ProductForm
            product={product}
            categories={categories}
            selectedCategory={selectedCategory}
          />
        </>
      );
    }
    const products = rows(
      await adminRead(qs.has("q") ? "products/search" : "products", qs),
    );
    const view = typeof query.view === "string" ? query.view : "all";
    return (
      <>
        <PageHeader
          eyebrow="Catalogue"
          title="Products"
          description="Search inventory, review stock and publish changes. Staff accounts have read-only access."
          actions={
            <>
              {user.role === "admin" ? (
                <Link
                  className="admin-btn--primary"
                  href="/admin/products/new"
                >
                  Create product
                </Link>
              ) : (
                <Badge tone="neutral">Read-only inventory</Badge>
              )}
              {user.role === 'admin' ? (
                <Link href="/admin/needs-action">Review needs action</Link>
              ) : null}
            </>
          }
        />
        {user.role === 'admin' ? (
          <p className="admin-hint admin-hint--tight">
            <Link href="/admin/needs-action?status=all&reason=missing-photo">
              Missing photos
            </Link>{' '}
            ·{' '}
            <Link href="/admin/needs-action?status=drafts">
              Unpublished drafts
            </Link>
          </p>
        ) : null}
        <form className={formPanel} role="search">
          <label htmlFor="q">
            Search products
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={display(query.q ?? "")}
              maxLength={80}
              placeholder="Product name or PD number"
            />
          </label>
          <label htmlFor="view">
            Inventory view
            <select
              id="view"
              name="view"
              defaultValue={display(view)}
            >
              <option value="all">All products</option>
              <option value="sale">On sale</option>
              <option value="outofstock">Out of stock</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <div className="admin-actions">
            <button>Apply filters</button>
            <Link className="admin-btn--secondary" href="/admin/products">
              Reset
            </Link>
          </div>
        </form>
        <Table
          caption="Product inventory"
          data={products}
          columns={[
            { key: "name", label: "Name" },
            { key: "product_id", label: "Product ID" },
            { key: "price", label: "Price (AED)", align: "end" },
            {
              key: "stock",
              label: "Stock",
              align: "end",
              render: (item) => {
                const stock = Number(item.stock);
                return Number.isFinite(stock) && stock <= 0 ? (
                  <Badge tone="danger">Out of stock</Badge>
                ) : (
                  display(item.stock)
                );
              },
            },
            {
              key: "disabled",
              label: "Status",
              render: (item) =>
                item.disabled === true ? (
                  <Badge tone="neutral">Disabled</Badge>
                ) : (
                  <Badge tone="success" dot>
                    Live
                  </Badge>
                ),
            },
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
                  variant="danger"
                  confirm="Archive this product while preserving history and images?"
                >
                  Archive product
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
          <PageHeader
            eyebrow="Catalogue"
            title="Edit category"
            description={`Update the label, colour and image for ${display(item.name)}.`}
            actions={<Link href="/admin/categories">Back to categories</Link>}
          />
          <Card>
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
                  section: "Category",
                  sectionDescription: "How this category is labelled in navigation and product filters.",
                },
                {
                  name: "color",
                  label: "Color (R, G, B)",
                  value: display(item.color),
                  section: "Category",
                  placeholder: "13, 107, 87",
                  hint: "Three numbers from 0 to 255, separated by commas.",
                },
                {
                  name: "image",
                  label: "Replace image (optional)",
                  type: "file",
                  section: "Media",
                  hint: "Square artwork works best. Leave empty to keep the current image.",
                },
              ]}
            />
          </Card>
        </>
      );
    }
    const categories = rows(await adminRead("category", qs));
    return (
      <>
        <PageHeader
          eyebrow="Catalogue"
          title="Categories"
          description="Organise the storefront into browsable groups."
        />
        <Card title="Create category">
          <AdminForm
            path="category"
            multipart
            fields={[
              {
                name: "name",
                label: "Category name",
                required: true,
                section: "Category",
                sectionDescription: "Create the label first; products can be assigned immediately.",
              },
              {
                name: "image",
                label: "Category image (optional)",
                type: "file",
                section: "Media",
                hint: "Square artwork works best. The image is shown in category navigation.",
              },
            ]}
          />
        </Card>
        <Table
          caption="Categories"
          data={categories}
          columns={[
            { key: "name", label: "Name" },
            {
              key: "disabled",
              label: "Availability",
              render: (item) =>
                item.disabled === true ? (
                  <Badge tone="neutral">Hidden</Badge>
                ) : (
                  <Badge tone="success" dot>
                    Available
                  </Badge>
                ),
            },
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
                variant="danger"
                confirm="Permanently delete this category and its media?"
              >
                Archive category
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
        <PageHeader
          eyebrow="Catalogue"
          title="Banners"
          description="Upload event, offer and campaign artwork for the homepage carousel. Newest banners appear first."
        />
        <Card title="Add banner">
          <AdminForm
            path="banners"
            multipart
            fields={[
              {
                name: "name",
                label: "Banner name",
                required: true,
                section: "Banner",
                sectionDescription: "Internal name used to find this artwork later.",
              },
              {
                name: "link",
                label: "Destination URL or storefront path",
                type: "text",
                hint: "Use a storefront path such as /collections/skin-essentials or a full HTTPS URL.",
                required: true,
                section: "Banner",
              },
              {
                name: "image",
                label: "Banner image",
                type: "file",
                hint: "Use wide artwork, for example 1600 × 600 pixels. Keep text readable on mobile. The full image is shown without cropping; the newest eight banners appear in the homepage carousel.",
                required: true,
                section: "Artwork",
              },
            ]}
          />
        </Card>
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
                variant="danger"
                confirm="Archive this banner and preserve its images?"
              >
                Archive banner
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
    const active = typeof query.status === "string" ? query.status : "all";
    return (
      <>
        <PageHeader
          eyebrow="Commerce"
          title="Orders"
          description="Only orders permitted by your current role and city assignments are shown."
        />
        <nav aria-label="Order status views" className="admin-segmented">
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
              aria-current={active === status ? "page" : undefined}
            >
              {status}
            </Link>
          ))}
        </nav>
        <Table
          caption="Orders"
          data={orders}
          empty={{
            title: "No orders in this view",
            description:
              "Try another status filter, or wait for new orders to arrive.",
          }}
          columns={[
            { key: "orderId", label: "Order" },
            { key: "customer.name", label: "Customer" },
            { key: "customer.city", label: "City" },
            {
              key: "customer.totalAmount",
              label: "Total (AED)",
              align: "end",
            },
            {
              key: "status",
              label: "Status",
              render: (order) => {
                const status = display(order.status);
                return (
                  <Badge tone={orderStatusTone(status)} dot>
                    {status}
                  </Badge>
                );
              },
            },
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
        <PageHeader
          eyebrow="Administration"
          title="User management"
          description="Provision staff accounts and assign the cities they may serve."
        />
        <Card title="Create staff account">
          <AdminForm
            path="auth/signup"
            label="Create staff account"
            fields={[
              {
                name: "name",
                label: "Full name",
                required: true,
                section: "Account",
                sectionDescription: "The person who will sign in to administration.",
              },
              {
                name: "username",
                label: "Username",
                required: true,
                section: "Account",
              },
              {
                name: "password",
                label: "Password (at least 12 characters)",
                type: "password",
                required: true,
                section: "Account",
              },
              {
                name: "role",
                label: "Role",
                options: [
                  { value: "user", label: "Staff" },
                  { value: "admin", label: "Administrator" },
                ],
                section: "Access",
                sectionDescription: "Staff see orders for their cities only. Administrators manage the full store.",
              },
              {
                name: "cities",
                label: "Assigned cities",
                kind: "tags",
                placeholder: "City A, City B",
                hint: "Separate exact city names with commas. Unassigned staff cannot access orders.",
                section: "Access",
              },
            ]}
          />
        </Card>
        <Table
          caption="Staff accounts"
          data={users}
          columns={[
            { key: "name", label: "Name" },
            { key: "username", label: "Username" },
            {
              key: "role",
              label: "Role",
              render: (item) => (
                <Badge tone={item.role === "admin" ? "brand" : "neutral"}>
                  {item.role === "admin" ? "Administrator" : "Staff"}
                </Badge>
              ),
            },
            { key: "cities", label: "Cities" },
          ]}
          actions={(item) =>
            display(item._id) === user.id ? (
              "Current account"
            ) : (
              <Command
                path={`auth/users/${display(item._id)}`}
                method="DELETE"
                variant="danger"
                confirm="Deactivate this staff account and revoke all of its sessions? The account history will be retained."
              >
                Deactivate account
              </Command>
            )
          }
        />
        {users.length === 25 ? (
          <nav className="admin-pagination" aria-label="Pagination">
            <Link href={`/admin/users?before=${display(users.at(-1)?._id)}`}>
              Next page
            </Link>
          </nav>
        ) : null}
      </>
    );
  }
  if (section === "settings") {
    const store = record(await adminRead("store/status"));
    const open = store.status === "open";
    return (
      <>
        <PageHeader
          eyebrow="Administration"
          title="Store settings"
          description="Control storefront availability. Closing the store stops new checkout activity."
        />
        <Card title="Storefront availability">
          <p className="admin-actions">
            <span>Current status</span>
            <Badge tone={open ? "success" : "danger"} dot>
              {display(store.status)}
            </Badge>
          </p>
          <Command
            path="store/status"
            body={{ status: store.status !== "open" }}
            variant={open ? "danger" : "primary"}
            confirm="Change store availability?"
          >
            {open ? "Close store" : "Open store"}
          </Command>
        </Card>
      </>
    );
  }
  if (section === 'catalog-import') {
    const categories: AdminRecord[]=[];
    for(let offset=0;offset<=10000;offset+=100){const page=rows(await adminRead('category',new URLSearchParams({limit:'100',offset:String(offset)})));categories.push(...page);if(page.length<100)break;if(offset===10000)throw new Error('Category mapping exceeds supported bounds');}
    return (
      <>
        <PageHeader
          eyebrow="Catalogue"
          title="Catalog import"
          description="Review prepared ERP files and import them as unpublished drafts."
          actions={<Link href="/admin/products">Review imported products</Link>}
        />
        <CatalogImport categories={categories.map(category=>({id:String(category._id),name:String(category.name)}))} />
      </>
    );
  }
  if (section === "batch")
    return (
      <>
        <PageHeader
          eyebrow="Administration"
          title="Product recovery"
          description="Restore reviewed product drafts without overwriting existing records."
        />
        <RecoveryImport />
      </>
    );
  if (section === "notifications")
    return (
      <>
        <PageHeader
          eyebrow="Engagement"
          title="Notification management"
          description="Order updates stream from the server, with a recovery check every 10 seconds after missed events or a connection loss."
        />
        <Card title="Push notifications">
          <p>
            The dashboard and order lists always show committed, authorized
            records. Push is an additional foreground aid.
          </p>
          <NotificationSettings publicKey={adminPushPublicKey()} />
        </Card>
        <Card title="Sessions">
          <p>Sign out every device that is signed in to your account.</p>
          <Command
            path="auth/logout-all"
            method="POST"
            variant="danger"
            confirm="Sign out all sessions for your account?"
          >
            Revoke all my sessions
          </Command>
        </Card>
      </>
    );
  if (section === "whatsapp") {
    if (detail) {
      const conversation = record(
        await adminRead(`whatsapp/messages/${detail}`, qs),
      );
      return (
        <>
          <PageHeader
            eyebrow="Engagement"
            title={`Conversation with ${display(conversation.name)}`}
            description={
              conversation.messageCount !== undefined
                ? `Showing a page of ${display(conversation.messageCount)} stored messages, in chronological order. The first page contains the most recent messages.`
                : "Stored messages, in chronological order."
            }
            actions={<Link href="/admin/whatsapp">Back to WhatsApp</Link>}
          />
          <Table
            caption="Conversation history"
            data={rows(conversation.messages)}
            columns={[
              { key: "sender", label: "Sender" },
              { key: "content", label: "Message" },
              { key: "timestamp", label: "Sent" },
            ]}
          />
          <nav aria-label="Conversation history pages" className="admin-pagination">
            {Number(conversation.messageOffset) > 0 ? <Link href={`/admin/whatsapp/${detail}?${new URLSearchParams({ limit: String(query.limit ?? 25), offset: String(Math.max(0, Number(conversation.messageOffset) - Number(query.limit ?? 25))) })}`}>Newer messages</Link> : null}
            {conversation.hasOlderMessages === true ? <Link href={`/admin/whatsapp/${detail}?${new URLSearchParams({ limit: String(query.limit ?? 25), offset: String(Number(conversation.messageOffset ?? 0) + Number(query.limit ?? 25)) })}`}>Older messages</Link> : null}
          </nav>
          <Card title="Send message">
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
          </Card>
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
        <PageHeader
          eyebrow="Engagement"
          title="WhatsApp tools"
          description="Recipients, approved templates, posters and delivery reports."
        />
        <Table
          caption="Recipients"
          data={rows(recipients)}
          columns={[
            { key: "name", label: "Name" },
            { key: "from", label: "Number" },
            {
              key: "promotionStatus",
              label: "Promotions",
              render: (item) =>
                item.promotionStatus === "Stop promotions" ||
                item.promotionStatus === "false" ? (
                  <Badge tone="neutral">Opted out</Badge>
                ) : (
                  <Badge tone="success" dot>
                    Allowed
                  </Badge>
                ),
            },
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
        <div className="admin-grid admin-grid--2">
          <Card title="Send template">
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
          </Card>
          <Card title="Upload poster">
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
          </Card>
        </div>
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
                variant="danger"
                confirm="Archive this poster and preserve its images?"
              >
                Archive poster
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
