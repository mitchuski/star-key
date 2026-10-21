// The 🤝 window, rendered: besides the ways of giving a DID, it shows what
// already stands between this wallet and the site the person was on, or the
// community whose DID is in the field — the agreements, read locally.

import { test } from "node:test";
import assert from "node:assert/strict";
import { h, render } from "./harness/dom.mjs";
import { JoinView } from "../src/join-view.js";
import { agreementsWith } from "../src/agreements-store.js";
import type { Agreement } from "@openvtc/pnm-core/vtc";

const CITY = "did:webvh:QmCity:dids.mages.city:vtc";
const FIRST = "did:webvh:QmFirst:webvh.storm.ws:first-vtc";

const agreement = (over: Partial<Agreement> = {}): Agreement => ({
  id: "a-1",
  kind: "myterms",
  vtaDid: "did:webvh:QmVta:dids.example.net:vta",
  holder: "did:webvh:QmBob:dids.example.net:bob",
  counterparty: CITY,
  site: "join.mages.city",
  terms: { code: "SD-BASE-DP", title: "Service delivery, with data portability", url: "https://customercommons.org/agreements/SD-BASE-DP" },
  reached: { requestId: "jr-1", requestDigest: "zReq", replyDigest: "zRep", at: Date.UTC(2026, 9, 21) },
  status: "agreed",
  effect: "allow",
  ...over,
});

const chrome = { runtime: { sendMessage: async () => ({ ok: true }) } };

test("agreementsWith matches a site by host, a community by DID, newest first, and nothing by default", () => {
  const a = agreement();
  const b = agreement({ id: "b-1", counterparty: FIRST, site: "first.openvtc.net", reached: { ...a.reached, at: a.reached.at + 1 } });
  assert.deepEqual(agreementsWith([a, b], { host: "JOIN.mages.city" }).map((r) => r.id), ["a-1"]);
  assert.deepEqual(agreementsWith([a, b], { counterparty: FIRST }).map((r) => r.id), ["b-1"]);
  assert.deepEqual(agreementsWith([a, b], { host: "join.mages.city", counterparty: FIRST }).map((r) => r.id), ["b-1", "a-1"]);
  assert.deepEqual(agreementsWith([a, b], {}), []);
});

test("on a site the wallet has an agreement with, the 🤝 window shows it and offers the console", async () => {
  let opened = 0;
  const screen = await render(
    h(JoinView, {
      pageHost: async () => "join.mages.city",
      readAgreements: async () => [agreement(), agreement({ id: "x-1", counterparty: FIRST, site: "first.openvtc.net" })],
      openConsole: () => {
        opened++;
      },
    }),
    { chrome },
  );
  await screen.settle();
  const text = screen.text();
  assert.match(text, /With join\.mages\.city/);
  assert.equal(screen.container.querySelector('[data-testid="handshake"]')!.getAttribute("data-state"), "agreed");
  assert.equal(screen.container.querySelectorAll('[data-testid="join-agreement"]').length, 1, "only this site's");
  assert.match(text, /SD-BASE-DP · agreed · 2026-10-21/);
  await screen.click(screen.container.querySelector('[data-testid="join-agreements-open"]')!);
  assert.equal(opened, 1);
});

test("on a site with no agreement, the block says none yet; a DID typed into the field brings that community's", async () => {
  const screen = await render(
    h(JoinView, {
      pageHost: async () => "example.org",
      readAgreements: async () => [agreement({ counterparty: FIRST, site: "first.openvtc.net", status: "proffered", effect: "pending" })],
    }),
    { chrome },
  );
  await screen.settle();
  assert.ok(screen.container.querySelector('[data-testid="join-agreements-none"]'), "none yet with example.org");
  await screen.type(screen.container.querySelector<HTMLInputElement>('[data-testid="join-did"]')!, FIRST);
  await screen.settle();
  assert.match(screen.text(), /and the DID above/);
  assert.match(screen.text(), /SD-BASE-DP · proffered/);
});

test("off any page (no host) and with nothing typed, the block is not drawn", async () => {
  const screen = await render(h(JoinView, { pageHost: async () => undefined, readAgreements: async () => [agreement()] }), { chrome });
  await screen.settle();
  assert.equal(screen.container.querySelector('[data-testid="join-agreements"]'), null);
});

test("the site's own terms are read when the wallet may reach it, and compared with the standing agreement", async () => {
  const takes = { status: "takes" as const, terms: { endpoint: "https://shop.example/.well-known/myterms-configuration", accepts: ["SD-BASE-DP", "SD-BASE"], unknown: [], counterOffer: "SD-BASE-DP" } };
  const screen = await render(
    h(JoinView, {
      pageHost: async () => "shop.example",
      readAgreements: async () => [],
      readSiteTerms: async () => takes,
      readStanding: async () => ["SD-BASE-AT"],
    }),
    { chrome },
  );
  await screen.settle();
  const text = screen.text();
  assert.match(text, /shop\.example takes SD-BASE-DP, SD-BASE/);
  assert.match(text, /none of yours \(SD-BASE-AT\) · it proposes SD-BASE-DP/);
  assert.equal(screen.container.querySelector('[data-testid="handshake"]')!.getAttribute("data-state"), "apart");

  const none = await render(h(JoinView, { pageHost: async () => "plain.example", readAgreements: async () => [], readSiteTerms: async () => ({ status: "none" as const }) }), { chrome });
  await none.settle();
  assert.match(none.text(), /plain\.example publishes no terms/);
  assert.equal(none.container.querySelector('[data-testid="handshake"]')!.getAttribute("data-state"), "none");
});

test("a site the wallet may not read yet is asked for in the click, then read", async () => {
  let asked: string[] = [];
  let allowed = false;
  const screen = await render(
    h(JoinView, {
      pageHost: async () => "shop.example",
      readAgreements: async () => [],
      readSiteTerms: async () => (allowed ? { status: "none" as const } : { status: "unreachable" as const, origin: "https://shop.example" }),
      allowSite: async (origin: string) => {
        asked.push(origin);
        allowed = true;
        return true;
      },
    }),
    { chrome },
  );
  await screen.settle();
  assert.match(screen.text(), /shop.example: not readable yet/);
  await screen.click(screen.container.querySelector('[data-testid="join-site-allow"]')!);
  await screen.settle();
  assert.deepEqual(asked, ["https://shop.example"]);
  assert.match(screen.text(), /publishes no terms/);
});

test("the handshake closes when the site takes one of the person's offers", async () => {
  const takes = { status: "takes" as const, terms: { endpoint: "https://shop.example/.well-known/myterms-configuration", accepts: ["SD-BASE-DP", "SD-BASE"], unknown: [], counterOffer: "SD-BASE-DP" } };
  const screen = await render(
    h(JoinView, { pageHost: async () => "shop.example", readAgreements: async () => [], readSiteTerms: async () => takes, readStanding: async () => ["SD-BASE-AT", "SD-BASE"] }),
    { chrome },
  );
  await screen.settle();
  const fig = screen.container.querySelector('[data-testid="handshake"]')!;
  assert.equal(fig.getAttribute("data-state"), "offered");
  assert.match(screen.text(), /shop\.example takes SD-BASE-DP, SD-BASE · yours: SD-BASE/);
  assert.match(screen.container.querySelector('[data-testid="handshake-caption"]')!.textContent ?? "", /takes your terms \(SD-BASE\)/);
});
