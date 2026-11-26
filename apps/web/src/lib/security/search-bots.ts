// Each search page render runs a live search, so automated clients are refused before it. This recognises clients that say what
// they are; one that copies a browser's user agent cannot be told apart here. See docs/migration/BANDWIDTH_OPTIMIZATION_2026-11-26.md.
// `bot` must end a word, so BOTIM does not match; CUBOT is a phone maker.
const automated = /(?<!cu)bot(?![a-z])|crawl|spider|slurp|externalagent|externalfetcher|EDPCompanyIndex|GoogleOther|python-requests|python-urllib|aiohttp|httpx|scrapy|go-http-client|libwww-perl|axios|node-fetch|undici|okhttp|apache-httpclient|guzzle|phantomjs|^java\/|^curl\/|^wget\//i;
// These read one page because a person shared its link, to show a preview.
const linkPreview = /facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|SkypeUriPreview/i;
export const isSearchPage = (path: string) => /^\/search\/?$/.test(path);
export function refusedOnSearch(userAgent: string | null): boolean {
  const agent = userAgent?.trim() ?? '';
  return !agent || (automated.test(agent) && !linkPreview.test(agent));
}
