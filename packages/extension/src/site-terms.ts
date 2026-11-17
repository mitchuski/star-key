// Where a community keeps its MyTerms configuration, for the 🤝 window.
//
// A community may serve its portal on one host and its terms on another (the
// City: portal on `vtc.`, terms on `join.`), so the two addresses the window
// tries on the page's own host can both be missing while the community takes
// terms all the same. The page's host says which community it is (`/health`
// → `vtc_did`); that is a claim, so it is checked the way every page channel
// checks one: the DID's **verified** document must name this page's origin as
// its `SignInPortal`. Only then is the document's `MyTerms` service believed.
//
// Read-only, and asked only by the wallet's own window. Nothing about the
// person is sent anywhere: the DID document and the configuration are public.

import { communityDidFromText } from "./community-did.js";
import { portalRefusal, type ActiveVta } from "./directory-page.js";
import type { OffscreenDirectoryPageOp, OffscreenDirectoryPageResponse, RuntimeSiteTermsResponse } from "./bridge-protocol.js";

export interface SiteTermsDeps {
  active(): Promise<{ ok: true; vta: ActiveVta } | { ok: false; error: string }>;
  /** The directory gate's offscreen ops: `portal` is the one used. */
  offscreen(vta: ActiveVta, op: OffscreenDirectoryPageOp): Promise<OffscreenDirectoryPageResponse>;
}

/** The `MyTerms` endpoint of the community whose portal `origin` is, by
 *  `hostDid`'s verified document; no endpoint when it publishes none. */
export async function siteTermsEndpoint(deps: SiteTermsDeps, origin: unknown, hostDid: unknown): Promise<RuntimeSiteTermsResponse> {
  if (typeof origin !== "string" || !/^https:\/\/[^/]+$/.test(origin)) return { ok: false, error: "origin must be an https origin" };
  const did = typeof hostDid === "string" ? communityDidFromText(hostDid) : undefined;
  if (!did || did !== (hostDid as string).trim()) return { ok: false, error: "hostDid must be a DID" };
  const active = await deps.active();
  if (!active.ok) return { ok: false, error: active.error };
  const res = await deps.offscreen(active.vta, { op: "portal", hostDid: did });
  if (!res.ok) return { ok: false, error: res.error };
  const got = res.result as { portalOrigin: string; termsEndpoint?: string };
  const refusal = portalRefusal(origin, did, got.portalOrigin);
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, communityDid: did, ...(got.termsEndpoint ? { termsEndpoint: got.termsEndpoint } : {}) };
}
