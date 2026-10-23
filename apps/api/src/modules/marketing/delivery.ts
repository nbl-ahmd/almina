import type { Db } from "mongodb";
import {
  createEmailClient,
  reserveEmailBudget,
} from "../notifications/provider.js";
import { HttpError } from "../../errors.js";
export function marketingConnections() {
  const enabled = process.env.MARKETING_EMAIL_ENABLED === "true",
    domain = process.env.EMAIL_MARKETING_DOMAIN;
  const resendFrom =
    domain && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)
      ? `offers@${domain}`
      : null;
  // Campaign sending can use Resend while transactional mail still uses SMTP.
  const resend = !!(
    resendFrom &&
    !domain?.endsWith(".resend.dev") &&
    process.env.RESEND_MARKETING_API_KEY?.startsWith("re_") &&
    /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(process.env.EMAIL_REPLY_TO ?? "")
  );
  const mailbox = process.env.MARKETING_OUTLOOK_MAILBOX;
  const outlook = !!(
    mailbox &&
    /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(mailbox) &&
    /^[a-f0-9-]{36}$/i.test(process.env.MARKETING_OUTLOOK_TENANT_ID ?? "") &&
    /^[a-f0-9-]{36}$/i.test(process.env.MARKETING_OUTLOOK_CLIENT_ID ?? "") &&
    process.env.MARKETING_OUTLOOK_CLIENT_SECRET
  );
  const origin = process.env.EMAIL_PUBLIC_API_ORIGIN,
    ready = !!(
      enabled &&
      origin &&
      /^https:\/\/[a-z0-9.-]+$/.test(origin) &&
      process.env.MARKETING_POSTAL_ADDRESS?.trim()
    );
  return {
    enabled: ready,
    providers: [
      {
        id: "resend",
        configured: ready && resend,
        sender: resendFrom,
      },
      { id: "outlook", configured: ready && outlook, sender: mailbox ?? null },
    ],
    postalAddress: process.env.MARKETING_POSTAL_ADDRESS ?? "",
    dailyLimit: 20,
    monthlyLimit: 500,
  };
}
export type MarketingDelivery = {
  id: string;
  provider: "resend" | "outlook";
  to: string;
  subject: string;
  html: string;
  unsubscribe: string;
};
export async function deliverMarketing(db: Db, input: MarketingDelivery) {
  const settings = marketingConnections(),
    connection = settings.providers.find((row) => row.id === input.provider);
  if (!connection?.configured || !connection.sender)
    throw new HttpError(503, "SERVICE_UNAVAILABLE");
  await reserveEmailBudget(db, true);
  const headers = {
    "List-Unsubscribe": `<${input.unsubscribe}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  if (input.provider === "resend") {
    const { data, error } = await createEmailClient(
      process.env.RESEND_MARKETING_API_KEY!,
    ).emails.send(
      {
        from: `Al Mina Pharmacy <${connection.sender}>`,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        replyTo: process.env.EMAIL_REPLY_TO!,
        headers,
        tags: [{ name: "category", value: "campaign" }],
      },
      {
        idempotencyKey: "almina/campaign/" + input.id,
        signal: AbortSignal.timeout(10000),
      },
    );
    if (error || !data?.id) throw new HttpError(503, "DELIVERY_UNCERTAIN");
    return data.id;
  }
  const tenant = process.env.MARKETING_OUTLOOK_TENANT_ID!;
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({
        client_id: process.env.MARKETING_OUTLOOK_CLIENT_ID!,
        client_secret: process.env.MARKETING_OUTLOOK_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  if (!tokenResponse.ok) throw new HttpError(503, "SERVICE_UNAVAILABLE");
  const token = (await tokenResponse.json()) as { access_token?: unknown };
  if (typeof token.access_token !== "string")
    throw new HttpError(503, "SERVICE_UNAVAILABLE");
  // MIME supports standard List-Unsubscribe headers; Graph JSON custom headers are x-* only.
  const mime = [
    "MIME-Version: 1.0",
    `From: ${connection.sender}`,
    `To: ${input.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(input.subject).toString("base64")}?=`,
    `List-Unsubscribe: <${input.unsubscribe}>`,
    "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(input.html).toString("base64"),
  ].join("\r\n");
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(connection.sender)}/sendMail`,
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: "Bearer " + token.access_token,
        "Content-Type": "text/plain",
      },
      body: Buffer.from(mime).toString("base64"),
    },
  );
  if (response.status !== 202) throw new HttpError(503, "DELIVERY_UNCERTAIN");
  return "outlook-accepted";
}
