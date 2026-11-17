// Agreements — one family, of which the MyTerms record is the first kind.
//
// An agreement is a standing between an identity this wallet holds and a
// counterparty (a community, or a website that is a community's portal),
// reached through a trust task and kept by both sides. The wallet keeps its
// half: who agreed, with whom, where, to what, and the digests of the two
// signed documents that made it (the request as sent, the counterparty's
// signed answer). Nothing here is the documents themselves, and nothing here
// is a claim that the counterparty kept its half.
//
// Two things are deliberately separate:
//
//  - the **record** (`Agreement`): one per request sent under terms. Written
//    once, never edited; a later request with the same counterparty is a new
//    record, and the latest one is the standing.
//  - the **preference** (`AgreementPreference`): the holder's switch per
//    counterparty — "proffer my terms at this community's door". A switch is
//    not a record: it says what the wallet will do next time, not what
//    happened. There is no wallet-wide switch, because "agreements on/off"
//    means nothing without a counterparty.
//
// `kind` names the task family the agreement came through. Today there is one.
// A second kind adds a mapping function here and nothing in the pane.
//
// MyTerms sits above membership. The catalogue is every privacy term the
// person holds with a website they visit; a community's join door is the
// first place one is made (`via: "join-request"`, the agreement inside the
// signed request), not the only one. A website with no community can take
// terms too, through its own MyTerms configuration and agreements endpoint
// (`via: "site"`, the MCNP draft's flow; not yet built). So `counterparty` is
// a DID when there is one and the site's origin when there is not, and `site`
// is always the host the person was dealing with.

import type { TermsRecord } from "./myterms.js";
import { rosterAgreement } from "./myterms.js";

export type AgreementKind = "myterms";

/** How the agreement stands, read from the counterparty's answer. `proffered`:
 *  sent and not yet decided (pending or referred). */
export type AgreementStatus = "proffered" | "agreed" | "declined";

export interface Agreement {
  /** Unique per record: the agreement id the request carried. */
  id: string;
  kind: AgreementKind;
  /** The agent the request was signed at. Records are kept per agent. */
  vtaDid: string;
  /** The identity that agreed, on the wallet's side (a persona DID). */
  holder: string;
  /** Whom it is with: the community's DID, or a website's origin
   *  (`https://host`) when the site is the counterparty and names no DID. */
  counterparty: string;
  /** Where it was reached: the counterparty's portal host, or the site. */
  site: string;
  /** How it was made: inside a community's join request, or with a site
   *  through its own agreements endpoint. Absent on records older than this
   *  member reads as `join-request`. */
  via?: "join-request" | "site";
  /** What was agreed: the roster code, its title and canonical text. */
  terms: { code: string; title: string; url: string };
  /** The evidence pair: the counterparty's request id and the digests
   *  (multibase sha-256 over JCS) of the signed request and signed reply. */
  reached: { requestId: string; requestDigest: string; replyDigest: string; at: number };
  status: AgreementStatus;
  /** The counterparty's answer as it gave it (`allow`, `deny`, `pending`…),
   *  kept beside the status it was read into. */
  effect: string;
}

/** The holder's standing instruction for one counterparty. */
export interface AgreementPreference {
  /** Proffer terms at this counterparty's door. Absent means yes. */
  terms: boolean;
  /** Present this roster agreement at this door first, ahead of the standing
   *  order. Absent: the standing order decides. */
  offer?: string;
}

/** The counterparty's verdict effect, read into a standing. */
export function statusOfEffect(effect: string): AgreementStatus {
  if (effect === "allow") return "agreed";
  if (effect === "deny") return "declined";
  return "proffered";
}

/** A MyTerms record as an agreement. The one mapping this kind has. */
export function agreementFromTerms(record: TermsRecord): Agreement {
  const a = rosterAgreement(record.code);
  return {
    id: record.agreementId,
    kind: "myterms",
    vtaDid: record.vtaDid,
    holder: record.applicantDid,
    counterparty: record.communityDid,
    site: record.host,
    terms: { code: record.code, title: a?.title ?? record.code, url: a?.url ?? "" },
    reached: {
      requestId: record.requestId,
      requestDigest: record.requestDigest,
      replyDigest: record.replyDigest,
      at: record.at,
    },
    status: statusOfEffect(record.effect),
    effect: record.effect,
    via: "join-request",
  };
}

/** A stored value is an agreement when it carries the members the pane and
 *  the switch read. Anything else in the store is ignored, never repaired. */
export function isAgreement(x: unknown): x is Agreement {
  if (!x || typeof x !== "object") return false;
  const a = x as Partial<Agreement>;
  return (
    typeof a.id === "string" &&
    a.kind === "myterms" &&
    typeof a.vtaDid === "string" &&
    typeof a.holder === "string" &&
    typeof a.counterparty === "string" &&
    typeof a.site === "string" &&
    !!a.terms &&
    typeof a.terms.code === "string" &&
    !!a.reached &&
    typeof a.reached.at === "number" &&
    (a.status === "proffered" || a.status === "agreed" || a.status === "declined")
  );
}

/** Canonical text of a stored value: object members in sorted key order,
 *  `undefined` members dropped (as storage drops them). Two records with the
 *  same text are the same value, so it is a total tie-break: no digest is
 *  needed (and sha-256 here would be async). */
function canonicalText(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonicalText).join(",")}]`;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalText(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(x) ?? "null";
}

/** `at` as a total key: a NaN (possible in memory, never from JSON storage)
 *  sorts below every time instead of comparing false both ways. */
function when(a: Agreement): number {
  return Number.isNaN(a.reached.at) ? Number.NEGATIVE_INFINITY : a.reached.at;
}

/** Which of two records stands: the later `reached.at`; on a tie the greater
 *  `id` (the agreement id, unique per record); on a tie of that too (two
 *  records stored under one id) the greater canonical text. A total order on
 *  record values, so the standing never depends on the order records were
 *  read in (before 2026-10-26 a tie on `at` kept whichever came first;
 *  formal_mage `Formal.Agreements.standing_perm`). */
function laterThan(a: Agreement, b: Agreement): boolean {
  if (when(a) !== when(b)) return when(a) > when(b);
  if (a.id !== b.id) return a.id > b.id;
  return canonicalText(a) > canonicalText(b);
}

/** The latest record per counterparty: what stands today. Input in any order:
 *  the result is the same for every ordering of the same records. Newest
 *  first; standings reached at the same time in counterparty order. */
export function standingAgreements(records: readonly Agreement[]): Agreement[] {
  const latest = new Map<string, Agreement>();
  for (const r of records) {
    const held = latest.get(r.counterparty);
    if (!held || laterThan(r, held)) latest.set(r.counterparty, r);
  }
  return [...latest.values()].sort((a, b) =>
    when(a) !== when(b) ? when(b) - when(a) : a.counterparty < b.counterparty ? -1 : a.counterparty > b.counterparty ? 1 : 0,
  );
}
