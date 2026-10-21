// Agreements: the family the MyTerms record is the first kind of.
//
// Pinned: a MyTerms record maps to one agreement with the roster's title and
// text URL, the verdict read into a standing; the guard admits only a record
// with the members the pane reads; the standing per counterparty is the
// latest record, newest first.

import { test } from "node:test";
import assert from "node:assert/strict";

import { agreementFromTerms, isAgreement, standingAgreements, statusOfEffect } from "../dist/vtc/index.js";

const record = (over = {}) => ({
  vtaDid: "did:webvh:QmVta:dids.example.net:vta",
  communityDid: "did:webvh:QmCity:dids.mages.city:vtc",
  host: "join.mages.city",
  applicantDid: "did:webvh:QmBob:dids.example.net:bob",
  code: "SD-BASE-DP",
  agreementId: "a-1",
  requestId: "jr-1",
  effect: "allow",
  requestDigest: "zReq",
  replyDigest: "zRep",
  at: 1_791_460_900_000,
  ...over,
});

test("a MyTerms record becomes one agreement, with the roster's title and text, the verdict read as a standing", () => {
  const a = agreementFromTerms(record());
  assert.equal(a.kind, "myterms");
  assert.equal(a.id, "a-1");
  assert.equal(a.holder, record().applicantDid);
  assert.equal(a.counterparty, record().communityDid);
  assert.equal(a.site, "join.mages.city");
  assert.deepEqual(a.terms, {
    code: "SD-BASE-DP",
    title: "Service delivery, with data portability",
    url: "https://customercommons.org/agreements/SD-BASE-DP",
  });
  assert.deepEqual(a.reached, { requestId: "jr-1", requestDigest: "zReq", replyDigest: "zRep", at: 1_791_460_900_000 });
  assert.equal(a.status, "agreed");
  assert.equal(a.effect, "allow");
  assert.equal(a.via, "join-request", "made at a community's door");
  // A code the mirror does not carry keeps its code as the title and no URL:
  // the record says what was sent, and invents no text for it.
  const odd = agreementFromTerms(record({ code: "CITY-ONLY" }));
  assert.deepEqual(odd.terms, { code: "CITY-ONLY", title: "CITY-ONLY", url: "" });
});

test("the verdict effect reads into three standings and nothing else", () => {
  assert.equal(statusOfEffect("allow"), "agreed");
  assert.equal(statusOfEffect("deny"), "declined");
  for (const e of ["pending", "refer", "requestMore", ""]) assert.equal(statusOfEffect(e), "proffered", e);
  assert.equal(agreementFromTerms(record({ effect: "pending" })).status, "proffered");
});

test("the guard admits an agreement and refuses a record, junk, or a kind it does not know", () => {
  const a = agreementFromTerms(record());
  assert.equal(isAgreement(a), true);
  assert.equal(isAgreement(record()), false, "a MyTerms record is not yet an agreement");
  assert.equal(isAgreement({ ...a, kind: "other" }), false);
  assert.equal(isAgreement({ ...a, status: "maybe" }), false);
  assert.equal(isAgreement(null), false);
  assert.equal(isAgreement("agreement"), false);
});

test("what stands is the latest record per counterparty, newest first", () => {
  const city = agreementFromTerms(record());
  const cityLater = agreementFromTerms(record({ agreementId: "a-2", code: "SD-BASE", effect: "pending", at: city.reached.at + 1000 }));
  const other = agreementFromTerms(record({ agreementId: "b-1", communityDid: "did:webvh:QmOther:example.org:vtc", host: "other.example.org", at: city.reached.at - 5000 }));
  const standing = standingAgreements([other, cityLater, city]);
  assert.deepEqual(
    standing.map((s) => [s.counterparty, s.id]),
    [[cityLater.counterparty, "a-2"], [other.counterparty, "b-1"]],
  );
  assert.deepEqual(standingAgreements([]), []);
});
