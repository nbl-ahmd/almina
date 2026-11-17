import { test } from "node:test";
import assert from "node:assert/strict";
import {
  proofListingReturn,
  proofSuggestionHref,
} from "../apps/web/src/lib/design-proof-navigation";
test("proof return/suggestion URLs reject external schemes and nonlisting destinations", () => {
  for (const url of [
    "//evil.invalid",
    "javascript:alert(1)",
    "https://evil.invalid",
    "/design-proof/products/other",
    "/design-proof/products/../checkout",
    "/design-proof/products\\x",
    "/design-proof/products\n",
  ])
    assert.equal(proofListingReturn(url), "/design-proof/products");
  for (const url of [
    "//evil.invalid",
    "javascript:alert(1)",
    "https://evil.invalid",
    "/api/customer/me",
    "/admin",
    "/search\\evil",
  ])
    assert.equal(proofSuggestionHref(url), null);
  assert.equal(
    proofListingReturn(
      "/design-proof/products?q=CeraVe&sort=price-asc&admin=true",
    ),
    "/design-proof/products?q=CeraVe&sort=price-asc",
  );
  assert.equal(
    proofSuggestionHref("/search?q=care"),
    "/design-proof/products?q=care",
  );
  assert.equal(
    proofSuggestionHref("/products/sample--PD1186"),
    "/design-proof/products/sample--PD1186",
  );
  assert.equal(
    proofSuggestionHref("/categories/skin--aaaaaaaaaaaaaaaaaaaaaaaa"),
    "/design-proof/products?category=aaaaaaaaaaaaaaaaaaaaaaaa",
  );
  assert.equal(
    proofSuggestionHref("/collections/skin-care"),
    "/collections/skin-care",
  );
});
