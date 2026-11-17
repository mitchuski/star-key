// MyTerms as the draft Trust Task `myterms/propose/0.1` — the individual's side.
//
// `myterms.ts` is the wallet's first MyTerms: one agreement inside a join
// request's `extensions`, read back from the community's verdict. This module
// is the same exchange in the shape of the draft task that carries IEEE Std
// 7012-2025's propose operation (specs/myterms/propose/0.1, offered to the
// Trust Tasks registry; not yet published there), with the rules its Lean
// model proves (mitchuski/trust-tasks-formal, `TrustTasks/MyTerms.lean`):
//
//   - the **payloads** (`ProposeRequest`, `ProposeResponse`) and the response
//     rule that ties members to `decision` (`responseRefusal` — the model's
//     `Resp.wf`, the schema's `dependentSchemas`);
//   - the **answer check** (`answerRefusal` — the model's `Ok`): what an
//     entity may answer a request with after a history, which is what the
//     individual's agent checks before it believes an answer;
//   - the **engagement** (`admissible`, `followUpFor`, `contractOf`): at most
//     one follow-up, by the original proposer, to the same entity, taking
//     exactly the alternative offered, never answered with another
//     alternative; and a contract read from `decision` alone.
//
// Each rule is named for the theorem it carries, and
// `tests/vtc.myterms-propose.mjs` replays the model's own runs against it.
//
// What this is not, yet: a document on the wire. No community serves the task
// and the registry does not publish it, so the wallet cannot pin it
// (`trust-tasks.lock`) and sends no document of its type. Until it can, the
// request payload rides where the agreement already rides — the signed join
// request's `extensions` (`myterms.ts`, `proposalExtension`) — and only when
// the community's configuration pins the roster the choice is made from. The
// task's type URI is deliberately not spelled here: a bundle that names a
// task the lock does not pin fails the build, and it should.

import type { CommunityTerms } from "./myterms.js";

/** The draft's slug and version, as a label for records. Not a type URI. */
export const MYTERMS_PROPOSE_DRAFT = "myterms/propose/0.1";

/** The roster an agreement is chosen from, pinned (IEEE 7012 §4.2, §4.3). */
export interface RosterRef {
  uri: string;
  version: string;
  /** Digest of the roster document at that version, over its bytes as published. */
  digestMultibase: string;
}

/** The request payload: one agreement, the roster, and `respondsTo` on the
 *  one follow-up only. */
export interface ProposeRequest {
  agreement: string;
  roster: RosterRef;
  respondsTo?: string;
}

export type ProposeDecision = "accepted" | "alternative" | "rejected";

/** The `#response` payload. */
export interface ProposeResponse {
  decision: ProposeDecision;
  agreement?: string;
  alternative?: string;
  contractId?: string;
  recordedAt: string;
  taskContext: string;
  taskDigestMultibase: string;
}

/** A request as the engagement rules see it: the payload with the envelope's
 *  `id`, `issuer` (the individual's agent) and `recipient` (the entity's). */
export interface ProposeStepRequest extends ProposeRequest {
  id: string;
  issuer: string;
  recipient: string;
}

/** An answer as the rules see it: the payload with the envelope's `issuer`. */
export interface ProposeStepResponse extends ProposeResponse {
  issuer: string;
}

/** One step: a request and, if the operation was performed, its answer.
 *  `null` is a `trust-task-error` — the proposal was not considered. */
export type ProposeStep = readonly [ProposeStepRequest, ProposeStepResponse | null];
export type ProposeRun = readonly ProposeStep[];

const isHttpsIri = (v: unknown): v is string => {
  if (typeof v !== "string" || v.length > 2048) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
};

/** A roster reference as a configuration or a payload writes it, or
 *  `undefined` when any member is missing. Never completed from a guess: a
 *  digest the wallet did not read is not a pin. */
export function rosterRefOf(v: unknown): RosterRef | undefined {
  if (!v || typeof v !== "object") return undefined;
  const { uri, version, digestMultibase } = v as Record<string, unknown>;
  if (!isHttpsIri(uri)) return undefined;
  if (typeof version !== "string" || version.length < 1 || version.length > 64) return undefined;
  if (typeof digestMultibase !== "string" || !/^[zu][A-Za-z0-9_-]{16,}$/.test(digestMultibase)) return undefined;
  return { uri, version, digestMultibase };
}

const sameRoster = (a: RosterRef, b: RosterRef) =>
  a.uri === b.uri && a.version === b.version && a.digestMultibase === b.digestMultibase;

/** An initial proposal: one agreement from a pinned roster. */
export function buildProposal(agreement: string, roster: RosterRef): ProposeRequest {
  if (!isHttpsIri(agreement)) throw new Error(`not an agreement IRI: ${agreement}`);
  const pinned = rosterRefOf(roster);
  if (!pinned) throw new Error("the roster is not pinned by uri, version and digest");
  return { agreement, roster: pinned };
}

// ── The response rule (`Resp.wf`, `decision_iff_contract`) ───────────────────

/** Why `r` is not a response payload, or `null`. `accepted` carries
 *  `agreement` and `contractId` and no `alternative`; `alternative` carries
 *  `alternative` and neither of the others; `rejected` carries none. */
export function responseRefusal(r: unknown): string | null {
  if (!r || typeof r !== "object" || Array.isArray(r)) return "the response is not an object";
  const p = r as Record<string, unknown>;
  const has = (k: string) => p[k] !== undefined;
  for (const k of ["recordedAt", "taskContext", "taskDigestMultibase"]) {
    if (typeof p[k] !== "string" || p[k] === "") return `the response has no ${k}`;
  }
  for (const k of ["agreement", "alternative"]) if (has(k) && !isHttpsIri(p[k])) return `${k} is not an IRI`;
  if (has("contractId") && (typeof p.contractId !== "string" || p.contractId === "")) return "contractId is empty";
  switch (p.decision) {
    case "accepted":
      if (!has("agreement") || !has("contractId")) return "accepted without an agreement and a contract identifier";
      return has("alternative") ? "accepted beside an alternative" : null;
    case "alternative":
      if (!has("alternative")) return "alternative without one";
      return has("agreement") || has("contractId") ? "an alternative beside an agreement or a contract identifier" : null;
    case "rejected":
      return has("agreement") || has("alternative") || has("contractId")
        ? "a rejection beside an agreement, an alternative or a contract identifier"
        : null;
    default:
      return "decision is not accepted, alternative or rejected";
  }
}

// ── What an entity may answer (`Ok`) ─────────────────────────────────────────

export interface AnswerCheck {
  /** Whether an agreement IRI is an entry of the roster the request named. */
  inRoster(agreement: string): boolean;
  /** The request's task digest (SPEC §4.9.3), when the checker computed it;
   *  the answer must cite it. Left out, only `taskContext` is checked. */
  requestDigest?: string;
}

/**
 * Why answer `r` to request `q` after history `h` is not one the entity may
 * give, or `null`. The individual's agent runs this before it believes an
 * answer, and before it keeps the pair as a record.
 *
 * The follow-up arm is the model's, clause for clause: the request named was
 * an initial proposal, by this issuer, to this recipient, answered
 * `alternative` with exactly this agreement (`followup_bound`; dropped, a
 * third party takes an alternative offered to someone else —
 * `issuer_binding_needed`); the answer is not another alternative; and no
 * follow-up to it was performed before (`at_most_one_followup`; dropped, a
 * rejected follow-up is retried until accepted — `round_limit_needed`).
 */
export function answerRefusal(h: ProposeRun, q: ProposeStepRequest, r: ProposeStepResponse, check: AnswerCheck): string | null {
  if (!check.inRoster(q.agreement)) return "the agreement proposed is not in the roster";
  const malformed = responseRefusal(r);
  if (malformed) return malformed;
  if (r.issuer !== q.recipient) return "the answer is not from the entity the proposal was sent to";
  if (r.taskContext !== q.id) return "the answer decides another request";
  if (check.requestDigest !== undefined && r.taskDigestMultibase !== check.requestDigest)
    return "the answer does not cite this request's digest";
  if (r.decision === "accepted" && r.agreement !== q.agreement) return "the entity accepted an agreement that was not proposed";
  if (r.alternative !== undefined && !check.inRoster(r.alternative)) return "the alternative offered is not in the roster";
  if (q.respondsTo === undefined) return null;
  const i = q.respondsTo;
  const answered = h.some(
    ([q0, r0]) =>
      r0 !== null &&
      q0.id === i &&
      q0.respondsTo === undefined &&
      r0.decision === "alternative" &&
      r0.alternative === q.agreement &&
      q0.issuer === q.issuer &&
      q0.recipient === q.recipient &&
      sameRoster(q0.roster, q.roster),
  );
  if (!answered) return "the follow-up does not take an alternative this entity offered this proposer";
  if (r.decision === "alternative") return "a follow-up was answered with another alternative";
  if (h.some(([q1, r1]) => r1 !== null && q1.respondsTo === i)) return "a follow-up to that proposal was already answered";
  return null;
}

/** Why `run` is not an admissible engagement history (`Adm`), or `null`: every
 *  performed step is one the entity may give after the steps before it. A
 *  refused step performs nothing and may stand anywhere. */
export function admissible(run: ProposeRun, check: Pick<AnswerCheck, "inRoster">): string | null {
  for (let n = 0; n < run.length; n++) {
    const [q, r] = run[n]!;
    if (r === null) continue;
    const refusal = answerRefusal(run.slice(0, n), q, r, check);
    if (refusal) return `step ${n + 1}: ${refusal}`;
  }
  return null;
}

// ── The individual's moves ───────────────────────────────────────────────────

/**
 * The one follow-up the individual may send after `run`, taking the
 * alternative offered in answer to request `id` — or `undefined` when there is
 * none to send: the request was itself a follow-up, was not answered
 * `alternative`, or a follow-up to it was already answered (IEEE 7012 §5.2.2,
 * no negotiation beyond the single choice). A follow-up the entity refused to
 * consider does not use up the round.
 */
export function followUpFor(run: ProposeRun, id: string): ProposeRequest | undefined {
  const step = run.find(([q, r]) => q.id === id && r !== null);
  if (!step) return undefined;
  const [q0, r0] = step;
  if (q0.respondsTo !== undefined || r0!.decision !== "alternative" || r0!.alternative === undefined) return undefined;
  if (run.some(([q1, r1]) => r1 !== null && q1.respondsTo === id)) return undefined;
  return { agreement: r0!.alternative, roster: q0.roster, respondsTo: id };
}

/** The contract an engagement reached, read from `decision` alone. */
export interface ProposeContract {
  contractId: string;
  agreement: string;
  /** The individual's agent (the request's `issuer`). */
  individual: string;
  /** The entity's agent (the request's `recipient`, the answer's `issuer`). */
  entity: string;
  /** The `id` of the request the entity accepted. */
  requestId: string;
  recordedAt: string;
}

/**
 * The contracts in an admissible run: every performed step whose `decision`
 * is `accepted`, and nothing else (`decision_member_suffices`). A response
 * being present says nothing — a rejection is a response too
 * (`presence_completion_unsound`). The run is checked first; an inadmissible
 * one yields no contract at all rather than the ones before the fault.
 */
export function contractsOf(run: ProposeRun, check: Pick<AnswerCheck, "inRoster">): ProposeContract[] {
  if (admissible(run, check) !== null) return [];
  const out: ProposeContract[] = [];
  for (const [q, r] of run) {
    if (r === null || r.decision !== "accepted") continue;
    out.push({
      contractId: r.contractId!,
      agreement: r.agreement!,
      individual: q.issuer,
      entity: q.recipient,
      requestId: q.id,
      recordedAt: r.recordedAt,
    });
  }
  return out;
}

// ── Carriage until the task is on the wire ───────────────────────────────────

/** The member of the join request's MyTerms `extensions` entry that carries
 *  the proposal, beside the agreement record `myterms.ts` already puts there. */
export const MYTERMS_PROPOSAL_MEMBER = "proposal";

/**
 * The proposal for a roster code at a community, when its configuration says
 * enough to make one: the roster pinned by uri, version and digest, and the
 * agreement's IRI in that roster. A configuration that pins no roster gets
 * none — the wallet does not invent a digest for a document it has not read —
 * and the join goes on under the agreement record alone, as before.
 */
export function proposalFor(code: string, community: CommunityTerms): ProposeRequest | undefined {
  const iri = community.agreementIris?.[code];
  if (!community.roster || !iri) return undefined;
  return buildProposal(iri, community.roster);
}

/** The proposal as it rides in the extensions entry: the payload, labelled
 *  with the draft it is shaped by. The join request around it supplies what
 *  the task's envelope would — issuer, recipient, issuedAt and the proof. */
export function proposalExtension(proposal: ProposeRequest): Record<string, unknown> {
  return { [MYTERMS_PROPOSAL_MEMBER]: { task: MYTERMS_PROPOSE_DRAFT, payload: proposal } };
}
