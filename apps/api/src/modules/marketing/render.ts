import mjml2html from "mjml";
import sanitizeHtml from "sanitize-html";
import { HttpError } from "../../errors.js";
const layout = [
  "mjml",
  "mj-head",
  "mj-title",
  "mj-preview",
  "mj-attributes",
  "mj-all",
  "mj-class",
  "mj-body",
  "mj-wrapper",
  "mj-section",
  "mj-group",
  "mj-column",
  "mj-text",
  "mj-image",
  "mj-button",
  "mj-divider",
  "mj-spacer",
  "mj-table",
  "mj-social",
  "mj-social-element",
  "mj-hero",
];
const text = [
  "p",
  "br",
  "a",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "span",
  "div",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "th",
  "tbody",
  "thead",
];
/** Only declarative email markup. No filesystem includes, raw HTML blocks, scripts or remote CSS. */
export async function renderMarketingEmail(source: string) {
  if (
    source.length > 120000 ||
    /<!|<\?|<\/?(?:mj-include|mj-raw|mj-style|mj-font|script|iframe|object|embed|form|input)\b|\bon[a-z]+\s*=|url\s*\(|@import|\{\{/i.test(
      source,
    )
  )
    throw new HttpError(400, "INVALID_REQUEST");
  const clean = sanitizeHtml(source, {
    allowedTags: [...layout, ...text],
    allowedAttributes: {
      "*": [
        "href",
        "src",
        "alt",
        "title",
        "target",
        "rel",
        "width",
        "height",
        "align",
        "vertical-align",
        "padding",
        "padding-top",
        "padding-bottom",
        "padding-left",
        "padding-right",
        "background-color",
        "color",
        "font-size",
        "font-family",
        "font-weight",
        "line-height",
        "letter-spacing",
        "text-align",
        "border",
        "border-radius",
        "border-color",
        "border-width",
        "container-background-color",
        "css-class",
        "mj-class",
        "direction",
        "full-width",
        "fluid-on-mobile",
        "srcset",
        "cellpadding",
        "cellspacing",
        "colspan",
        "role",
      ],
    },
    allowedSchemes: ["https", "mailto", "tel"],
    allowProtocolRelative: false,
    parser: { lowerCaseTags: true, lowerCaseAttributeNames: true },
  });
  if (!clean.includes("<mjml") || !clean.includes("<mj-body"))
    throw new HttpError(400, "INVALID_REQUEST");
  try {
    const result = await mjml2html(clean, {
      validationLevel: "strict",
      ignoreIncludes: true,
      fonts: {},
    });
    if (result.errors.length || Buffer.byteLength(result.html) > 300000)
      throw Error();
    return { mjml: clean, html: result.html };
  } catch {
    throw new HttpError(400, "INVALID_REQUEST");
  }
}
export function emailFooter(unsubscribe: string, address: string) {
  const escape = (value: string) =>
    sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replaceAll(
      '"',
      "&quot;",
    );
  return `<div style="padding:24px;text-align:center;font:12px Arial,sans-serif;color:#56605d"><p>Al Mina Pharmacy · ${escape(address)}</p><a href="${escape(unsubscribe)}">Unsubscribe from marketing emails</a></div>`;
}
