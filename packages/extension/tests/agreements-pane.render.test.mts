// The Agreements pane, rendered: what the person presents at a door (the
// ordered offers), a card per community with its switch and pick, and the
// history the offscreen document kept, read from `chrome.storage.local` for
// the agent the console administers and no other.

import { test } from "node:test";
import assert from "node:assert/strict";
import { h, render } from "./harness/dom.mjs";
import { AgreementsPane } from "../src/manager/panes/agreements.js";
import { readAgreements, readAgreementPrefs, termsEnabledFor, writeAgreementPref, appendAgreement, agreementPreferenceFor } from "../src/agreements-store.js";

const VTA = "did:webvh:QmVta:dids.example.net:vta";
const OTHER = "did:webvh:QmOther:dids.example.net:vta";
const CITY = "did:webvh:QmCity:dids.mages.city:vtc";
const parties = { holder: { did: "did:key:z6MkHolder" }, service: { did: VTA } };

const agreement = (over: Record<string, unknown> = {}) => ({
  id: "a-1",
  kind: "myterms",
  vtaDid: VTA,
  holder: "did:webvh:QmBob:dids.example.net:bob",
  counterparty: CITY,
  site: "join.mages.city",
  terms: { code: "SD-BASE-DP", title: "Service delivery, with data portability", url: "https://customercommons.org/agreements/SD-BASE-DP" },
  reached: { requestId: "jr-1", requestDigest: "zReq", replyDigest: "zRep", at: 1_791_460_900_000 },
  status: "agreed",
  effect: "allow",
  via: "join-request",
  ...over,
});

function chromeWith(store: Record<string, unknown>) {
  return {
    runtime: { sendMessage: async () => ({ ok: false, error: "no agent" }) },
    storage: {
      local: {
        get: async (key: string | string[] | null) => {
          const keys = key === null ? Object.keys(store) : Array.isArray(key) ? key : [key];
          return Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]]));
        },
        set: async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        },
      },
    },
  };
}

test("records are read for the administered agent only, and a malformed store is empty", async () => {
  globalThis.chrome = chromeWith({
    [`agreements:${VTA}`]: [agreement(), { junk: true }, agreement({ id: "a-2", status: "proffered", effect: "pending", terms: { code: "SD-BASE", title: "Service delivery only", url: "" } })],
    [`agreements:${OTHER}`]: [agreement({ id: "x-1" })],
  }) as unknown as typeof chrome;
  const mine = await readAgreements(VTA);
  assert.deepEqual(mine.map((r) => r.id), ["a-1", "a-2"]);
  globalThis.chrome = chromeWith({ [`agreements:${VTA}`]: "not a list" }) as unknown as typeof chrome;
  assert.deepEqual(await readAgreements(VTA), []);
});

test("the store keeps the newest 200 records; the preference carries the switch and the pick, and defaults to on", async () => {
  const store: Record<string, unknown> = {};
  globalThis.chrome = chromeWith(store) as unknown as typeof chrome;
  for (let i = 0; i < 205; i++) await appendAgreement(agreement({ id: `a-${i}` }) as never);
  const kept = await readAgreements(VTA);
  assert.equal(kept.length, 200);
  assert.equal(kept[0]!.id, "a-5", "the oldest five went first");
  assert.equal(await termsEnabledFor(VTA, CITY), true);
  assert.equal(await agreementPreferenceFor(VTA, CITY), undefined);
  await writeAgreementPref(VTA, CITY, { terms: false });
  assert.equal(await termsEnabledFor(VTA, CITY), false);
  await writeAgreementPref(VTA, CITY, { terms: true, offer: "SD-BASE" });
  assert.deepEqual(await agreementPreferenceFor(VTA, CITY), { terms: true, offer: "SD-BASE" });
  assert.deepEqual(await readAgreementPrefs(VTA), { [CITY]: { terms: true, offer: "SD-BASE" } });
  store[`agreement-prefs:${VTA}`] = { [CITY]: { terms: "yes" }, junk: 3 };
  assert.deepEqual(await readAgreementPrefs(VTA), {});
  assert.equal(await termsEnabledFor(VTA, CITY), true);
});

test("the pane shows the offers in order, a card per community with its standing, and the history behind a toggle", async () => {
  const store = {
    [`agreements:${VTA}`]: [
      agreement(),
      agreement({ id: "a-2", status: "proffered", effect: "pending", terms: { code: "SD-BASE", title: "Service delivery only", url: "https://customercommons.org/agreements/SD-BASE" }, reached: { requestId: "jr-2", requestDigest: "zReq2", replyDigest: "zRep2", at: 1_791_460_999_000 } }),
    ],
  };
  const screen = await render(h(AgreementsPane, { parties, readOffers: async () => ["SD-BASE", "SD-BASE-DP"], writeOffers: async () => {} }), { chrome: chromeWith(store) });
  await screen.settle();
  const text = screen.text();
  assert.match(text, /What you present at a door/);
  assert.match(text, /Your order: SD-BASE, SD-BASE-DP/);
  // The chooser lists the two chosen first, numbered, then the rest.
  const choices = [...screen.container.querySelectorAll('[data-testid="terms-choice"]')].map((el) => el.getAttribute("data-code"));
  assert.deepEqual(choices.slice(0, 2), ["SD-BASE", "SD-BASE-DP"]);
  assert.equal(choices.length, 6);
  // One card for the one community, standing = the latest record.
  const cards = screen.container.querySelectorAll('[data-testid="agreement-switch"]');
  assert.equal(cards.length, 1);
  assert.match(cards[0]!.querySelector('[data-testid="agreement-standing"]')!.textContent ?? "", /SD-BASE · proffered · 2026-10-08 · 2 requests/);
  assert.match(text, /join\.mages\.city/);
  // History is behind a toggle; open it and both records are there with digests.
  assert.equal(screen.container.querySelectorAll('[data-testid="agreement-detail"]').length, 0);
  await screen.click(screen.container.querySelector('[data-testid="agreement-history-toggle"]')!);
  await screen.settle();
  assert.equal(screen.container.querySelectorAll('[data-testid="agreement-detail"]').length, 2);
  const open = screen.text();
  assert.match(open, /zReq2/);
  assert.match(open, /zRep/);
  assert.match(open, /jr-1/);
  assert.match(open, /inside the join request/);
});

test("ticking an offer and moving it writes the ordered list to settings", async () => {
  const writes: string[][] = [];
  const screen = await render(h(AgreementsPane, { parties, readOffers: async () => ["SD-BASE"], writeOffers: async (next: string[]) => void writes.push(next) }), { chrome: chromeWith({}) });
  await screen.settle();
  await screen.click(screen.container.querySelector<HTMLInputElement>('[data-code="SD-BASE-DP"] input[type=checkbox]')!);
  await screen.settle();
  assert.deepEqual(writes.at(-1), ["SD-BASE", "SD-BASE-DP"]);
  await screen.click(screen.container.querySelector<HTMLButtonElement>('[data-code="SD-BASE-DP"] button[aria-label="Move SD-BASE-DP up"]')!);
  await screen.settle();
  assert.deepEqual(writes.at(-1), ["SD-BASE-DP", "SD-BASE"]);
  assert.match(screen.text(), /Your order: SD-BASE-DP, SD-BASE/);
});

test("a community's switch and pick are written to the store and read back by the join flow's gate", async () => {
  const store: Record<string, unknown> = { [`agreements:${VTA}`]: [agreement()] };
  const chrome = chromeWith(store);
  const screen = await render(h(AgreementsPane, { parties, readOffers: async () => [], writeOffers: async () => {} }), { chrome });
  await screen.settle();
  const card = screen.container.querySelector('[data-testid="agreement-switch"]')!;
  const select = card.querySelector<HTMLSelectElement>("select")!;
  select.value = "SD-BASE";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await screen.settle();
  assert.deepEqual(store[`agreement-prefs:${VTA}`], { [CITY]: { terms: true, offer: "SD-BASE" } });
  await screen.click(card.querySelector<HTMLInputElement>("input[type=checkbox]")!);
  await screen.settle();
  assert.deepEqual(store[`agreement-prefs:${VTA}`], { [CITY]: { terms: false, offer: "SD-BASE" } });
  assert.match(screen.text(), /Send no agreement at this door/);
  globalThis.chrome = chrome as unknown as typeof chrome;
  assert.equal(await termsEnabledFor(VTA, CITY), false);
});

test("a community can be added by DID before any request, so its card exists when the door opens", async () => {
  const store: Record<string, unknown> = {};
  const screen = await render(h(AgreementsPane, { parties, readOffers: async () => [], writeOffers: async () => {} }), { chrome: chromeWith(store) });
  await screen.settle();
  assert.match(screen.text(), /Nothing is ticked yet/);
  assert.match(screen.text(), /No community yet/);
  assert.match(screen.text(), /no requests under terms yet/);
  const input = screen.container.querySelector<HTMLInputElement>('[data-testid="agreement-add"] input')!;
  await screen.type(input, "did:webvh:QmFirst:webvh.storm.ws:first-vtc");
  await screen.click(screen.container.querySelector<HTMLButtonElement>('[data-testid="agreement-add"] button')!);
  await screen.settle();
  assert.deepEqual(store[`agreement-prefs:${VTA}`], { "did:webvh:QmFirst:webvh.storm.ws:first-vtc": { terms: true } });
  assert.equal(screen.container.querySelectorAll('[data-testid="agreement-switch"]').length, 1);
  assert.match(screen.text(), /A community you have not dealt with yet/);
  assert.match(screen.text(), /No agreement yet/);
  await screen.type(input, "not a did");
  assert.equal(screen.container.querySelector<HTMLButtonElement>('[data-testid="agreement-add"] button')!.disabled, true);
});
