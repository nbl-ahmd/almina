"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Editor } from "grapesjs";
import { prepareProductImages } from "../../lib/admin/product-images";
import { readProduct, productHref } from "../../lib/catalog/model";
const Designer = dynamic(() => import("./marketing-designer"), {
  ssr: false,
  loading: () => <p role="status">Loading email designer…</p>,
});
type Template = {
  id: string;
  revision: number;
  name: string;
  subject: string;
  previewText: string;
  mjml: string;
  html?: string;
};
type Connections = {
  enabled: boolean;
  providers: {
    id: "resend" | "outlook";
    configured: boolean;
    sender: string | null;
  }[];
  postalAddress: string;
  dailyLimit: number;
  monthlyLimit: number;
};
type Campaign = {
  _id: string;
  subject: string;
  provider: string;
  count: number;
  test: boolean;
  states: Record<string, number>;
};
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/marketing/" + path, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    headers:
      body === undefined
        ? {}
        : { "Content-Type": "application/json", "X-CSRF-Protection": "1" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok)
    throw Error(
      response.status === 409
        ? "This template changed elsewhere. Reload it before saving or sending."
        : response.status === 403
          ? "An administrator must approve campaigns. Tests must use an approved test address."
          : response.status === 400
            ? "Check the template, email addresses and consent details. A campaign must have 1–500 eligible recipients."
            : "Email service unavailable. Check its connection settings and try again.",
    );
  return (await response.json()).data as T;
}
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const starter = (kind = "newsletter") =>
  `<mjml><mj-head><mj-attributes><mj-all font-family="Arial, sans-serif"/><mj-text font-size="16px" line-height="1.6" color="#192321"/></mj-attributes></mj-head><mj-body background-color="#f3f6f5" width="640px"><mj-section background-color="#ffffff" padding="24px"><mj-column><mj-text font-size="24px" font-weight="bold">Al Mina Pharmacy</mj-text><mj-text font-size="30px" font-weight="bold">${kind === "first-aid" ? "First aid essentials for your workplace" : "A little more care for your everyday"}</mj-text><mj-text>${kind === "first-aid" ? "Explore our available workplace first aid supplies. Contact our team for a quotation and current availability." : "Add your campaign introduction here. Use the product picker to insert verified catalogue links."}</mj-text><mj-button background-color="#126157" href="https://alminapharmacy.com/products">Explore products</mj-button></mj-column></mj-section></mj-body></mjml>`;
const blank = (kind = "newsletter"): Template => ({
  id: crypto.randomUUID(),
  revision: 0,
  name: kind === "first-aid" ? "Workplace first aid" : "New newsletter",
  subject:
    kind === "first-aid"
      ? "First aid supplies for your workplace"
      : "News from Al Mina Pharmacy",
  previewText: "",
  mjml: starter(kind),
});
export function MarketingManager({
  admin,
  nonce,
}: {
  admin: boolean;
  nonce: string;
}) {
  const [tab, setTab] = useState("design"),
    [templates, setTemplates] = useState<Template[]>([]),
    [template, setTemplate] = useState<Template | null>(null),
    [connections, setConnections] = useState<Connections | null>(null),
    [campaigns, setCampaigns] = useState<Campaign[]>([]),
    [message, setMessage] = useState("Loading email marketing…"),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [version, setVersion] = useState(0),
    [provider, setProvider] = useState<"resend" | "outlook">("resend"),
    [testEmail, setTestEmail] = useState(""),
    [audience, setAudience] = useState("customers"),
    [list, setList] = useState(""),
    [acknowledged, setAcknowledged] = useState(false),
    [contactText, setContactText] = useState(""),
    [consentSource, setConsentSource] = useState(""),
    [consentAt, setConsentAt] = useState(""),
    [query, setQuery] = useState(""),
    [products, setProducts] = useState<
      NonNullable<ReturnType<typeof readProduct>>[]
    >([]),
    [imageAlt, setImageAlt] = useState("Campaign artwork");
  const editor = useRef<Editor | null>(null),
    currentSource = useRef(""),
    sendKey = useRef<string | null>(null),
    testKey = useRef<string | null>(null);
  async function refresh() {
    const [saved, status, reports] = await Promise.all([
      request<Template[]>("templates"),
      request<Connections>("status"),
      request<Campaign[]>("campaigns"),
    ]);
    setTemplates(saved);
    setConnections(status);
    setCampaigns(reports);
    return saved;
  }
  useEffect(() => {
    let active = true;
    void Promise.all([
      request<Template[]>("templates"),
      request<Connections>("status"),
      request<Campaign[]>("campaigns"),
    ])
      .then(([saved, status, reports]) => {
        if (!active) return;
        setTemplates(saved);
        setConnections(status);
        setCampaigns(reports);
        const first = saved[0] ?? blank();
        setTemplate(first);
        currentSource.current = first.mjml;
        setMessage("");
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function select(value: Template) {
    if (dirty && !window.confirm("Discard unsaved email changes?")) return;
    setTemplate(value);
    currentSource.current = value.mjml;
    setDirty(false);
    setAcknowledged(false);
    setVersion((value) => value + 1);
    sendKey.current = testKey.current = null;
  }
  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function update(value: Partial<Template>) {
    setTemplate((current) => (current ? { ...current, ...value } : null));
    setDirty(true);
    setAcknowledged(false);
    sendKey.current = testKey.current = null;
  }
  async function save() {
    if (!template) return;
    const saved = await request<Template>("templates", {
      id: template.id,
      revision: template.revision,
      name: template.name,
      subject: template.subject,
      previewText: template.previewText,
      mjml: currentSource.current,
    });
    setTemplate(saved);
    currentSource.current = saved.mjml;
    setDirty(false);
    setAcknowledged(false);
    sendKey.current = testKey.current = null;
    await refresh();
    setMessage("Template saved. Send a test before approving a campaign.");
  }
  async function loadPreview() {
    if (!template?.revision || template.html) return;
    try {
      const full = await request<Template>(
        "template?id=" + encodeURIComponent(template.id),
      );
      const html = full.html;
      if (typeof html !== "string") throw Error("Saved preview unavailable.");
      setTemplate((current) =>
        current?.id === full.id && current.revision === full.revision
          ? { ...current, html }
          : current,
      );
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  async function queue(test: boolean) {
    if (!template || dirty || !template.revision)
      throw Error("Save your changes before sending.");
    const receipt = test ? testKey : sendKey;
    receipt.current ??= crypto.randomUUID();
    const result = await request<{ count: number; id: string }>(
      test ? "test" : "campaigns",
      {
        requestId: receipt.current,
        templateId: template.id,
        expectedRevision: template.revision,
        provider,
        ...(test ? { email: testEmail } : { audience, list, acknowledged }),
      },
    );
    setMessage(
      `${test ? "Test" : "Campaign"} queued for ${result.count} recipient${result.count === 1 ? "" : "s"}. Queued does not mean delivered.`,
    );
    await refresh();
  }
  const field = "grid gap-1.5 text-sm font-medium";
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl">Email marketing</h1>
          <p className="m-0 max-w-2xl text-sm">
            Design reusable emails, link real products and send to people who
            asked to hear from Al Mina.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn--secondary"
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              await refresh();
              setMessage("Campaign status refreshed.");
            })
          }
        >
          Refresh status
        </button>
      </header>
      <nav
        className="flex flex-wrap gap-2"
        aria-label="Email marketing sections"
      >
        {[
          ["design", "Designer"],
          ...(admin ? [["contacts", "Contacts"]] : []),
          ["campaigns", "Campaigns"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={tab === id}
            className={tab === id ? "" : "admin-btn--secondary"}
            onClick={() => setTab(id!)}
          >
            {label}
          </button>
        ))}
      </nav>
      {message ? (
        <p role="status" className="admin-panel">
          {message}
        </p>
      ) : null}
      {connections && !connections.providers.some((row) => row.configured) ? (
        <div className="admin-panel">
          <h2 className="text-base">
            Designing is available · sending needs setup
          </h2>
          <p className="m-0 text-sm">
            An administrator must enable marketing email, set the pharmacy
            postal address, approve test recipients and configure Resend or a
            Microsoft 365 mailbox. Credentials stay on the server.
          </p>
        </div>
      ) : null}
      {tab === "design" && template ? (
        <>
          <div className="space-y-4">
            <aside className="grid gap-4 lg:grid-cols-3">
              <section className="admin-panel">
                <h2 className="text-lg">Saved templates</h2>
                <label className={field}>
                  Open a template
                  <select
                    value={template.revision ? template.id : ""}
                    onChange={(event) => {
                      const value = templates.find(
                        (row) => row.id === event.target.value,
                      );
                      if (value) select(value);
                    }}
                  >
                    <option value="">Unsaved template</option>
                    {templates.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    className="admin-btn--secondary"
                    onClick={() => select(blank())}
                  >
                    New newsletter
                  </button>
                  <button
                    type="button"
                    className="admin-btn--secondary"
                    onClick={() => select(blank("first-aid"))}
                  >
                    Workplace first aid
                  </button>
                  <button
                    type="button"
                    className="admin-btn--secondary"
                    onClick={() =>
                      select({
                        ...template,
                        id: crypto.randomUUID(),
                        revision: 0,
                        name: template.name + " copy",
                        mjml: currentSource.current,
                      })
                    }
                  >
                    Duplicate template
                  </button>
                </div>
              </section>
              <section className="admin-panel">
                <h2 className="text-lg">Add products</h2>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void perform(async () => {
                      const rows = await request<unknown[]>(
                        "products?q=" + encodeURIComponent(query),
                      );
                      setProducts(
                        rows
                          .map(readProduct)
                          .filter(
                            (row): row is NonNullable<typeof row> =>
                              row !== null,
                          ),
                      );
                    });
                  }}
                >
                  <label className={field}>
                    Find a product
                    <input
                      value={query}
                      minLength={2}
                      maxLength={80}
                      required
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <button className="mt-2" disabled={busy}>
                    Search catalogue
                  </button>
                </form>
                <p className="text-xs">
                  Reviewed, in-stock general-sale products only. Product links
                  use current catalogue identities.
                </p>
                <ul className="list-none space-y-2 p-0">
                  {products.map((product) => (
                    <li key={product._id}>
                      <button
                        type="button"
                        className="admin-btn--secondary w-full text-left"
                        onClick={() => {
                          const href =
                            "https://alminapharmacy.com" + productHref(product);
                          const image =
                            product.cloudinaryImages?.[0] ??
                            (product.image
                              ? "https://cdn.alminapharmacy.com/cdn/products/" +
                                encodeURIComponent(product.image)
                              : "");
                          editor.current
                            ?.getWrapper()
                            ?.findType("mj-body")[0]
                            ?.append(
                              `<mj-section background-color="#ffffff"><mj-column>${image ? `<mj-image src="${escape(image)}" alt="${escape(product.name)}" width="200px" href="${escape(href)}"/>` : ""}<mj-text font-weight="bold">${escape(product.name)}</mj-text><mj-button background-color="#126157" href="${escape(href)}">View product</mj-button></mj-column></mj-section>`,
                            );
                          setDirty(true);
                        }}
                      >
                        {product.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="admin-panel">
                <h2 className="text-lg">Campaign artwork</h2>
                <label className={field}>
                  Artwork description
                  <input
                    value={imageAlt}
                    maxLength={180}
                    onChange={(event) => setImageAlt(event.target.value)}
                  />
                </label>
                <label className={field}>
                  Upload a flyer or banner
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file)
                        void perform(async () => {
                          const [prepared] = await prepareProductImages([file]);
                          if (!prepared) throw Error("Photo unavailable");
                          const body = new FormData();
                          body.set("image", prepared);
                          const response = await fetch(
                            "/api/admin/media/marketing",
                            {
                              method: "POST",
                              headers: { "X-CSRF-Protection": "1" },
                              body,
                            },
                          );
                          if (!response.ok)
                            throw Error(
                              "Artwork upload failed. Check image storage configuration.",
                            );
                          const result = (await response.json()) as {
                            image: string;
                          };
                          editor.current
                            ?.getWrapper()
                            ?.findType("mj-body")[0]
                            ?.append(
                              `<mj-section background-color="#ffffff"><mj-column><mj-image src="${escape(result.image)}" alt="${escape(imageAlt)}"/></mj-column></mj-section>`,
                            );
                          setDirty(true);
                          setMessage(
                            "Artwork added. Save the template to keep this layout.",
                          );
                        });
                    }}
                  />
                </label>
              </section>
            </aside>
            <section className="min-w-0 space-y-4">
              <div className="admin-panel grid gap-3 md:grid-cols-2">
                <label className={field}>
                  Template name
                  <input
                    required
                    maxLength={120}
                    value={template.name}
                    onChange={(event) => update({ name: event.target.value })}
                  />
                </label>
                <label className={field}>
                  Email subject
                  <input
                    required
                    maxLength={180}
                    value={template.subject}
                    onChange={(event) =>
                      update({ subject: event.target.value })
                    }
                  />
                </label>
                <label className={field}>
                  Preview text
                  <input
                    maxLength={200}
                    value={template.previewText}
                    onChange={(event) =>
                      update({ previewText: event.target.value })
                    }
                  />
                </label>
                <div className="flex items-end gap-3">
                  <button disabled={busy} onClick={() => void perform(save)}>
                    Save template
                  </button>
                  <span className="text-xs">
                    {dirty
                      ? "Unsaved changes"
                      : template.revision
                        ? "Saved"
                        : "New template"}
                  </span>
                </div>
              </div>
            </section>
          </div>
          <section className="min-w-0 space-y-4">
            <Designer
              key={template.id + ":" + version}
              source={template.mjml}
              editorRef={editor}
              onChange={(value) => {
                currentSource.current = value;
                setDirty(true);
                setAcknowledged(false);
                sendKey.current = testKey.current = null;
              }}
            />
            <details className="admin-panel">
              <summary>Advanced: import MJML</summary>
              <p className="text-sm">
                Paste declarative MJML, then save to validate it. Scripts, raw
                HTML blocks, external stylesheets and filesystem includes are
                not allowed.
              </p>
              <textarea
                aria-label="MJML source"
                className="mt-3 min-h-48 w-full font-mono text-xs"
                defaultValue={template.mjml}
                key={version}
                onChange={(event) => {
                  currentSource.current = event.target.value;
                  setDirty(true);
                }}
              />
              <button
                className="mt-2"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await save();
                    setVersion((value) => value + 1);
                  })
                }
              >
                Validate and load MJML
              </button>
            </details>
            {template.revision ? (
              <details
                className="admin-panel"
                onToggle={(event) => {
                  if (event.currentTarget.open) void loadPreview();
                }}
              >
                <summary>Preview saved email</summary>
                {template.html ? (
                  <iframe
                    title="Saved email preview"
                    sandbox="allow-same-origin"
                    className="mt-3 h-[600px] w-full border-0"
                    srcDoc={template.html.replaceAll(
                      "<style",
                      `<style nonce="${nonce}"`,
                    )}
                  />
                ) : (
                  <p className="text-sm">Loading preview…</p>
                )}
              </details>
            ) : null}
          </section>
          <section className="admin-panel space-y-4">
            <h2 className="text-xl">Test and send</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <label className={field}>
                Send using
                <select
                  value={provider}
                  onChange={(event) => {
                    setProvider(event.target.value as "resend" | "outlook");
                    sendKey.current = testKey.current = null;
                  }}
                >
                  {(
                    connections?.providers ?? [
                      { id: "resend", configured: false, sender: null },
                      { id: "outlook", configured: false, sender: null },
                    ]
                  ).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.id === "resend"
                        ? "Resend"
                        : "Microsoft 365 / Outlook"}
                      {row.configured ? "" : " · setup required"}
                    </option>
                  ))}
                </select>
              </label>
              <label className={field}>
                Approved test email
                <input
                  type="email"
                  value={testEmail}
                  onChange={(event) => {
                    setTestEmail(event.target.value);
                    testKey.current = null;
                  }}
                />
              </label>
              <div className="flex items-end">
                <button
                  className="admin-btn--secondary"
                  disabled={
                    busy ||
                    dirty ||
                    !template.revision ||
                    !testEmail ||
                    !connections?.providers.find((row) => row.id === provider)
                      ?.configured
                  }
                  onClick={() => void perform(() => queue(true))}
                >
                  Send test email
                </button>
              </div>
            </div>
            <p className="text-sm">
              Sender:{" "}
              {connections?.providers.find((row) => row.id === provider)
                ?.sender ?? "Not configured"}
              . Current safety budget: {connections?.dailyLimit ?? 20} marketing
              attempts/day and {connections?.monthlyLimit ?? 500}/month, shared
              with existing marketing reminders. Outlook acceptance does not
              confirm delivery.
            </p>
            {admin ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={field}>
                    Audience
                    <select
                      value={audience}
                      onChange={(event) => {
                        setAudience(event.target.value);
                        sendKey.current = null;
                        setAcknowledged(false);
                      }}
                    >
                      <option value="customers">
                        Customers who opted into email offers
                      </option>
                      <option value="contacts">
                        Consented marketing contacts
                      </option>
                    </select>
                  </label>
                  {audience === "contacts" ? (
                    <label className={field}>
                      Contact list (blank selects all)
                      <input
                        value={list}
                        maxLength={60}
                        onChange={(event) => {
                          setList(event.target.value);
                          sendKey.current = null;
                          setAcknowledged(false);
                        }}
                      />
                    </label>
                  ) : null}
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    className="mt-1 size-4"
                  />
                  I reviewed the saved email, product links, artwork and
                  recipient consent, and approve this campaign.
                </label>
                <button
                  disabled={
                    busy ||
                    dirty ||
                    !acknowledged ||
                    !template.revision ||
                    !connections?.providers.find((row) => row.id === provider)
                      ?.configured
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        "Queue this campaign for the selected consented audience?",
                      )
                    )
                      void perform(() => queue(false));
                  }}
                >
                  Queue campaign
                </button>
                <p className="text-xs">
                  Up to 500 recipients per campaign. Unsubscribes and
                  suppressions are checked again before each send. Uncertain
                  attempts require review and are never automatically resent.
                </p>
              </>
            ) : (
              <p className="text-sm">
                You can design templates and send approved tests. An
                administrator approves audience imports and campaign sending.
              </p>
            )}
          </section>
        </>
      ) : null}
      {tab === "contacts" && admin ? (
        <section className="admin-panel space-y-4">
          <h2 className="text-xl">Import consented contacts</h2>
          <p className="text-sm">
            One email address per line, up to 500. Import only people who
            explicitly agreed to marketing. Purchases and wholesale approval
            alone are not marketing permission. Existing unsubscribes remain
            blocked.
          </p>
          <label className={field}>
            List name
            <input
              value={list}
              maxLength={60}
              onChange={(event) => setList(event.target.value)}
            />
          </label>
          <label className={field}>
            How consent was obtained
            <input
              value={consentSource}
              minLength={5}
              maxLength={300}
              onChange={(event) => setConsentSource(event.target.value)}
            />
          </label>
          <label className={field}>
            Consent date
            <input
              type="date"
              value={consentAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setConsentAt(event.target.value)}
            />
          </label>
          <label className={field}>
            Email addresses
            <textarea
              className="min-h-48"
              value={contactText}
              onChange={(event) => setContactText(event.target.value)}
            />
          </label>
          <button
            disabled={
              busy ||
              !list ||
              consentSource.length < 5 ||
              !consentAt ||
              !contactText.trim()
            }
            onClick={() =>
              void perform(async () => {
                const rows = contactText
                  .split(/\r?\n/)
                  .map((value) => value.trim())
                  .filter(Boolean);
                const result = await request<{
                  imported: number;
                  blocked: number;
                }>(
                  "contacts",
                  rows.map((email) => ({
                    email,
                    name: "",
                    list,
                    consentSource,
                    consentAt: new Date(consentAt + "T00:00:00Z").toISOString(),
                  })),
                );
                setMessage(
                  `${result.imported} contacts saved; ${result.blocked} unsubscribed or suppressed contacts skipped.`,
                );
                setContactText("");
              })
            }
          >
            Import contacts
          </button>
        </section>
      ) : null}
      {tab === "campaigns" ? (
        <section className="admin-panel">
          <h2 className="text-xl">Recent campaigns</h2>
          <p className="text-sm">
            Accepted means the provider received the request. Uncertain sends
            require provider review before any new campaign is created.
          </p>
          {campaigns.length ? (
            <ul className="list-none space-y-4 p-0">
              {campaigns.map((row) => (
                <li key={row._id} className="border-b pb-4">
                  <h3 className="text-base">
                    {row.subject}
                    {row.test ? " · Test" : ""}
                  </h3>
                  <p className="text-sm">
                    {row.provider} · {row.count} recipients
                  </p>
                  <dl className="flex flex-wrap gap-4 text-sm">
                    {Object.entries(row.states).map(([state, count]) => (
                      <div key={state}>
                        <dt className="capitalize">{state}</dt>
                        <dd className="m-0 font-semibold">{count}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No campaigns yet. Save a template and send an approved test first.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
