import assert from 'node:assert/strict';
import test from 'node:test';
import { isSearchPage, refusedOnSearch } from '../apps/web/src/lib/security/search-bots';

test('clients that say they are automated are refused on the search page', () => {
  for (const agent of [
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.4; +https://openai.com/gptbot)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)',
    'Mozilla/5.0 (compatible; EDPCompanyIndex/1.0; +https://dubai-companies.edpid.org/bot)',
    'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
    'Mozilla/5.0 (compatible; SERankingBacklinksBot/1.0; +https://seranking.com/backlinks-crawler)',
    'Mozilla/5.0 (Linux; Android 7.0;) AppleWebKit/537.36 (HTML, like Gecko) Mobile Safari/537.36 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot',
    'Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', 'AdsBot-Google (+http://www.google.com/adsbot.html)', 'GoogleOther',
    'curl/8.7.1', 'Wget/1.21', 'python-requests/2.32.3', 'Scrapy/2.11 (+https://scrapy.org)', 'Go-http-client/2.0', '', '   ',
    'axios/1.7.7', 'node-fetch/1.0', 'undici', 'okhttp/4.12.0', 'Apache-HttpClient/4.5.14 (Java/17)', 'Java/17.0.2', 'GuzzleHttp/7', 'Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1',
  ]) assert.equal(refusedOnSearch(agent), true, agent);
  assert.equal(refusedOnSearch(null), true);
});

test('browsers, in-app browsers and link previews can use search', () => {
  for (const agent of [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/158.0.8127.35 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    'Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CUBOT) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 BOTIM/3.40',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]',
    'WhatsApp/2.23.20.0 A', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Twitterbot/1.0', 'TelegramBot (like TwitterBot)', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'LinkedInBot/1.0',
  ]) assert.equal(refusedOnSearch(agent), false, agent);
});

// Known gap: the release and browser checks send these, so they are allowed. A copied browser user agent is allowed too.
test('plain Node requests and headless Chrome are not recognised yet', () => {
  for (const agent of ['node', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/149.0 Safari/537.36'])
    assert.equal(refusedOnSearch(agent), false, agent);
});

test('only the search page is covered', () => {
  for (const path of ['/search', '/search/']) assert.equal(isSearchPage(path), true, path);
  for (const path of ['/', '/products', '/searching', '/search/x', '/api/search/suggest', '/products/search--PD1']) assert.equal(isSearchPage(path), false, path);
});
