// MyTerms (IEEE Std 7012-2025) at a community's door — the member's side.
//
// The person is the **first party**: they proffer one of a small roster of
// standard-form agreements kept by a neutral non-business (Customer Commons),
// the community accepts it, makes one counter-offer, or declines, and both
// sides keep the record. This module does the member's half for a Verifiable
// Trust Community (VTC) that takes terms at its join door:
//
//   - the **roster mirror** (`MYTERMS_ROSTER`): the service-delivery
//     agreements by code, with what each permits and prohibits in words. A
//     mirror, never the authority — the codes and texts are the roster's, and
//     this module mints none (IEEE 7012 Annex A keeps the roster small on
//     purpose). `url` is where the canonical text is published.
//   - **discovery**: a community that takes terms names a `MyTerms` service
//     in its DID document, pointing at its MyTerms configuration (the shape
//     the MCNP draft, `draft-curtis-myterms`, puts at
//     `/.well-known/myterms-configuration`). Read from the **verified**
//     document, as every other service is.
//   - the **plan** (`planTerms`): the person's standing choice against what
//     the community accepts — their own agreement when it is accepted, else
//     the community's counter-offer (the most protective it accepts), else
//     nothing. One round, as the standard says (A.1): accept, counter, or
//     decline.
//   - the **agreement record** (`buildVca`): an MCNP-shaped Verifiable
//     Contractual Agreement, carried inside the signed join request
//     (`extensions[MYTERMS_EXTENSION]`), so the applicant's signature over
//     the request covers it and the community's signed verdict threads to
//     it. That pair is the bilateral record this profile keeps. It is not
//     MCNP's JWS/JCS signature: the proof is the request's Data Integrity
//     proof, and the profile says so (`MYTERMS_PROFILE`).
//
// What this is not: a claim of IEEE 7012 conformance. The record names the
// person's agent key as signer; the represented parties are the holder and
// the community (`ids`), and a persona is not the individual the standard's
// first party is. Say "joined under <code>", never "IEEE 7012 compliant".

/** The DID-document service type a community publishes when it takes terms. */
export const MYTERMS_SERVICE_TYPE = "MyTerms";

/** The `extensions` member of `vtc/join-requests/submit` that carries the
 *  agreement (an opaque applicant-supplied bag, per the binding). */
export const MYTERMS_EXTENSION = "org.agentprivacy.myterms";

/** Names this profile of the record: the MCNP draft's agreement object,
 *  proved by the join request's Data Integrity proof rather than a JWS. */
export const MYTERMS_PROFILE = "mcnp-draft-01/vtc-join/1";

export interface RosterAgreement {
  /** The roster code (`SD-BASE`, `SD-BASE-AT`, …). */
  code: string;
  title: string;
  /** One sentence a person decides on. */
  meaning: string;
  /** What the second party may do, in the roster's words. */
  permitted: string[];
  /** What it may not. */
  prohibited: string[];
  /** What it must. */
  obligations: string[];
  /** Where the canonical text is published. */
  url: string;
}

const REGISTRY = "https://customercommons.org/agreements/";

const SERVICE = "deliver the service the person asked for, and use their data for that";
const ANALYTICS = "first-party analytics (measuring its own service)";
const TRACKING = "first-party tracking across its own pages and sessions";
const PROFILING = "first-party profiling (building a picture of the person)";
const SHARE_3P = "sharing anonymised data with third parties";
const NO_3P = "sharing the person's data with third parties";
const PORTABILITY = "give the person their data back in a usable form on request";

/**
 * The service-delivery roster (IEEE 7012 Annex A: `SD-BASE` with permission
 * modifiers). Most protective first. The `PDC-*` contribution agreements are
 * not here: joining a community is service delivery, not data contribution.
 */
export const MYTERMS_ROSTER: readonly RosterAgreement[] = [
  {
    code: "SD-BASE-DP",
    title: "Service delivery, with data portability",
    meaning: "Use my data only to deliver the service, and give it back to me when I ask.",
    permitted: [SERVICE],
    prohibited: [ANALYTICS, TRACKING, PROFILING, SHARE_3P, NO_3P],
    obligations: [PORTABILITY],
    url: `${REGISTRY}SD-BASE-DP`,
  },
  {
    code: "SD-BASE",
    title: "Service delivery only",
    meaning: "Use my data only to deliver the service. No analytics, tracking, profiling or sharing.",
    permitted: [SERVICE],
    prohibited: [ANALYTICS, TRACKING, PROFILING, SHARE_3P, NO_3P],
    obligations: [],
    url: `${REGISTRY}SD-BASE`,
  },
  {
    code: "SD-BASE-A",
    title: "Service delivery, with first-party analytics",
    meaning: "Deliver the service and measure it. No tracking, profiling or sharing.",
    permitted: [SERVICE, ANALYTICS],
    prohibited: [TRACKING, PROFILING, SHARE_3P, NO_3P],
    obligations: [],
    url: `${REGISTRY}SD-BASE-A`,
  },
  {
    code: "SD-BASE-AT",
    title: "Service delivery, with analytics and tracking",
    meaning: "Deliver the service, measure it and track me across its own pages. No profiling or sharing.",
    permitted: [SERVICE, ANALYTICS, TRACKING],
    prohibited: [PROFILING, SHARE_3P, NO_3P],
    obligations: [],
    url: `${REGISTRY}SD-BASE-AT`,
  },
  {
    code: "SD-BASE-ATP",
    title: "Service delivery, with analytics, tracking and profiling",
    meaning: "Deliver the service, measure it, track me and build a picture of me. No sharing.",
    permitted: [SERVICE, ANALYTICS, TRACKING, PROFILING],
    prohibited: [SHARE_3P, NO_3P],
    obligations: [],
    url: `${REGISTRY}SD-BASE-ATP`,
  },
  {
    code: "SD-BASE-ATP-S3P",
    title: "Service delivery, with analytics, tracking, profiling and anonymised sharing",
    meaning: "Everything above, and anonymised data may be shared with third parties.",
    permitted: [SERVICE, ANALYTICS, TRACKING, PROFILING, SHARE_3P],
    prohibited: [NO_3P],
    obligations: [],
    url: `${REGISTRY}SD-BASE-ATP-S3P`,
  },
];

/** The roster entry for a code, or `undefined` for one the mirror does not
 *  carry. A code is never invented from a string. */
export function rosterAgreement(code: unknown): RosterAgreement | undefined {
  if (typeof code !== "string") return undefined;
  return MYTERMS_ROSTER.find((a) => a.code === code);
}

/** Lower is more protective of the person. */
function protection(code: string): number {
  const i = MYTERMS_ROSTER.findIndex((a) => a.code === code);
  return i < 0 ? Number.POSITIVE_INFINITY : i;
}

// ── Discovery ────────────────────────────────────────────────────────────────

/** The `MyTerms` service's HTTPS endpoint in a verified DID document, or
 *  `undefined` when the community publishes none. A string endpoint, or an
 *  object with `uri`, as DID services are written both ways. */
export function myTermsEndpoint(doc: unknown): string | undefined {
  const services = (doc as { service?: unknown })?.service;
  if (!Array.isArray(services)) return undefined;
  for (const s of services) {
    const t = (s as { type?: unknown } | null)?.type;
    const typed = t === MYTERMS_SERVICE_TYPE || (Array.isArray(t) && t.includes(MYTERMS_SERVICE_TYPE));
    if (!typed) continue;
    const ep = (s as { serviceEndpoint?: unknown }).serviceEndpoint;
    const raw = typeof ep === "string" ? ep : typeof (ep as { uri?: unknown })?.uri === "string" ? (ep as { uri: string }).uri : undefined;
    if (!raw) continue;
    try {
      const u = new URL(raw);
      if (u.protocol === "https:") return u.toString();
    } catch {
      // not a URL
    }
  }
  return undefined;
}

/** What a community says it accepts, read from its MyTerms configuration. */
export interface CommunityTerms {
  /** Where it was read. */
  endpoint: string;
  /** Roster codes the community accepts, most protective first. Codes the
   *  mirror does not carry are in `unknown`, never offered. */
  accepts: string[];
  unknown: string[];
  /** The community's own counter-offer when the person's choice is not
   *  accepted; defaults to the most protective it accepts. */
  counterOffer?: string;
  /** Where the community publishes the agreements it accepts, for a person
   *  who wants to read them there. */
  agreementsUrl?: string;
}

export class MyTermsConfigurationError extends Error {
  readonly code = "myterms/configuration-invalid";
}

/**
 * Check a configuration document. The shape (a City profile of the MCNP
 * draft's `myterms-configuration`): `agreements`, an array of `{code, …}`,
 * is the accepted set; `counterOffer` optional; `agreementsUrl` optional.
 * Anything else is ignored. A document with no `agreements` array is not a
 * configuration.
 */
export function checkMyTermsConfiguration(json: unknown, endpoint: string): CommunityTerms {
  const bad = (what: string) => new MyTermsConfigurationError(`MyTerms configuration at ${endpoint}: ${what}`);
  if (!json || typeof json !== "object") throw bad("not an object");
  const agreements = (json as { agreements?: unknown }).agreements;
  if (!Array.isArray(agreements)) throw bad("no agreements");
  const accepts: string[] = [];
  const unknown: string[] = [];
  for (const a of agreements) {
    const code = typeof a === "string" ? a : (a as { code?: unknown } | null)?.code;
    if (typeof code !== "string" || code.trim() === "") continue;
    if (rosterAgreement(code)) {
      if (!accepts.includes(code)) accepts.push(code);
    } else if (!unknown.includes(code)) unknown.push(code);
  }
  accepts.sort((a, b) => protection(a) - protection(b));
  const counter = (json as { counterOffer?: unknown }).counterOffer;
  const agreementsUrl = (json as { agreementsUrl?: unknown }).agreementsUrl;
  return {
    endpoint,
    accepts,
    unknown,
    ...(typeof counter === "string" && accepts.includes(counter) ? { counterOffer: counter } : {}),
    ...(typeof agreementsUrl === "string" && /^https:\/\//.test(agreementsUrl) ? { agreementsUrl } : {}),
  };
}

export interface FetchCommunityTermsOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Read a community's configuration. A plain GET of a public document: it
 *  says nothing about who is asking. */
export async function fetchCommunityTerms(
  endpoint: string,
  opts: FetchCommunityTermsOptions = {},
): Promise<CommunityTerms> {
  const f = opts.fetch ?? globalThis.fetch;
  const res = await f(endpoint, {
    method: "GET",
    headers: { accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
  });
  if (!res.ok) throw new MyTermsConfigurationError(`MyTerms configuration at ${endpoint}: HTTP ${res.status}`);
  return checkMyTermsConfiguration(await res.json(), endpoint);
}

// ── The plan ─────────────────────────────────────────────────────────────────

export type TermsPlan =
  | {
      ok: true;
      /** The agreement to join under. */
      code: string;
      /** `false`: the person's own standing choice. `true`: the community's
       *  counter-offer (its most protective accepted agreement), because the
       *  person's choice is not accepted or they have none. */
      counter: boolean;
      /** The person's standing choice, when it was not accepted. */
      declined?: string;
    }
  | {
      ok: false;
      /** `not-offered`: the community takes no terms. `no-match`: it takes
       *  terms, but none this mirror carries. */
      reason: "not-offered" | "no-match";
    };

/** The person's standing offers as roster codes, in their order, from one
 *  code or a list; codes the mirror does not carry are dropped. */
export function offersOf(preferred: string | readonly string[] | undefined): string[] {
  const list = typeof preferred === "string" ? [preferred] : Array.isArray(preferred) ? preferred : [];
  const out: string[] = [];
  for (const p of list) {
    const code = rosterAgreement(p)?.code;
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

/** One round: the first of the person's offers the community accepts, else
 *  the community's counter-offer, else nothing. The person's offers are in
 *  their order of preference; `declined` names the first when none is taken. */
export function planTerms(preferred: string | readonly string[] | undefined, community: CommunityTerms | undefined): TermsPlan {
  if (!community) return { ok: false, reason: "not-offered" };
  if (community.accepts.length === 0) return { ok: false, reason: "no-match" };
  const mine = offersOf(preferred);
  const taken = mine.find((code) => community.accepts.includes(code));
  if (taken) return { ok: true, code: taken, counter: false };
  const counter = community.counterOffer ?? community.accepts[0]!;
  return { ok: true, code: counter, counter: true, ...(mine[0] ? { declined: mine[0] } : {}) };
}

// ── The record ───────────────────────────────────────────────────────────────

/** The MCNP draft's agreement object, as this profile fills it. */
export interface Vca {
  version: "1";
  profile: typeof MYTERMS_PROFILE;
  references: Array<{ code: string; url: string }>;
  /** Unique per record. */
  agreementId: string;
  /** Epoch seconds. */
  created: number;
  /** The represented parties: the applicant (first party) and the community
   *  (second party). */
  ids: [string, string];
  permitted: string[];
  prohibited: string[];
  obligations: string[];
  validRoles: ["first-party", "second-party"];
}

/** The agreement the person joins under, unsigned. The join request it rides
 *  in is signed by the applicant's agent; nothing here is. */
export function buildVca(applicantDid: string, communityDid: string, code: string, nowMs: number): Vca {
  const a = rosterAgreement(code);
  if (!a) throw new Error(`not a roster agreement: ${code}`);
  return {
    version: "1",
    profile: MYTERMS_PROFILE,
    references: [{ code: a.code, url: a.url }],
    agreementId: globalThis.crypto.randomUUID(),
    created: Math.floor(nowMs / 1000),
    ids: [applicantDid, communityDid],
    permitted: [...a.permitted],
    prohibited: [...a.prohibited],
    obligations: [...a.obligations],
    validRoles: ["first-party", "second-party"],
  };
}

/** The `extensions` bag a join request carries the agreement in. */
export function myTermsExtension(vca: Vca): Record<string, unknown> {
  return { [MYTERMS_EXTENSION]: { version: "1", agreement: vca } };
}

/** What the wallet keeps after a request under terms went out: both halves
 *  of the record by digest, so either side's copy can be matched later. */
export interface TermsRecord {
  vtaDid: string;
  communityDid: string;
  host: string;
  /** The persona the request was signed as. */
  applicantDid: string;
  code: string;
  agreementId: string;
  /** The community's request id, from its verdict. */
  requestId: string;
  /** `allow`, `refer`, `requestMore` or `deny`, as the community answered. */
  effect: string;
  /** Digest (multibase sha-256 over JCS) of the signed request as sent. */
  requestDigest: string;
  /** Digest of the community's signed reply. */
  replyDigest: string;
  /** Epoch ms. */
  at: number;
}
