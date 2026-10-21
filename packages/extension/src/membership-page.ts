// A page's `window.vtaWallet.membership.status` — the background's half.
//
// A community's portal asks whether the person at the page is a member, and
// as whom, so the page can change once they are in. Two gates, in order:
//
//   1. **The call is well formed** (`membershipPageParamsRefusal`).
//   2. **The page is the community's portal**: its browser-attested origin is
//      the origin of `hostDid`'s verified `SignInPortal` (`portalRefusal`,
//      the directory gate's).
//
// Then the answer is read, not made: the identities the wallet signs in with
// at that community (the directory gate's `members` listing), and the
// standing agreement the wallet holds with it. No prompt — the community
// already knows these identities, since it admitted them, and a page that is
// the community's own portal learns nothing it could not ask the community.
// What goes back is a view; never a credential, a presentation or a signed
// document; an error is a sentence.
//
// Written against injected dependencies, not `chrome.*`, so the gates are
// tested as they run.

import type { Agreement } from "@openvtc/pnm-core/vtc";
import { standingAgreements } from "@openvtc/pnm-core/vtc";
import type {
  MembershipPageOp,
  OffscreenDirectoryPageOp,
  OffscreenDirectoryPageResponse,
  PageMembershipView,
  RuntimeMembershipPageResponse,
} from "./bridge-protocol.js";
import { portalRefusal, type ActiveVta } from "./directory-page.js";

export interface MembershipPageDeps {
  active(): Promise<{ ok: true; vta: ActiveVta } | { ok: false; error: string }>;
  /** The directory gate's offscreen ops: `portal` and `members` are the two used. */
  offscreen(vta: ActiveVta, op: OffscreenDirectoryPageOp): Promise<OffscreenDirectoryPageResponse>;
  /** This agent's agreements (`agreements-store.ts`). */
  agreements(vtaDid: string): Promise<Agreement[]>;
  now(): number;
}

const MAX_DID = 2048;

function isDid(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("did:") && v.length <= MAX_DID;
}

/** Why `raw` is not a call this channel serves, or `null`. */
export function membershipPageParamsRefusal(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "the call must be an object";
  const p = raw as Record<string, unknown>;
  if (p.op !== "status") return "unknown membership operation";
  for (const k of Object.keys(p)) {
    if (!["op", "hostDid"].includes(k)) return `status takes no \`${k}\``;
  }
  if (!isDid(p.hostDid)) return "hostDid must be a DID";
  return null;
}

/** The view a portal is given, from the wallet's identities at the community
 *  and its agreements with it. Pure, so it is tested as it runs. */
export function membershipView(hostDid: string, members: readonly string[], agreements: readonly Agreement[]): PageMembershipView {
  const identities = [...new Set(members.filter((m) => m !== hostDid))];
  if (identities.length === 0) return { member: false };
  const standing = standingAgreements(agreements.filter((a) => a.counterparty === hostDid))[0];
  return {
    member: true,
    identities,
    ...(standing ? { agreement: { code: standing.terms.code, status: standing.status, at: standing.reached.at } } : {}),
  };
}

/** How long a community's resolved portal is trusted before it is resolved again. */
const PORTAL_CACHE_MS = 5 * 60 * 1000;

class MembershipPageRefusal extends Error {}

export class MembershipPageGates {
  private readonly portals = new Map<string, { portalOrigin: string; at: number }>();

  constructor(private readonly deps: MembershipPageDeps) {}

  private async offscreen(vta: ActiveVta, op: OffscreenDirectoryPageOp): Promise<unknown> {
    const res = await this.deps.offscreen(vta, op);
    if (!res.ok) throw new MembershipPageRefusal(res.error);
    return res.result;
  }

  private async portalOrigin(vta: ActiveVta, hostDid: string): Promise<string> {
    const now = this.deps.now();
    const hit = this.portals.get(hostDid);
    if (hit && now - hit.at < PORTAL_CACHE_MS) return hit.portalOrigin;
    const got = (await this.offscreen(vta, { op: "portal", hostDid })) as { portalOrigin: string };
    this.portals.set(hostDid, { portalOrigin: got.portalOrigin, at: now });
    return got.portalOrigin;
  }

  /** One `membership.status` call from a page at `origin` (browser-attested). */
  async handle(origin: string, raw: unknown): Promise<RuntimeMembershipPageResponse> {
    try {
      const malformed = membershipPageParamsRefusal(raw);
      if (malformed) return { ok: false, error: malformed };
      return { ok: true, result: await this.status(origin, raw as MembershipPageOp) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private async status(origin: string, p: MembershipPageOp): Promise<PageMembershipView> {
    const active = await this.deps.active();
    if (!active.ok) throw new MembershipPageRefusal(active.error);
    const vta = active.vta;
    const refusal = portalRefusal(origin, p.hostDid, await this.portalOrigin(vta, p.hostDid));
    if (refusal) throw new MembershipPageRefusal(refusal);
    const members = (await this.offscreen(vta, { op: "members", hostDid: p.hostDid })) as string[];
    const agreements = await this.deps.agreements(vta.vtaDid).catch(() => [] as Agreement[]);
    return membershipView(p.hostDid, members, agreements);
  }
}
