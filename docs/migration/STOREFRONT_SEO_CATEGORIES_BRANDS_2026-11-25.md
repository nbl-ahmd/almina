# Category and brand SEO — 25 November 2026

The owner asked for SEO-friendly category and brand pages with good content. This was audited with the `seo-audit` skill by rendering
the pages on the local preview and reading their titles, descriptions, headings, canonicals and JSON-LD. The preview runs with
`noindex` by design; production indexing is unchanged.

## Findings

| Issue | Evidence | Impact |
|---|---|---|
| Brand pages existed only for 10 hard-coded brands | `/brands/chanel` returned 404 | High: most brands had no landing page |
| Every brand link went to `/search?q=…` (home tiles, brands index, product page) | Probe counted 8 search links and 0 brand links on home | High: authority flowed into non-indexable search results |
| Category titles were bare ("Skin Care \| Al Mina Pharmacy", 28 characters) | Probe | Medium |
| Category pages had only BreadcrumbList; their FAQs were visible but unmarked | Probe | Medium |
| Brand pages were missing from the sitemap | `app/sitemaps/[kind]/[page]/route.ts` | Medium |

## Changes

- **Brand landing pages for every catalogue brand.** A staff-written brand page (Website & growth → Pages, kind *brand*) still takes
  precedence. Otherwise any brand on a live catalogue product gets `/brands/<slug>`, using `brandSlug()` ("Dolce & Gabbana" →
  `dolce-gabbana`).
  - The generated content is **facts from the live catalogue only**: product count, the categories they are in (each linked), how many
    are in stock, and the current price range. It makes no health or efficacy claims.
  - The title is "<Brand> Products in Ras Al Khaimah | Al Mina Pharmacy", and the H1 is the brand name.
  - Breadcrumbs: Home → Brands → Brand.
- **Brand links** on home, the brands index and the product page now go to the brand pages instead of search.
- **Category pages:**
  - the title is "<Category> Products in Ras Al Khaimah" (about 55 characters);
  - a "Brands in <Category>" list links to the brand pages for what the category actually stocks;
  - JSON-LD adds a CollectionPage with an ItemList of the products shown, and an FAQPage for the visible questions.
- **Brands index:** CollectionPage JSON-LD.
- **Sitemap:** the static sitemap lists brand pages for in-stock brands, read from up to 20 catalogue pages of 30.
- **Helpers:** `collectionData()` and `faqData()` in `lib/seo.ts`. FAQ markup is emitted only where the same questions are visible.

## Content guidance for staff

Generated pages are a floor, not a ceiling. For important brands and categories, write a page in Website & growth: an original
description, a useful body, and FAQs answered by the pharmacy. Health content needs a named pharmacy reviewer, which the existing
publish rules enforce. Do not copy manufacturer text verbatim.

## Not done

Search Console data was not available, so there is no ranking or traffic baseline. Rich results were not validated in Google's Rich
Results Test, because the pages are local only. Check them after deploy.
