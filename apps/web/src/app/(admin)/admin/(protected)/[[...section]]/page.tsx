import { NotificationCenter } from '../../../../../components/admin/notification-center';
import { heroArtwork, sizeLabel } from '../../../../../lib/storefront/artwork';
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
import { readCatalogueContext, catalogueContextParams, type CatalogueList, catalogueViewLabels, catalogueFilterLabels, type CatalogueQueue } from '@almina/contracts';
import { editorHref, listHref, queueQuery } from '../../../../../lib/admin/catalogue-links';
import { BulkPhotoUpload } from '../../../../../components/admin/bulk-photos';
import { BrandManager } from '../../../../../components/admin/brand-manager';
import { CatalogueFiltersBar, CataloguePager } from '../../../../../components/admin/catalogue-browser';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { CatalogImport } from '../../../../../components/admin/catalog-import';
import { CatalogueQualityPage } from '../../../../../components/admin/catalogue-quality';
import { catalogueGaps, enrichmentScopes, type EnrichmentQueue, type QualityReport } from '@almina/contracts';
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
  Note,
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
function thumbnail(image: string | null): string | null {
  if (!image) return null;
  const cdn = cloudinaryImage(image, getWebEnvironment().CLOUDINARY_CLOUD_NAME);
  if (cdn) return cdn;
  return /^[A-Za-z0-9_.-]+$/.test(image) ? `${getWebEnvironment().LEGACY_API_ORIGIN}/api/products/images/${image}` : null;
}
const PAGE_SIZE = 25;
function CategoryThumb({ image, stored }: { image: string; stored?: unknown }) {
  const direct = Array.isArray(stored) ? cloudinaryImage(stored[0], getWebEnvironment().CLOUDINARY_CLOUD_NAME) : null;
  // eslint-disable-next-line @next/next/no-img-element -- a 40 px thumbnail served by storage with a size transformation.
  if (direct) return <img src={direct.replace('/image/upload/', '/image/upload/c_fill,w_80,h_80,f_auto,q_auto/')} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-lg bg-fill object-cover" />;
  const filename = /^[A-Za-z0-9_.-]+\.[A-Za-z]{2,5}$/.test(image) ? image : "";
  // eslint-disable-next-line @next/next/no-img-element -- legacy category media is served by the API origin.
  return filename ? <img src={`${getWebEnvironment().LEGACY_API_ORIGIN}/api/category/images/${filename}`} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-lg bg-fill object-cover" />
    : <span aria-hidden="true" className="size-10 shrink-0 rounded-lg bg-fill" />;
}
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
  // The review queue is now a set of filters on Products; old links and bookmarks keep working.
  if (section === 'needs-action') redirect(listHref(readCatalogueContext({
    view: query.status === 'published' ? 'live' : query.status === 'all' ? 'all' : 'hidden',
    filter: query.reason === 'images' ? 'missing-photo' : query.reason,
    q: query.q,
  })));
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
      // On a new product, ?category= preselects it. On an existing product the same parameter is only the list filter:
      // it must never change which category the saved product has.
      const selectedCategory =
        detail === "new" &&
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
      // The list this editor was opened from. "Save & next" asks for the following product only after saving, so it
      // works for every product and never depends on this page's lookup succeeding.
      const context = readCatalogueContext(detail === "new" ? {} : query);
      const queue = product
        ? await adminRead("products/queue", queueQuery(detail, context)).then(value => value as CatalogueQueue).catch(() => null)
        : null;
      const filtered = context.view !== "all" || context.filter !== "all" || Boolean(context.q || context.category);
      const queueLabel = [context.view !== "all" ? catalogueViewLabels[context.view] : "", context.filter !== "all" ? catalogueFilterLabels[context.filter] : "", context.q ? `“${context.q}”` : ""].filter(Boolean).join(" · ");
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
                {queue ? <span className="text-xs text-mute tabular-nums" role="status">{queue.position ? `${queue.position.toLocaleString("en-AE")} of ${queue.total.toLocaleString("en-AE")}` : `${queue.total.toLocaleString("en-AE")} in this list`}{filtered && queueLabel ? ` · ${queueLabel}` : ""}</span> : null}
                {queue?.previousId ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={editorHref(queue.previousId, context)} aria-label="Previous product">‹ Previous</Link> : null}
                {queue?.nextId ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={editorHref(queue.nextId, context)} aria-label="Next product">Next ›</Link> : null}
                <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={listHref(context, queue?.position ? Math.floor((queue.position - 1) / PAGE_SIZE) * PAGE_SIZE : 0)}>{filtered ? "Back to list" : "All products"}</Link>
              </>
            }
          />
          <ProductForm
            key={detail}
            product={product}
            categories={categories}
            selectedCategory={selectedCategory}
            queue={product ? { context, nextId: queue?.nextId ?? null } : undefined}
          />
        </>
      );
    }
    const context = readCatalogueContext(query);
    const limit = [50, 100].includes(Number(query.limit)) ? Number(query.limit) : 25;
    const offset = typeof query.offset === "string" && /^[0-9]{1,5}$/.test(query.offset) ? Number(query.offset) : 0;
    const params = catalogueContextParams(context);
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    const [list, categories] = await Promise.all([
      adminRead("products/catalogue", params) as Promise<CatalogueList>,
      user.role === "admin" ? adminRead("category", new URLSearchParams({ limit: "100" })).then(rows).catch(() => []) : Promise.resolve([]),
    ]);
    return (
      <>
        <PageHeader
          title="Products"
          description="Search the catalogue, add photos, fix what is missing and choose what customers see. Staff accounts have read-only access."
          actions={
            user.role === "admin" ? (
              <>
                <BulkPhotoUpload />
                <Link className={buttonVariants({ variant: "primary" })} href="/admin/products/new">
                  Add product
                </Link>
              </>
            ) : (
              <Badge tone="neutral">Read-only inventory</Badge>
            )
          }
        />
        {query.saved === 'published' || query.saved === 'draft' ? (
          <Callout tone="success" role="status">
            <p><strong>{query.saved === 'published' ? 'Product published.' : 'Draft saved.'}</strong> {query.saved === 'published' ? 'It is now visible in the storefront.' : 'It stays hidden from customers until you publish it.'}</p>
            <Link href="/admin/products/new">Add another product</Link>
          </Callout>
        ) : null}
        <CatalogueFiltersBar list={list} context={context} limit={limit} categories={categories.map(item => ({ id: display(item._id), name: display(item.name) }))} />
        {context.filter === "classification" || context.filter === "prescription" ? (
          <Note tone="warning" icon={<ClipboardDocumentCheckIcon />}>
            <p><strong>Medicine classification needs pharmacy review.</strong> Confirm the exact product, strength and pack from its label. Choose Pharmacy medicine only after verification. Prescription products stay unpublished.</p>
          </Note>
        ) : null}
        <ProductsTable key={`${params}`} admin={user.role === "admin"} context={context} readyTotal={list.counts.filters.ready}
          products={list.items.map(item => ({ ...item, thumb: thumbnail(item.image) }))} />
        <CataloguePager total={list.total} offset={list.offset} shown={list.items.length} limit={limit} context={context} />
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
              artwork={{ kind: 'category', files: ['image'], categoryId: detail }}
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
            artwork={{ kind: 'category', files: ['image'] }}
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
            { key: "name", label: "Category", render: (item) => (
              <span className="flex items-center gap-3">
                <CategoryThumb image={display(item.image)} stored={item.cloudinaryImages} />
                <Link className="font-medium text-ink no-underline hover:underline" href={`/admin/products?category=${display(item._id)}`}>{display(item.name)}</Link>
              </span>
            ) },
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
            <Link href={`/admin/products?category=${display(item._id)}&filter=missing-photo`} aria-label={`Products without a photo in ${display(item.name)}`}>Add photos</Link>
            <RowActions label={`Actions for ${display(item.name)}`}>
              <Link href={`/admin/products?category=${display(item._id)}`}>
                View products in {display(item.name)}
              </Link>
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
            </>
          )}
        />
        {pagination(section, query, categories.length, categoryPage.more)}
      </>
    );
  }
  if (section === "brands") {
    return <BrandManager cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} initial={typeof query.brand === 'string' ? query.brand : undefined} />;
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
            artwork={{ kind: 'banner', files: ['image', 'mobileImage'] }}
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
                hint: `Desktop artwork, ${sizeLabel(heroArtwork.desktop)} pixels (16:5), for screens 900px and wider. A larger file of the same shape is sharper. The frame is fixed and the image is never cropped, so another shape leaves blank bands. The newest eight banners appear in the homepage carousel.`,
                frame: heroArtwork.desktop,
                required: true,
                section: "Artwork",
              },
              {
                name: "mobileImage",
                label: "Phone banner image (optional)",
                type: "file",
                hint: `Phone and tablet artwork, ${sizeLabel(heroArtwork.mobile)} pixels (2:1) or 1200 × 600, for screens below 900px. Use larger text. Left empty, the desktop image shows with blank bands above and below.`,
                frame: heroArtwork.mobile,
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
            { key: "image", label: "Artwork", render: (item) => <MediaPreview item={item} kind="banners" origin={getWebEnvironment().LEGACY_API_ORIGIN} /> },
            { key: "name", label: "Name" },
            { key: "link", label: "Destination", render: (item) => <span className="block max-w-[320px] break-all text-[13px] text-mute">{display(item.link)}</span> },
            { key: "locale", label: "Shown on", render: (item) => <Badge className="normal-case">{item.locale === "en" ? "English" : item.locale === "ar" ? "Arabic" : "English and Arabic"}</Badge> },
          ]}
          empty={{ title: "No banners yet", description: "Add a banner to fill the homepage carousel." }}
          actions={(item) => (
            <>
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
        <OrdersTable orders={orders.map(order => ({ _id: display(order._id), orderId: display(order.orderId), status: display(order.status), ...(typeof order.createdAt === 'string' ? { createdAt: order.createdAt } : {}), customer: { name: display(record(order.customer).name), city: display(record(order.customer).city), totalAmount: display(record(order.customer).totalAmount) }, routing: { branchName: display(record(order.routing).branchName), areaLabel: display(record(order.routing).areaLabel), needsReview: record(order.routing).needsReview === true } }))} />
        {pagination(section, query, orders.length, orderPage.more)}
      </>
    );
  }
  const sessions = (
    <Card title="Sessions" description="Sign out every device that is signed in to your account.">
      <Command
        path="auth/logout-all"
        method="POST"
        variant="danger"
        confirm="Sign out all sessions for your account?"
      >
        Revoke all my sessions
      </Command>
    </Card>
  );
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
        {sessions}
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
        <div className="grid items-start gap-4 lg:grid-cols-2 [&>section]:mb-0">
          <Card title="Storefront availability" aside={<Badge tone={open ? "success" : "danger"} dot>{display(store.status)}</Badge>}>
            <p className="m-0 mb-4 text-sm text-ink-2">{open ? "Customers can browse and place orders." : "Customers can browse, but new orders are stopped."}</p>
            <Command
              path="store/status"
              body={{ status: store.status !== "open" }}
              variant={open ? "danger" : "primary"}
              confirm={open ? "The store is open. Closing it stops new orders until you open it again. Existing orders are not changed." : "The store is closed. Opening it lets customers place orders again."}
            >
              {open ? "Close store" : "Open store"}
            </Command>
          </Card>
          <Card title="Other settings">
            <ul className="m-0 grid list-none gap-1 p-0">
              {([["/admin/branches", "Branches & delivery", "Delivery areas, fees and branch logins"], ["/admin/users", "Team & access", "Administrators, store accounts and sessions"], ["/admin/notifications", "Notifications", "Order alerts on this device"], ["/admin/banners", "Banners", "Homepage carousel artwork"]] as const).map(([href, title, note]) => (
                <li key={href}><Link href={href} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-ink no-underline hover:bg-fill"><span className="grid"><span className="text-sm font-medium">{title}</span><span className="text-xs text-mute">{note}</span></span><span aria-hidden="true">›</span></Link></li>
              ))}
            </ul>
          </Card>
        </div>
      </>
    );
  }
  if (section === 'catalogue-quality') {
    const scope = enrichmentScopes.find(value => value === query.scope) ?? 'live';
    const gap = (['any', ...catalogueGaps] as const).find(value => value === query.gap) ?? 'any';
    const offset = typeof query.offset === 'string' && /^[0-9]{1,5}$/.test(query.offset) ? Number(query.offset) : 0;
    const [report, queue] = await Promise.all([
      adminRead('products/quality').then(value => value as QualityReport).catch(() => null),
      adminRead('products/enrichment', new URLSearchParams({ scope, gap, limit: String(PAGE_SIZE), offset: String(offset) })).then(value => value as EnrichmentQueue).catch(() => null),
    ]);
    return <CatalogueQualityPage report={report} query={{ scope, gap, limit: PAGE_SIZE }}
      queue={queue ? { ...queue, items: queue.items.map(item => ({ ...item, thumb: thumbnail(item.image) })) } : null} />;
  }
  if (section === 'catalog-import') {
    const categories: AdminRecord[]=[];
    for(let offset=0;offset<=10000;offset+=100){const page=rows(await adminRead('category',new URLSearchParams({limit:'100',offset:String(offset)})));categories.push(...page);if(page.length<100)break;if(offset===10000)throw new Error('Category mapping exceeds supported bounds');}
    return (
      <>
        <PageHeader
          title="Catalog import"
          description="Review prepared ERP files and import them as unpublished drafts."
          actions={<Link className={buttonVariants({ variant: "outline" })} href="/admin/products?view=hidden">Review imported products</Link>}
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
        {user.role === "admin" ? <Callout><p>Signing out of every device is under <Link href="/admin/users">Team &amp; access</Link>.</p></Callout> : sessions}
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
        <Card title="Recipients" description="Open a conversation to read it and reply.">
        <Table
          caption="Recipients"
          empty={{ title: "No recipients yet", description: "People appear here after they message the pharmacy on WhatsApp." }}
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
        </Card>
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
              artwork={{ kind: 'poster', files: ['image'] }}
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
        <Card title="Posters">
        <Table
          caption="Posters"
          empty={{ title: "No posters uploaded" }}
          data={rows(posters)}
          columns={[{ key: "image", label: "Filename" }, { key: "cloudinaryImages", label: "Template image URL", render: (item) => {
            const url = Array.isArray(item.cloudinaryImages) ? cloudinaryImage(item.cloudinaryImages[0], getWebEnvironment().CLOUDINARY_CLOUD_NAME) : null;
            return url ? <span className="block max-w-md select-all break-all text-xs">{url}</span> : <span className="text-xs text-mute">Older poster</span>;
          } }]}
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
        </Card>
        <Card title="Delivery reports">
        <Table
          caption="Delivery reports"
          empty={{ title: "No delivery reports yet" }}
          data={rows(reports).flatMap((report) => rows(report.broadcast))}
          columns={[
            { key: "recipient", label: "Recipient" },
            { key: "messageStatus", label: "Status" },
            { key: "errorDetails", label: "Details" },
          ]}
        />
        </Card>
      </>
    );
  }
  notFound();
}
