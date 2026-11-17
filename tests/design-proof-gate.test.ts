import { test } from "node:test";
import assert from "node:assert/strict";
import { directionProofAllowed } from "../apps/web/src/lib/design-proof-gate";
const local = {
  NODE_ENV: "development",
  APP_ENV: "development",
  ALMINA_DIRECTION_PROOF: "1",
  API_ORIGIN: "http://127.0.0.1:4871",
  LEGACY_API_ORIGIN: "http://localhost:4871",
};
test("direction proof requires explicit local development configuration", () => {
  assert.equal(directionProofAllowed(local), true);
  for (const key of Object.keys(local))
    assert.equal(
      directionProofAllowed({ ...local, [key]: undefined }),
      false,
      key,
    );
  for (const NODE_ENV of ["production", "test"])
    assert.equal(directionProofAllowed({ ...local, NODE_ENV }), false);
  for (const APP_ENV of ["production", "staging"])
    assert.equal(directionProofAllowed({ ...local, APP_ENV }), false);
  for (const origin of [
    "https://api.example.com",
    "http://127.0.0.1:4871/api",
    "http://user:pass@localhost",
    "http://localhost?remote=1",
    "http://localhost#x",
    "not-a-url",
    "https://localhost",
  ]) {
    for (const key of ["API_ORIGIN", "LEGACY_API_ORIGIN"])
      assert.equal(
        directionProofAllowed({ ...local, [key]: origin }),
        false,
        origin,
      );
  }
});
