// MyTerms as the draft task `myterms/propose/0.1`, the individual's side.
//
// Each test is a theorem of the task's Lean model
// (mitchuski/trust-tasks-formal, TrustTasks/MyTerms.lean) replayed against
// the code, with the model's own runs: parties 10 (the proposer), 20 (the
// entity), 30 (a third party); roster agreements 7 and 8; requests 1, 2, 3.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MYTERMS_EXTENSION,
  MYTERMS_PROPOSE_DRAFT,
  admissible,
  answerRefusal,
  buildProposal,
  buildVca,
  checkMyTermsConfiguration,
  contractsOf,
  followUpFor,
  myTermsExtension,
  proposalExtension,
  proposalFor,
  responseRefusal,
  rosterRefOf,
} from "../dist/vtc/index.js";

const P10 = "did:key:z6MkTen";
const P20 = "did:web:shop.example";
const P30 = "did:key:z6MkThirty";
const A7 = "https://roster.example/p7012#SD-BASE";
const A8 = "https://roster.example/p7012#SD-BASE-A";
const A9 = "https://roster.example/p7012#NOT-AN-ENTRY";
const ROSTER = { uri: "https://roster.example/p7012", version: "2025", digestMultibase: "zQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR" };
const check = { inRoster: (a) => a === A7 || a === A8 };

const req = (id, issuer, agreement, respondsTo) => ({
  id: `urn:req:${id}`,
  issuer,
  recipient: P20,
  agreement,
  roster: ROSTER,
  ...(respondsTo ? { respondsTo: `urn:req:${respondsTo}` } : {}),
});
const resp = (q, decision, more = {}) => ({
  issuer: P20,
  decision,
  recordedAt: "2026-11-02T10:00:01Z",
  taskContext: q.id,
  taskDigestMultibase: "zQmWAWEtpUqE3xd3LUpZ8GryGrZMCqH1A5D7bZcayvEfJTK",
  ...more,
});
const accepted = (q, n = 1) => resp(q, "accepted", { agreement: q.agreement, contractId: `c-${n}` });

// The model's runs.
const offerReq = req(1, P10, A7);
const offerToTen = [offerReq, resp(offerReq, "alternative", { alternative: A8 })];
const take1Req = req(2, P10, A8, 1);

test("Resp.wf / decision_iff_contract: decision is accepted exactly when a contract identifier is present", () => {
  assert.equal(responseRefusal(accepted(offerReq)), null);
  assert.equal(responseRefusal(resp(offerReq, "alternative", { alternative: A8 })), null);
  assert.equal(responseRefusal(resp(offerReq, "rejected")), null);
  // every other pairing of members and decision is refused
  assert.match(responseRefusal(resp(offerReq, "accepted", { agreement: A7 })), /contract identifier/);
  assert.match(responseRefusal(resp(offerReq, "accepted", { agreement: A7, contractId: "c", alternative: A8 })), /beside an alternative/);
  assert.match(responseRefusal(resp(offerReq, "alternative", { alternative: A8, contractId: "c" })), /beside/);
  assert.match(responseRefusal(resp(offerReq, "rejected", { contractId: "c" })), /rejection beside/);
  assert.match(responseRefusal(resp(offerReq, "countered")), /decision is not/);
  assert.match(responseRefusal({ decision: "rejected" }), /no recordedAt/);
});

test("decision_member_suffices: an accepted step gives a contract for the agreement the request named, in the roster", () => {
  const run = [[offerReq, accepted(offerReq)]];
  assert.equal(admissible(run, check), null);
  assert.deepEqual(contractsOf(run, check), [
    { contractId: "c-1", agreement: A7, individual: P10, entity: P20, requestId: offerReq.id, recordedAt: "2026-11-02T10:00:01Z" },
  ]);
  // an entity that would accept something else answers `alternative`
  assert.match(answerRefusal([], offerReq, resp(offerReq, "accepted", { agreement: A8, contractId: "c" }), check), /not proposed/);
  // and an agreement outside the roster is never decided
  const out = req(1, P10, A9);
  assert.match(answerRefusal([], out, accepted(out), check), /not in the roster/);
  assert.match(answerRefusal([], offerReq, resp(offerReq, "alternative", { alternative: A9 }), check), /alternative offered is not in the roster/);
});

test("presence_completion_unsound: a rejected engagement has a response and no contract", () => {
  const rejectedRun = [[offerReq, resp(offerReq, "rejected")]];
  assert.equal(admissible(rejectedRun, check), null);
  assert.equal(rejectedRun.some(([, r]) => r !== null), true, "complete by presence");
  assert.deepEqual(contractsOf(rejectedRun, check), []);
});

test("followup_bound: the one follow-up is the proposer's, to the same entity, taking exactly the alternative", () => {
  assert.deepEqual(followUpFor([offerToTen], offerReq.id), { agreement: A8, roster: ROSTER, respondsTo: offerReq.id });
  assert.equal(answerRefusal([offerToTen], take1Req, accepted(take1Req), check), null);
  // taking something other than the alternative offered
  const other = req(2, P10, A7, 1);
  assert.match(answerRefusal([offerToTen], other, accepted(other), check), /does not take an alternative/);
  // to another entity
  const elsewhere = { ...take1Req, recipient: "did:web:other.example" };
  assert.match(answerRefusal([offerToTen], elsewhere, { ...accepted(elsewhere), issuer: elsewhere.recipient }, check), /does not take an alternative/);
  // answered with another alternative
  assert.match(answerRefusal([offerToTen], take1Req, resp(take1Req, "alternative", { alternative: A7 }), check), /another alternative/);
  // no follow-up to a request that was accepted, rejected, refused or is itself a follow-up
  assert.equal(followUpFor([[offerReq, accepted(offerReq)]], offerReq.id), undefined);
  assert.equal(followUpFor([[offerReq, resp(offerReq, "rejected")]], offerReq.id), undefined);
  assert.equal(followUpFor([[offerReq, null]], offerReq.id), undefined);
  assert.equal(followUpFor([offerToTen, [take1Req, resp(take1Req, "rejected")]], take1Req.id), undefined);
});

test("issuer_binding_needed: a third party cannot take the alternative offered to someone else", () => {
  const hijack = req(2, P30, A8, 1);
  assert.match(answerRefusal([offerToTen], hijack, accepted(hijack), check), /this entity offered this proposer/);
  assert.deepEqual(contractsOf([offerToTen, [hijack, accepted(hijack)]], check), []);
});

test("at_most_one_followup / round_limit_needed: a rejected follow-up is not retried until accepted", () => {
  const take1 = [take1Req, resp(take1Req, "rejected")];
  const take2 = req(3, P10, A8, 1);
  assert.equal(admissible([offerToTen, take1], check), null);
  assert.match(answerRefusal([offerToTen, take1], take2, accepted(take2, 2), check), /already answered/);
  assert.equal(followUpFor([offerToTen, take1], offerReq.id), undefined);
  // a follow-up the entity refused to consider does not use up the round
  assert.deepEqual(followUpFor([offerToTen, [take1Req, null]], offerReq.id), { agreement: A8, roster: ROSTER, respondsTo: offerReq.id });
  assert.equal(answerRefusal([offerToTen, [take1Req, null]], take2, accepted(take2, 2), check), null);
});

test("ceremony_sound_nonvacuous: propose 7, alternative 8, follow-up taking 8, accepted", () => {
  const fullRun = [offerToTen, [take1Req, accepted(take1Req)]];
  assert.equal(admissible(fullRun, check), null);
  const [contract] = contractsOf(fullRun, check);
  assert.deepEqual(
    { agreement: contract.agreement, individual: contract.individual, entity: contract.entity, requestId: contract.requestId },
    { agreement: A8, individual: P10, entity: P20, requestId: take1Req.id },
  );
});

test("an answer is believed only from the entity asked, for this request, citing its digest", () => {
  assert.match(answerRefusal([], offerReq, { ...accepted(offerReq), issuer: P30 }, check), /not from the entity/);
  assert.match(answerRefusal([], offerReq, { ...accepted(offerReq), taskContext: "urn:req:other" }, check), /another request/);
  assert.match(answerRefusal([], offerReq, accepted(offerReq), { ...check, requestDigest: "zOther" }), /digest/);
  assert.equal(answerRefusal([], offerReq, accepted(offerReq), { ...check, requestDigest: accepted(offerReq).taskDigestMultibase }), null);
});

test("a roster is pinned by uri, version and digest, or it is not pinned", () => {
  assert.deepEqual(rosterRefOf(ROSTER), ROSTER);
  assert.equal(rosterRefOf("https://customercommons.org/agreements/"), undefined);
  assert.equal(rosterRefOf({ uri: ROSTER.uri, version: "2025" }), undefined);
  assert.equal(rosterRefOf({ ...ROSTER, uri: "http://roster.example/p7012" }), undefined);
  assert.throws(() => buildProposal("SD-BASE", ROSTER), /not an agreement IRI/);
  assert.throws(() => buildProposal(A7, { uri: ROSTER.uri, version: "2025" }), /not pinned/);
});

test("carriage: the proposal rides in the join request's MyTerms entry only where the configuration pins the roster", () => {
  const ENDPOINT = "https://join.example/myterms/configuration.json";
  const unpinned = checkMyTermsConfiguration({ agreements: [{ code: "SD-BASE" }], roster: "https://customercommons.org/agreements/" }, ENDPOINT);
  assert.equal(unpinned.roster, undefined);
  assert.equal(proposalFor("SD-BASE", unpinned), undefined);

  const pinned = checkMyTermsConfiguration({ agreements: [{ code: "SD-BASE", iri: A7 }, { code: "SD-BASE-A" }], roster: ROSTER }, ENDPOINT);
  assert.deepEqual(pinned.roster, ROSTER);
  assert.deepEqual(pinned.agreementIris, { "SD-BASE": A7 });
  const proposal = proposalFor("SD-BASE", pinned);
  assert.deepEqual(proposal, { agreement: A7, roster: ROSTER });
  assert.equal(proposalFor("SD-BASE-A", pinned), undefined, "an accepted code with no IRI in the roster makes no proposal");

  const vca = buildVca(P10, P20, "SD-BASE", 1_791_460_900_000);
  const entry = myTermsExtension(vca, proposalExtension(proposal))[MYTERMS_EXTENSION];
  assert.deepEqual(entry.proposal, { task: MYTERMS_PROPOSE_DRAFT, payload: { agreement: A7, roster: ROSTER } });
  assert.equal(entry.agreement, vca);
  assert.deepEqual(Object.keys(myTermsExtension(vca)[MYTERMS_EXTENSION]), ["version", "agreement"]);
});
