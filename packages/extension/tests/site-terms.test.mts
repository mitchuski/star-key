// Where a community keeps its MyTerms configuration, for the 🤝 window: the
// page's claim to be a community is believed only when that community's
// verified DID document names the page's origin as its portal.

import test from "node:test";
import assert from "node:assert/strict";

import { siteTermsEndpoint, type SiteTermsDeps } from "../src/site-terms.ts";

const HOST = "did:webvh:QmHost:dids.acme.example:vtc";
const PORTAL = "https://vtc.acme.example";
const TERMS = "https://join.acme.example/myterms/configuration.json";
const VTA = { vtaDid: "did:webvh:QmVta:vta.example" };

function deps(result: Record<string, unknown> | null, asked: unknown[] = []): SiteTermsDeps {
  return {
    async active() {
      return { ok: true, vta: VTA };
    },
    async offscreen(_vta, op) {
      asked.push(op);
      return result ? { ok: true, result } : { ok: false, error: "the DID document could not be verified" };
    },
  };
}

test("a portal page is told where its community keeps its terms, on another host", async () => {
  const asked: unknown[] = [];
  const r = await siteTermsEndpoint(deps({ portalOrigin: PORTAL, endpoint: `${PORTAL}/v1`, termsEndpoint: TERMS }, asked), PORTAL, HOST);
  assert.deepEqual(r, { ok: true, communityDid: HOST, termsEndpoint: TERMS });
  assert.deepEqual(asked, [{ op: "portal", hostDid: HOST }]);
});

test("a community that names no MyTerms service has no endpoint", async () => {
  const r = await siteTermsEndpoint(deps({ portalOrigin: PORTAL, endpoint: `${PORTAL}/v1` }), PORTAL, HOST);
  assert.deepEqual(r, { ok: true, communityDid: HOST });
});

test("a page that is not the DID's portal learns nothing of its terms", async () => {
  const r = await siteTermsEndpoint(deps({ portalOrigin: PORTAL, endpoint: `${PORTAL}/v1`, termsEndpoint: TERMS }), "https://evil.example", HOST);
  assert.equal(r.ok, false);
  assert.equal("termsEndpoint" in r, false);
});

test("an unverifiable document, a non-DID and a non-origin are refused before anything is believed", async () => {
  assert.equal((await siteTermsEndpoint(deps(null), PORTAL, HOST)).ok, false);
  const asked: unknown[] = [];
  assert.equal((await siteTermsEndpoint(deps({ portalOrigin: PORTAL }, asked), PORTAL, "not a did")).ok, false);
  assert.equal((await siteTermsEndpoint(deps({ portalOrigin: PORTAL }, asked), `${PORTAL}/members/`, HOST)).ok, false);
  assert.equal(asked.length, 0);
});
