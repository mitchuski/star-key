// A portal page's `window.vtaWallet.membership.status`.
//
// The gates run here as they run in the background, against fakes for the
// offscreen document: the page must be the community's portal by its DID
// document, and the answer is the wallet's own record — the identities it
// signs in with there and its standing agreement — never a credential.

import test from "node:test";
import assert from "node:assert/strict";

import { MembershipPageGates, membershipPageParamsRefusal, membershipView, type MembershipPageDeps } from "../src/membership-page.ts";
import type { Agreement } from "@openvtc/pnm-core/vtc";
import type { CarriedHold } from "../src/star-hold-carried.ts";

const HOST = "did:webvh:QmHost:acme.example";
const PORTAL = "https://members.acme.example";
const MEMBER = "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp";
const VTA = { vtaDid: "did:webvh:QmVta:vta.example" };

const agreement = (over: Partial<Agreement> = {}): Agreement => ({
  id: "a-1",
  kind: "myterms",
  vtaDid: VTA.vtaDid,
  holder: MEMBER,
  counterparty: HOST,
  site: "members.acme.example",
  terms: { code: "SD-BASE-DP", title: "Service delivery, with data portability", url: "" },
  reached: { requestId: "jr-1", requestDigest: "zReq", replyDigest: "zRep", at: 1_791_460_900_000 },
  status: "agreed",
  effect: "allow",
  via: "join-request",
  ...over,
});

const CARRIED: CarriedHold = { root: "sha256:" + "a".repeat(64), count: 7, bearer: "did:key:z6MkBearer", kappa: "sha256:" + "b".repeat(64), at: "2026-10-21T00:00:00.000Z", carriedAt: "2026-10-21T12:00:00.000Z" };

function harness(opts: { members?: string[]; agreements?: Agreement[]; portal?: string; hold?: CarriedHold } = {}) {
  const asked: string[] = [];
  const deps: MembershipPageDeps = {
    async active() {
      return { ok: true, vta: VTA };
    },
    async offscreen(_vta, op) {
      asked.push(op.op);
      if (op.op === "portal") return { ok: true, result: { portalOrigin: opts.portal ?? PORTAL, endpoint: "https://vtc.acme.example/v1/trust-tasks" } };
      if (op.op === "members") return { ok: true, result: opts.members ?? [MEMBER] };
      return { ok: false, error: `unexpected ${op.op}` };
    },
    async agreements() {
      return opts.agreements ?? [];
    },
    async hold() {
      return opts.hold;
    },
    now: () => 1_000,
  };
  return { gates: new MembershipPageGates(deps), asked };
}

test("the call must be exactly {op: status, hostDid}", () => {
  assert.equal(membershipPageParamsRefusal({ op: "status", hostDid: HOST }), null);
  assert.match(membershipPageParamsRefusal({ op: "list", hostDid: HOST }) ?? "", /unknown/);
  assert.match(membershipPageParamsRefusal({ op: "status", hostDid: HOST, member: MEMBER }) ?? "", /takes no `member`/);
  assert.match(membershipPageParamsRefusal({ op: "status", hostDid: "acme" }) ?? "", /must be a DID/);
  assert.match(membershipPageParamsRefusal("status") ?? "", /object/);
});

test("the view: a member with the standing agreement; not a member when the wallet signs in nowhere there; the community's own DID never counts", () => {
  assert.deepEqual(membershipView(HOST, [], []), { member: false });
  assert.deepEqual(membershipView(HOST, [HOST], [agreement()]), { member: false });
  assert.deepEqual(membershipView(HOST, [MEMBER, MEMBER], []), { member: true, identities: [MEMBER] });
  const later = agreement({ id: "a-2", terms: { code: "SD-BASE", title: "Service delivery only", url: "" }, status: "proffered", effect: "pending", reached: { requestId: "jr-2", requestDigest: "r", replyDigest: "p", at: 1_791_460_999_000 } });
  const other = agreement({ id: "o-1", counterparty: "did:webvh:QmOther:other.example" });
  assert.deepEqual(membershipView(HOST, [MEMBER], [agreement(), later, other]), {
    member: true,
    identities: [MEMBER],
    agreement: { code: "SD-BASE", status: "proffered", at: 1_791_460_999_000 },
  });
});

test("only the community's portal is answered, by the origin its DID document names", async () => {
  const { gates, asked } = harness({ agreements: [agreement()] });
  const ok = await gates.handle(PORTAL, { op: "status", hostDid: HOST });
  assert.deepEqual(ok, { ok: true, result: { member: true, identities: [MEMBER], agreement: { code: "SD-BASE-DP", status: "agreed", at: 1_791_460_900_000 } } });
  assert.deepEqual(asked, ["portal", "members"], "no prompt, no other work");
  const no = await gates.handle("https://evil.example", { op: "status", hostDid: HOST });
  assert.equal(no.ok, false);
  assert.match((no as { error: string }).error, /is not .* portal/);
  assert.deepEqual(asked, ["portal", "members"], "the portal is cached; nothing else was asked for the stranger");
});

test("a visitor whose wallet holds no identity at the community is told so, and nothing about the wallet", async () => {
  const { gates } = harness({ members: [] });
  assert.deepEqual(await gates.handle(PORTAL, { op: "status", hostDid: HOST }), { ok: true, result: { member: false } });
});

test("what the wallet carries of a Hold rides in the member view: the root and the count, never the bearer, the κ or an item", async () => {
  assert.deepEqual(membershipView(HOST, [MEMBER], [], CARRIED), {
    member: true,
    identities: [MEMBER],
    hold: { root: CARRIED.root, count: 7, at: CARRIED.at },
  });
  assert.deepEqual(membershipView(HOST, [MEMBER], [], undefined), { member: true, identities: [MEMBER] });
  assert.deepEqual(membershipView(HOST, [], [], CARRIED), { member: false }, "a stranger is told nothing of the Hold");
  const { gates } = harness({ hold: CARRIED });
  const got = await gates.handle(PORTAL, { op: "status", hostDid: HOST });
  assert.deepEqual(got, { ok: true, result: { member: true, identities: [MEMBER], hold: { root: CARRIED.root, count: 7, at: CARRIED.at } } });
  const none = new MembershipPageGates({
    async active() { return { ok: true, vta: VTA }; },
    async offscreen(_vta, op) { return op.op === "portal" ? { ok: true, result: { portalOrigin: PORTAL, endpoint: "https://vtc.acme.example/v1/trust-tasks" } } : { ok: true, result: [MEMBER] }; },
    async agreements() { return []; },
    now: () => 1,
  });
  assert.deepEqual(await none.handle(PORTAL, { op: "status", hostDid: HOST }), { ok: true, result: { member: true, identities: [MEMBER] } }, "a wallet without the dependency answers as before");
});
