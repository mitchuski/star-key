// MyTerms at the join door: the roster mirror, discovery, the one-round plan
// and the agreement record.
//
// Pinned: the roster is a fixed set no string can add to; the service is
// read only from a document's `MyTerms` service with an https endpoint; a
// configuration without `agreements` is not one; the plan is the person's
// agreement when accepted, else the community's counter-offer, else nothing;
// a record names both parties and the roster reference, and is built only
// for a roster code.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MYTERMS_ROSTER,
  MYTERMS_EXTENSION,
  MYTERMS_PROFILE,
  rosterAgreement,
  myTermsEndpoint,
  checkMyTermsConfiguration,
  fetchCommunityTerms,
  planTerms,
  offersOf,
  buildVca,
  myTermsExtension,
  MyTermsConfigurationError,
} from "../dist/vtc/index.js";

const VTC = "did:webvh:QmCity:dids.mages.city:vtc";
const BOB = "did:webvh:QmBob:dids.example.net:bob";
const CONFIG_URL = "https://join.mages.city/.well-known/myterms-configuration";

test("the roster: six service-delivery codes, most protective first, none invented", () => {
  assert.deepEqual(
    MYTERMS_ROSTER.map((a) => a.code),
    ["SD-BASE-DP", "SD-BASE", "SD-BASE-A", "SD-BASE-AT", "SD-BASE-ATP", "SD-BASE-ATP-S3P"],
  );
  for (const a of MYTERMS_ROSTER) {
    assert.ok(a.title && a.meaning && a.url.startsWith("https://customercommons.org/"), a.code);
    assert.ok(a.permitted.length >= 1 && a.prohibited.length >= 1, a.code);
  }
  assert.equal(rosterAgreement("SD-BASE-AT")?.code, "SD-BASE-AT");
  assert.equal(rosterAgreement("SD-BASE-XYZ"), undefined);
  assert.equal(rosterAgreement(42), undefined);
});

test("the MyTerms service is read from a document, https only, string or {uri}", () => {
  const doc = (ep) => ({ id: VTC, service: [{ id: `${VTC}#vtc-rest`, type: "VTCRest", serviceEndpoint: "https://vtc.mages.city/v1" }, { id: `${VTC}#myterms`, type: "MyTerms", serviceEndpoint: ep }] });
  assert.equal(myTermsEndpoint(doc(CONFIG_URL)), CONFIG_URL);
  assert.equal(myTermsEndpoint(doc({ uri: CONFIG_URL })), CONFIG_URL);
  assert.equal(myTermsEndpoint(doc("http://join.mages.city/x")), undefined, "https only");
  assert.equal(myTermsEndpoint(doc("not a url")), undefined);
  assert.equal(myTermsEndpoint({ id: VTC, service: [{ type: "VTCRest", serviceEndpoint: "https://x/v1" }] }), undefined, "no service");
  assert.equal(myTermsEndpoint(null), undefined);
});

test("a configuration: accepted roster codes sorted by protection, unknown codes kept apart", () => {
  const c = checkMyTermsConfiguration(
    { version: "1", agreements: [{ code: "SD-BASE-AT" }, "SD-BASE", { code: "CITY-SPECIAL" }, { code: "SD-BASE" }], counterOffer: "SD-BASE", agreementsUrl: "https://join.mages.city/myterms/" },
    CONFIG_URL,
  );
  assert.deepEqual(c, { endpoint: CONFIG_URL, accepts: ["SD-BASE", "SD-BASE-AT"], unknown: ["CITY-SPECIAL"], counterOffer: "SD-BASE", agreementsUrl: "https://join.mages.city/myterms/" });
  // A counter-offer the community does not itself accept is dropped.
  assert.equal(checkMyTermsConfiguration({ agreements: ["SD-BASE-AT"], counterOffer: "SD-BASE" }, CONFIG_URL).counterOffer, undefined);
  for (const bad of [null, "x", {}, { agreements: "SD-BASE" }]) {
    assert.throws(() => checkMyTermsConfiguration(bad, CONFIG_URL), MyTermsConfigurationError);
  }
});

test("fetching the configuration is a plain GET, no redirects, and a non-2xx is refused", async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, method: init.method, redirect: init.redirect });
    return new Response(JSON.stringify({ agreements: ["SD-BASE"] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = await fetchCommunityTerms(CONFIG_URL, { fetch });
  assert.deepEqual(c.accepts, ["SD-BASE"]);
  assert.deepEqual(calls, [{ url: CONFIG_URL, method: "GET", redirect: "error" }]);
  await assert.rejects(
    fetchCommunityTerms(CONFIG_URL, { fetch: async () => new Response("nope", { status: 404 }) }),
    MyTermsConfigurationError,
  );
});

test("the plan: the person's agreement when accepted, else the counter-offer, else nothing", () => {
  const community = { endpoint: CONFIG_URL, accepts: ["SD-BASE", "SD-BASE-AT"], unknown: [] };
  assert.deepEqual(planTerms("SD-BASE-AT", community), { ok: true, code: "SD-BASE-AT", counter: false });
  assert.deepEqual(planTerms("SD-BASE-DP", community), { ok: true, code: "SD-BASE", counter: true, declined: "SD-BASE-DP" });
  assert.deepEqual(planTerms(undefined, community), { ok: true, code: "SD-BASE", counter: true });
  assert.deepEqual(planTerms("SD-BASE-DP", { ...community, counterOffer: "SD-BASE-AT" }), { ok: true, code: "SD-BASE-AT", counter: true, declined: "SD-BASE-DP" });
  assert.deepEqual(planTerms("SD-BASE", undefined), { ok: false, reason: "not-offered" });
  assert.deepEqual(planTerms("SD-BASE", { ...community, accepts: [] }), { ok: false, reason: "no-match" });
  // A preference the roster does not carry is no preference.
  assert.deepEqual(planTerms("SD-BASE-XYZ", community), { ok: true, code: "SD-BASE", counter: true });
});

test("the record names both parties, the roster reference and the profile; only a roster code builds one", () => {
  const vca = buildVca(BOB, VTC, "SD-BASE-AT", 1_791_460_900_123);
  assert.equal(vca.version, "1");
  assert.equal(vca.profile, MYTERMS_PROFILE);
  assert.deepEqual(vca.references, [{ code: "SD-BASE-AT", url: "https://customercommons.org/agreements/SD-BASE-AT" }]);
  assert.deepEqual(vca.ids, [BOB, VTC]);
  assert.equal(vca.created, 1_791_460_900);
  assert.match(vca.agreementId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(vca.validRoles, ["first-party", "second-party"]);
  assert.ok(vca.permitted.length && vca.prohibited.length);
  assert.notEqual(buildVca(BOB, VTC, "SD-BASE-AT", 0).agreementId, vca.agreementId, "unique per record");
  assert.throws(() => buildVca(BOB, VTC, "SD-BASE-XYZ", 0), /not a roster agreement/);
  const ext = myTermsExtension(vca);
  assert.deepEqual(Object.keys(ext), [MYTERMS_EXTENSION]);
  assert.deepEqual(ext[MYTERMS_EXTENSION], { version: "1", agreement: vca });
});

test("offers: one code or an ordered list, roster codes only, no repeats; the plan takes the first accepted", () => {
  assert.deepEqual(offersOf("SD-BASE"), ["SD-BASE"]);
  assert.deepEqual(offersOf(["SD-BASE-DP", "CITY-ONLY", "SD-BASE", "SD-BASE-DP"]), ["SD-BASE-DP", "SD-BASE"]);
  assert.deepEqual(offersOf(undefined), []);
  const community = checkMyTermsConfiguration({ agreements: [{ code: "SD-BASE" }, { code: "SD-BASE-AT" }], counterOffer: "SD-BASE" }, CONFIG_URL);
  assert.deepEqual(planTerms(["SD-BASE-DP", "SD-BASE-AT", "SD-BASE"], community), { ok: true, code: "SD-BASE-AT", counter: false });
  assert.deepEqual(planTerms(["SD-BASE-DP", "SD-BASE-ATP"], community), { ok: true, code: "SD-BASE", counter: true, declined: "SD-BASE-DP" });
  assert.deepEqual(planTerms([], community), { ok: true, code: "SD-BASE", counter: true });
});
