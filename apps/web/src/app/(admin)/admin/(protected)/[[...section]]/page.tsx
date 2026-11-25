import { NotificationCenter } from '../../../../../components/admin/notification-center';
import { BranchWorkspaceView } from '../../../../../components/admin/branch-workspace';
import type { BranchWorkspace } from '@almina/contracts';
import { cloudinaryImage } from '@almina/contracts';
import { StaffBranchAssignment } from '../../../../../components/admin/order-routing';
import { reportDays } from '../../../../../lib/admin/dashboard';
import { RowActions } from '../../../../../components/admin/row-actions';
import { ImageReviewManager } from '../../../../../components/admin/image-review-manager';
import { imageReviewListResponseSchema } from '@almina/contracts';
import {MarketingManager} from '../../../../../components/admin/marketing-manager';
import {headers} from 'next/headers';
import type { AdminRecord } from '../../../../../lib/admin/policy';
import { NeedsAction } from '../../../../../components/admin/needs-action';
import { CatalogImport } from '../../../../../components/admin/catalog-import';
import { RecoveryImport } from "../../../../../components/admin/recovery-import";
import { operationsSnapshotSchema } from '@almina/contracts';
import { OperationsView } from '../../../../../components/admin/operations-view';
import { AdminDashboard } from '../../../../../components/admin/dashboard';
import Link from '../../../../../components/app-link';
import { redirect, notFound } from "next/navigation";
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
  Callout,
  Card,
  CreatePanel,
  FilterChips,
  PageHeader,
  Pager,
  buttonVariants,
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
import { ProductsTable } from '../../../../../components/admin/products-table';
import { OrdersTable } from '../../../../../components/admin/orders-table';
type Query = Record<string, string | string[] | undefined>;
/** Thumbnail URL for the product list: catalogue CDN first, legacy media origin as the fallback. */
function thumbnail(item: AdminRecord): string | null {
  const cdn = Array.isArray(item.cloudinaryImages) ? cloudinaryImage(item.cloudinaryImages[0], getWebEnvironment().CLOUDINARY_CLOUD_NAME) : null;
  if (cdn) return cdn;
  const first = item.image ?? (Array.isArray(item.images) ? item.images[0] : undefined);
  return typeof first === 'string' && /^[A-Za-z0-9_.-]+$/.test(first) ? `${getWebEnvironment().LEGACY_API_ORIGIN}/api/products/images/${first}` : null;
}
const PAGE_SIZE = 25;
/** Lists request one extra row so "Next" only appears when another page exists. */
function lookahead(qs: URLSearchParams) {
  const next = new URLSearchParams(qs);
  next.set('limit', String(PAGE_SIZE + 1));
  return next;
}
function pageOf<T>(items: T[]) {
  return { items: items.slice(0, PAGE_SIZE), more: items.length > PAGE_SIZE };
}
function pagination(section: string, query: Query, shown: number, more: boolean) {
  const base = Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  return <Pager count={shown} offset={Number(query.offset ?? 0) || 0} more={more} hrefFor={(value) => `/admin/${section}?${new URLSearchParams({ ...base, offset: String(value) })}`} />;
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
  if (!path.length && user.accountType === "branch") redirect("/admin/orders?status=pending");
  const section = (path[0] ?? "dashboard") as Section;
  const detail = path[1];
  const query = await searchParams;
  if (!sections.includes(section) || path.length > 2) notFound();
  if (!canVisit(user.role, section, user.accountType))
    return (
      <>
        <PageHeader
          title="Access denied"
          description="You do not have permission to use this area. Ask an administrator if you need access."
          actions={<Link className={buttonVariants({ variant: "outline" })} href="/admin/orders">View assigned orders</Link>}
        />
      </>
    );
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // Presentation-only confirmation from the product editor; never sent upstream.
    if (key === "saved") continue;
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
  if (section === 'image-review') return <ImageReviewManager initial={imageReviewListResponseSchema.parse(await adminRead('image-review', qs))} admin={user.role === 'admin'} />;
  if (section === 'operations') {
    const snapshot = operationsSnapshotSchema.parse(await adminRead('operations'));
    return (
      <>
        <PageHeader
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
    return <AdminDashboard user={user} days={reportDays(query.days)} />;
  }
  if (section === "products") {
    if (detail && user.role !== "admin")
      return (
        <>
          <PageHeader
            title="Read-only inventory"
            description="Product changes require an administrator."
            actions={<Link className={buttonVariants({ variant: "outline" })} href="/admin/products">Back to products</Link>}
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
      // Neighbours in the current catalogue order, so many products can be edited without returning to the list.
      let previousHref: string | undefined, nextHref: string | undefined, position = '';
      if (product) {
        const neighbours = rows(await adminRead("products", new URLSearchParams({ limit: "100" })).catch(() => []));
        const index = neighbours.findIndex(item => display(item._id) === detail);
        if (index >= 0) {
          if (index > 0) previousHref = `/admin/products/${display(neighbours[index - 1]!._id)}`;
          if (index < neighbours.length - 1) nextHref = `/admin/products/${display(neighbours[index + 1]!._id)}`;
          position = `${index + 1} of ${neighbours.length >= 100 ? '100+' : neighbours.length}`;
        }
      }
      return (
        <>
          <PageHeader
            title={product ? "Edit product" : "Create product"}
            description={
              product
                ? `Update content, stock and channel readiness for ${display(product.name)}.`
                : "Add a product with reviewed content and opening stock."
            }
            actions={
              <>
                {position ? <span className="text-xs text-mute" aria-live="polite">{position}</span> : null}
                {previousHref ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={previousHref} aria-label="Previous product">‹ Previous</Link> : null}
                {nextHref ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={nextHref} aria-label="Next product">Next ›</Link> : null}
                <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/admin/products">All products</Link>
              </>
            }
          />
          <ProductForm
            product={product}
            categories={categories}
            selectedCategory={selectedCategory}
            nextHref={nextHref}
          />
        </>
      );
    }
    const productPage = pageOf(rows(
      await adminRead(qs.has("q") ? "products/search" : "products", lookahead(qs)),
    ));
    const products = productPage.items;
    const view = typeof query.view === "string" ? query.view : "all";
    return (
      <>
        <PageHeader
          title="Products"
          description="Search inventory, review stock and publish changes. Staff accounts have read-only access."
          actions={
            <>
              {user.role === "admin" ? (
                <Link
                  className={buttonVariants({ variant: "primary" })}
                  href="/admin/products/new"
                >
                  Add product
                </Link>
              ) : (
                <Badge tone="neutral">Read-only inventory</Badge>
              )}
              {user.role === 'admin' ? (
                <Link className={buttonVariants({ variant: "outline" })} href="/admin/needs-action">Review needs action</Link>
              ) : null}
            </>
          }
        />
        {query.saved === 'published' || query.saved === 'draft' ? (
          <Callout tone="success" role="status">
            <p><strong>{query.saved === 'published' ? 'Product published.' : 'Draft saved.'}</strong> {query.saved === 'published' ? 'It is now visible in the storefront.' : 'It stays hidden from customers until you publish it.'}</p>
            <Link href="/admin/products/new">Add another product</Link>
          </Callout>
        ) : null}
        <FilterChips
          label="Inventory views"
          items={[['all', 'All products'], ['sale', 'On sale'], ['outofstock', 'Out of stock'], ['disabled', 'Disabled']].map(([value, label]) => {
            const params = new URLSearchParams();
            if (typeof query.q === 'string' && query.q) params.set('q', query.q);
            if (value !== 'all') params.set('view', value!);
            return { label: label!, href: `/admin/products${params.size ? `?${params}` : ''}`, active: view === value };
          })}
        />
        <form role="search" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-surface p-3 border border-line">
          <label htmlFor="q" className="sr-only">Search products</label>
          <input id="q" name="q" type="search" defaultValue={display(query.q ?? "")} maxLength={80} placeholder="Search by product name or PD number"
            className="h-11 min-w-0 flex-1 basis-64 rounded-lg border-0 bg-fill px-5 text-sm text-ink outline-none placeholder:text-mute focus:bg-white focus:ring-2 focus:ring-ink" />
          <input type="hidden" name="view" value={view} />
          <button className={buttonVariants({ variant: "dark" })}>Search</button>
          <Link className={buttonVariants({ variant: "outline" })} href="/admin/products">Reset</Link>
        </form>
        <ProductsTable admin={user.role === "admin"} products={products.map(item => ({ _id: display(item._id), name: display(item.name), product_id: display(item.product_id), category: display(record(item.category).name), image: thumbnail(item), price: display(item.price), salePrice: item.sale === true && item.salePrice ? display(item.salePrice) : null, stock: display(item.stock), disabled: item.disabled === true }))} />
        {pagination(section, query, products.length, productPage.more)}
      </>
    );
  }
  if (section === "categories") {
    if (detail && detail !== "new") {
      const item = record(await adminRead(`category/${detail}`));
      return (
        <>
          <PageHeader
            title="Edit category"
            description={`Update the label, colour and image for ${display(item.name)}.`}
            actions={<Link className={buttonVariants({ variant: "outline" })} href="/admin/categories">Back to categories</Link>}
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
    const categoryPage = pageOf(rows(await adminRead("category", lookahead(qs))));
    const categories = categoryPage.items;
    return (
      <>
        <PageHeader
          title="Categories"
          description="Organise the storefront into browsable groups."
        />
        <CreatePanel summary="Create category" open={detail === "new"}>
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
        </CreatePanel>
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
            <RowActions label={`Actions for ${display(item.name)}`}>
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
                confirm="Archive this category? Its products, history and media will be retained."
              >
                Archive category
              </Command>
            </RowActions>
          )}
        />
        {pagination(section, query, categories.length, categoryPage.more)}
      </>
    );
  }
  if (section === "banners") {
    const bannerPage = pageOf(rows(await adminRead("banners", lookahead(qs))));
    const banners = bannerPage.items;
    return (
      <>
        <PageHeader
          title="Banners"
          description="Upload event, offer and campaign artwork for the homepage carousel. Newest banners appear first."
        />
        <CreatePanel summary="Add banner">
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
                name: "locale",
                label: "Show on",
                options: [
                  { value: "all", label: "English and Arabic" },
                  { value: "en", label: "English storefront only" },
                  { value: "ar", label: "Arabic storefront only" },
                ],
                hint: "For different Arabic artwork, add one banner for English and another for Arabic.",
                section: "Banner",
              },
              {
                name: "image",
                label: "Banner image",
                type: "file",
                hint: "Desktop artwork, 1600 × 500 pixels. The image is shown whole inside a fixed frame (never cropped); the newest eight banners appear in the homepage carousel.",
                required: true,
                section: "Artwork",
              },
              {
                name: "mobileImage",
                label: "Phone banner image (optional)",
                type: "file",
                hint: "Phone artwork, 800 × 400 pixels, with larger text. Leave empty to show the desktop image on phones too.",
                section: "Artwork",
              },
            ]}
          />
        </Card>
        </CreatePanel>
        <Table
          caption="Published banners"
          data={banners}
          columns={[
            { key: "name", label: "Name" },
            { key: "link", label: "Destination" },
            { key: "locale", label: "Language (blank = both)" },
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
        {pagination(section, query, banners.length, bannerPage.more)}
      </>
    );
  }
  if(section==='branches'){const setup=await adminRead('auth/branches');return <><PageHeader title="Branches" description="Create a branch login and draw its delivery area. Orders follow the saved polygon." /><BranchWorkspaceView initial={setup as BranchWorkspace} /></>;}
  if(section==='delivery-zones')redirect('/admin/branches');
  if (section === "orders") {
    if (detail)
      { const order=record(await adminRead(`orders/${detail}`));const setup=user.role==='admin'&&order.deliveryAssignment?record(await adminRead('auth/order-routing')):null;return <OrderDetail order={order} admin={user.role==='admin'} branches={setup?.branches as Parameters<typeof OrderDetail>[0]['branches']} />; }
    // Status is a presentation filter; city authorization is always applied by the API.
    const orderPage = pageOf(rows(await adminRead("orders", lookahead(qs))));
    const orders = orderPage.items;
        const active = typeof query.status === "string" ? query.status : "all";
    return (
      <>
        <PageHeader
          title="Orders"
          description="Review incoming orders, verify delivery details and confirm fulfilment. Administrators see every order; branch staff see their assigned queue."
        />
        <FilterChips
          label="Order status views"
          items={["all", "pending", "confirmed", "packed", "dispatched", "cancelled", "refunded"].map((status) => ({
            label: status.charAt(0).toUpperCase() + status.slice(1), href: `/admin/orders${status === "all" ? "" : `?status=${status}`}`, active: active === status,
          }))}
        />
        <OrdersTable orders={orders.map(order => ({ _id: display(order._id), orderId: display(order.orderId), status: display(order.status), customer: { name: display(record(order.customer).name), city: display(record(order.customer).city), totalAmount: display(record(order.customer).totalAmount) }, routing: { branchName: display(record(order.routing).branchName), areaLabel: display(record(order.routing).areaLabel), needsReview: record(order.routing).needsReview === true } }))} />
        {pagination(section, query, orders.length, orderPage.more)}
      </>
    );
  }
  if (section === "users") {
    const users = rows(await adminRead("auth/users", qs));
    const workspace = await adminRead("auth/branches") as BranchWorkspace;
    const routing = workspace.routing;
    return (
      <>
        <PageHeader
          title="Team & access"
          description="Administrators manage the business. Each branch uses its own store account for orders. Review and retire old staff access below."
        />
        <Callout><p>Each branch has its own store login. <Link href="/admin/branches">Manage branches and store logins</Link>.</p></Callout>
        <CreatePanel summary="Add administrator"><Card title="Add administrator"><AdminForm path="auth/signup" label="Create administrator" fields={[{name:'name',label:'Name',required:true},{name:'username',label:'Username',required:true},{name:'password',label:'Password (at least 12 characters)',type:'password',required:true},{name:'role',label:'Role',type:'hidden',value:'admin'},{name:'cities',label:'Cities',type:'hidden',value:''}]} /></Card></CreatePanel>
        <Card title="Store accounts" description="Created with each branch. Store accounts can receive and fulfil assigned orders; business settings remain administrator-only.">
          <Table caption="Branch store accounts" data={workspace.logins.map(login=>({...login, name:routing.branches.find(branch=>branch.id===login.branchId)?.name??'Branch unavailable'}))} columns={[{key:'name',label:'Branch'},{key:'username',label:'Store login'},{key:'disabled',label:'Access',render:item=>item.disabled?'Paused':'Can sign in'}]} actions={()=> <Link href="/admin/branches">Manage in Branches</Link>} />
        </Card>
        <Card title="Administrators" description="Business-wide access to catalogue, settings, accounts and all orders.">
          <Table caption="Administrator accounts" data={users.filter(item=>item.role==='admin')} columns={[{key:'name',label:'Name'},{key:'username',label:'Username'}]} actions={item=>display(item._id)===user.id?'Current account':<Command path={`auth/users/${display(item._id)}`} method="DELETE" variant="danger" confirm="Deactivate this administrator and revoke all sessions? History is retained.">Deactivate account</Command>} />
        </Card>
        {users.some(item=>item.role!=='admin')?<Card title="Legacy staff access" description="Review these older accounts before moving receiving devices to branch store logins.">
          <Callout tone="warning"><p>Legacy staff retain catalogue viewing, marketing and image-review access, in addition to assigned orders. Assign their receiving branch or deactivate them after replacing their login. New store accounts have narrower fulfilment permissions.</p></Callout>
          <Table caption="Legacy staff accounts" data={users.filter(item=>item.role!=='admin')} columns={[{key:'name',label:'Name'},{key:'username',label:'Username'},{key:'role',label:'Access',render:()=> 'Legacy staff — broad access'},{key:'branchId',label:'Receiving branch',render:item=>routing.branches.find(branch=>branch.id===item.branchId)?.name??'Not assigned — review access'}]} actions={item=><><StaffBranchAssignment key={display(item._id)+display(item.branchId)} id={display(item._id)} branchId={typeof item.branchId==='string'?item.branchId:null} branches={routing.branches} /><Command path={`auth/users/${display(item._id)}`} method="DELETE" variant="danger" confirm="Deactivate this legacy account and revoke all sessions? History is retained.">Deactivate account</Command></>} />
        </Card>:null}
        {users.length === 25 ? (
          <nav className="mb-4 flex gap-2 [&_a]:inline-flex [&_a]:h-10 [&_a]:items-center [&_a]:rounded-lg [&_a]:bg-surface [&_a]:px-5 [&_a]:text-[13px] [&_a]:font-medium [&_a]:text-ink [&_a]:no-underline [&_a]:border border-line" aria-label="Pagination">
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
          title="Store settings"
          description="Control storefront availability. Closing the store stops new checkout activity."
        />
        <Card title="Storefront availability">
          <p className="m-0 mb-4 flex items-center gap-3">
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
          title="Notifications"
          description="Order activity, stock alerts and device delivery in one place."
        />
        <NotificationCenter admin={user.role==='admin'}/>
        <Card title="Browser & installed app notifications">
          <p>
            The dashboard and order lists always show committed, authorized
            records. Enable push on the pharmacy’s receiving device. Keep the Orders inbox open and enable its optional sound; browser permissions, sleep and connectivity can delay alerts, so the inbox remains the source of truth.
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
            title={`Conversation with ${display(conversation.name)}`}
            description={
              conversation.messageCount !== undefined
                ? `Showing a page of ${display(conversation.messageCount)} stored messages, in chronological order. The first page contains the most recent messages.`
                : "Stored messages, in chronological order."
            }
            actions={<Link className={buttonVariants({ variant: "outline" })} href="/admin/whatsapp">Back to WhatsApp</Link>}
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
          <nav aria-label="Conversation history pages" className="mb-4 flex gap-2 [&_a]:inline-flex [&_a]:h-10 [&_a]:items-center [&_a]:rounded-lg [&_a]:bg-surface [&_a]:px-5 [&_a]:text-[13px] [&_a]:font-medium [&_a]:text-ink [&_a]:no-underline [&_a]:border border-line">
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
      adminRead("whatsapp/recipients", lookahead(qs)),
      adminRead("whatsapp/image", qs),
      adminRead("whatsapp/reports", qs),
    ]);
    const recipientPage = pageOf(rows(recipients));
    return (
      <>
        <PageHeader
          title="WhatsApp tools"
          description="Recipients, approved templates, posters and delivery reports."
        />
        <Table
          caption="Recipients"
          data={recipientPage.items}
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
        {pagination(section, query, recipientPage.items.length, recipientPage.more)}
        <BulkTemplates
          recipients={recipientPage.items.map((item) => ({
            from: display(item.from),
            name: display(item.name),
            promotionStatus: display(item.promotionStatus),
          }))}
        />
        <div className="grid gap-4 lg:grid-cols-2">
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
