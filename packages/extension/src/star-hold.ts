// The Star Hold in the extension: a sidecar of retained signed envelopes beside
// a City Key, verified locally with WebCrypto. The key carries only
// `holds: { root, count }`; the Hold carries the items. Reference model and
// fixture: ~/dtgwg-zkp-tf-mage/runtimes/star-hold (36/36); this module must
// land on the same root and the same per-item states (tests/star-hold.test.mts).
//
// Profiles: the OpenVTC Data Integrity suite goes through the wallet's own
// verifier (`verifyTrustTaskProof` in @openvtc/pnm-core/trust-tasks — did:key
// resolves locally, did:webvh via the resolver); the mages.city
// `agentprivacy.vta/1` record and Rung 5's bilateral `agentprivacy.vrc/1` are
// verified here with WebCrypto Ed25519 over the agentprivacy canonical form
// (sorted keys — byte-identical to agentprivacy-mcp lib/kappa.mjs). Declared
// profiles report `unsupported`, never `valid` or `invalid`.
//
// A stored verification state is a note, not a fact: verifyHold re-verifies
// every item and re-derives every ref and the root. Nothing here grants access,
// standing or a relationship — it says what is held and what has been checked.
import { verifyTrustTaskProof } from '@openvtc/pnm-core/trust-tasks';
import { holdRootV2, holdProofV2, holdVerifyV2, type ProofStep } from './kappa-merkle.js';
import { HOLD_KIND_V1, DISCLOSURE_KIND_V1, isNodePreimage, merkleRootV1, merklePathV1, rootFromPathV1, type PathStep } from './star-hold-v1.js';
export { HOLD_KIND_V1, DISCLOSURE_KIND_V1, isNodePreimage, type PathStep, type ProofStep };

// /2 roots the items with the κ registry's tagged tree (kappa-merkle.ts). /1 Holds and
// their disclosures are still verified, through the frozen star-hold-v1.ts, by the
// `kind` each artefact carries; nothing new is built or disclosed under /1's tree.
export const HOLD_KIND = 'agentprivacy.star-hold/2';
export const VERIFIER = 'star-key/hold@0.1';
export type ItemState = 'not-checked' | 'valid' | 'invalid' | 'unsupported' | 'unavailable';
export type Profile = 'trust-task/eddsa-jcs-2022' | 'vc/eddsa-jcs-2022' | 'agentprivacy.vta/1' | 'agentprivacy.vrc/1' | 'vc/ecdsa-secp256k1-2019' | 'vc/ed25519-2020' | 'webauthn-assertion';
const FAMILY: Record<Profile, 'di' | 'vta' | 'vrc' | 'declared'> = {
  'trust-task/eddsa-jcs-2022': 'di', 'vc/eddsa-jcs-2022': 'di', 'agentprivacy.vta/1': 'vta', 'agentprivacy.vrc/1': 'vrc',
  'vc/ecdsa-secp256k1-2019': 'declared', 'vc/ed25519-2020': 'declared', 'webauthn-assertion': 'declared',
};
export interface Measured { alg: 'ed25519' | null; sigBytes: number | null; payloadBytes: number | null; envelopeBytes: number }
export interface HoldItem {
  ref: string; profile: Profile; envelope: string; signer: { did: string; verificationMethod: string | null } | null; signed: Measured;
  role: 'self' | 'counterpart' | 'issuer' | 'witness'; subject?: string; issued?: string; expires?: string;
  status: { state: string }; acceptedAt: string; verification: { state: ItemState; verifier: string; inputDigest: string; at: string; reason: string | null };
}
export interface StarHold { kind: typeof HOLD_KIND | typeof HOLD_KIND_V1; bearer: string; bearerPublicKeyHex: string; kappa: string; items: HoldItem[]; root: string; count: number; budget: { bytes: number; used: number; fits: boolean }; at: string; sig: string }
export interface ItemResult { ref: string; profile: Profile; role: HoldItem['role']; state: ItemState; reason: string | null; signer: string | null; signed: Measured }
export interface HoldVerification { ok: boolean; tree: 'kappa-merkle/1' | 'legacy-packets/1'; legacy: boolean; bearerSig: boolean; root: { derived: string | null; stamped: string | null; matches: boolean }; refsMatch: boolean; keyChecked: boolean; keyMatches: boolean | null; items: ItemResult[]; allValid: boolean; budget: { bytes: number | null; used: number; fits: boolean | null }; checkedAt: string; why: string[] }

// ---- canonical forms and hashes ------------------------------------------------
// JCS (RFC 8785), the same rule as packages/core/src/trust-tasks/canonical.ts —
// used here only to MEASURE the signed payload bytes; verification itself goes
// through the core verifier.
export function jcs(v: unknown): string {
  if (v === null) return 'null';
  if (v === true) return 'true';
  if (v === false) return 'false';
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error('JCS rejects non-finite numbers'); return Object.is(v, -0) ? '0' : String(v); }
  if (typeof v === 'string') return jcsString(v);
  if (Array.isArray(v)) return '[' + v.map(jcs).join(',') + ']';
  if (typeof v === 'object') { const o = v as Record<string, unknown>; return '{' + Object.keys(o).sort().map((k) => jcsString(k) + ':' + jcs(o[k])).join(',') + '}'; }
  throw new Error(`JCS cannot encode value of type ${typeof v}`);
}
function jcsString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch === 0x22) out += '\\"'; else if (ch === 0x5c) out += '\\\\'; else if (ch === 0x08) out += '\\b'; else if (ch === 0x0c) out += '\\f';
    else if (ch === 0x0a) out += '\\n'; else if (ch === 0x0d) out += '\\r'; else if (ch === 0x09) out += '\\t';
    else if (ch < 0x20) out += '\\u' + ch.toString(16).padStart(4, '0'); else out += s[i];
  }
  return out + '"';
}
export function canonicalJSON(v: unknown): string {
  // not JSON: refuse rather than print it (NaN/Infinity would print as null and [undefined] as [], giving different values one κ — formal_mage O12b; star-registry.ts refuses the same way)
  if (v === undefined || typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint' || (typeof v === 'number' && !Number.isFinite(v))) throw new Error('canonical JSON: ' + (typeof v === 'number' ? String(v) : typeof v) + ' is not a JSON value');
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJSON).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonicalJSON(o[k])).join(',') + '}';
}
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));
export const sha256hex = async (data: Uint8Array | string) => hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : new Uint8Array(data)));
export const kappaOf = async (obj: Record<string, unknown>) => { const c = { ...obj }; delete c.kappa; return 'sha256:' + (await sha256hex(canonicalJSON(c))); };
export const refOf = async (bytes: Uint8Array) => 'sha256:' + (await sha256hex(bytes));
const isHex = (s: unknown, n: number) => typeof s === 'string' && new RegExp(`^[0-9a-f]{${n}}$`, 'i').test(s);
export function itemBytes(item: { envelope: string }): Uint8Array {
  const b64 = item.envelope.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
// ---- ed25519 (WebCrypto) and did:key ---------------------------------------------
async function edVerify(pubHex: string, data: Uint8Array, sig: Uint8Array): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey('raw', fromHex(pubHex) as BufferSource, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, sig as BufferSource, data as BufferSource);
  } catch { return false; }
}
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58encode(bytes: Uint8Array): string {
  let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
  let out = ''; while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = '1' + out; }
  return out;
}
export const didKey = (pubHex: string) => 'did:key:z' + base58encode(new Uint8Array([0xed, 0x01, ...fromHex(pubHex)]));
const vmOf = (did: string) => did + '#' + did.slice('did:key:'.length);

// ---- profiles ------------------------------------------------------------------------
interface Verified { state: ItemState; reason: string | null; signer: string | null; verificationMethod: string | null; sigBytes: number | null; payloadBytes: number | null }
async function verifyVta(rec: Record<string, unknown>): Promise<Verified> {
  if (rec.kind !== 'agentprivacy.vta/1') return { state: 'unsupported', reason: 'not an agentprivacy.vta/1 record', signer: null, verificationMethod: null, sigBytes: null, payloadBytes: null };
  const pub = rec.publicKeyHex as string, sig = rec.sig as string;
  if (!isHex(pub, 64) || !isHex(sig, 128)) return { state: 'invalid', reason: 'record shape', signer: null, verificationMethod: null, sigBytes: null, payloadBytes: null };
  const did = didKey(pub);
  if (typeof rec.did === 'string' && rec.did !== did) return { state: 'invalid', reason: 'did does not derive from publicKeyHex', signer: did, verificationMethod: vmOf(did), sigBytes: 64, payloadBytes: null };
  const payload = enc.encode(canonicalJSON({ kind: rec.kind, publicKeyHex: pub, kappa: rec.kappa, prior: rec.prior ?? null, at: rec.at, walks: rec.walks ?? 0, vrcs: rec.vrcs ?? [] }));
  const ok = await edVerify(pub, payload, fromHex(sig));
  return { state: ok ? 'valid' : 'invalid', reason: ok ? null : 'signature verification failed', signer: did, verificationMethod: vmOf(did), sigBytes: 64, payloadBytes: payload.length };
}
async function verifyVrc(v: Record<string, unknown>): Promise<Verified> {
  if (v.kind !== 'agentprivacy.vrc/1') return { state: 'unsupported', reason: 'not an agentprivacy.vrc/1 record', signer: null, verificationMethod: null, sigBytes: null, payloadBytes: null };
  const parties = v.parties as string[];
  if (!Array.isArray(parties) || parties.length !== 2 || !parties.every((p) => isHex(p, 64)) || !isHex(v.sigA, 128) || !isHex(v.sigB, 128)) return { state: 'invalid', reason: 'record shape', signer: null, verificationMethod: null, sigBytes: null, payloadBytes: null };
  const [pa, pb] = parties as [string, string];
  const bytes = enc.encode(canonicalJSON({ kind: v.kind, parties, intersection: v.intersection, proverb: v.proverb, issued: v.issued }));
  const a = await edVerify(pa, bytes, fromHex(v.sigA as string)), b = await edVerify(pb, bytes, fromHex(v.sigB as string));
  return { state: a && b ? 'valid' : 'invalid', reason: a && b ? null : 'signature verification failed', signer: didKey(pa) + ',' + didKey(pb), verificationMethod: null, sigBytes: 128, payloadBytes: bytes.length };
}
async function verifyDI(doc: Record<string, unknown> & { proof?: unknown }): Promise<Verified> {
  const proof = doc.proof as Record<string, unknown> | undefined;
  const vm = typeof proof?.verificationMethod === 'string' ? proof.verificationMethod : null;
  if (proof && (proof.type !== 'DataIntegrityProof' || proof.cryptosuite !== 'eddsa-jcs-2022')) return { state: 'unsupported', reason: `unsupported proof suite: ${String(proof.type)}/${String(proof.cryptosuite)}`, signer: null, verificationMethod: vm, sigBytes: null, payloadBytes: null };
  const controller = vm ? vm.slice(0, vm.indexOf('#')) : null;
  const r = await verifyTrustTaskProof(doc);
  if (r.verified) { const copy = { ...doc }; delete copy.proof; return { state: 'valid', reason: null, signer: r.signer ?? controller, verificationMethod: vm, sigBytes: 64, payloadBytes: enc.encode(jcs(copy)).length }; }
  const unresolved = /resolution failed/.test(r.reason ?? '') && !!controller && !controller.startsWith('did:key:');
  return { state: unresolved ? 'unavailable' : 'invalid', reason: r.reason ?? 'signature verification failed', signer: r.signer ?? controller, verificationMethod: vm, sigBytes: null, payloadBytes: null };
}
export async function verifyEnvelope(profile: Profile, bytes: Uint8Array): Promise<{ state: ItemState; reason: string | null; signer: string | null; verificationMethod: string | null; signed: Measured }> {
  const family = FAMILY[profile];
  const measure = (r: Verified | null): Measured => ({ alg: r?.sigBytes ? 'ed25519' : null, sigBytes: r?.sigBytes ?? null, payloadBytes: r?.payloadBytes ?? null, envelopeBytes: bytes.length });
  if (!family) return { state: 'unsupported', reason: `unknown profile ${profile}`, signer: null, verificationMethod: null, signed: measure(null) };
  if (family === 'declared') return { state: 'unsupported', reason: `profile ${profile} is declared, not verified by ${VERIFIER}`, signer: null, verificationMethod: null, signed: measure(null) };
  let doc: Record<string, unknown>;
  try { doc = JSON.parse(new TextDecoder().decode(bytes)); } catch { return { state: 'invalid', reason: 'envelope is not JSON', signer: null, verificationMethod: null, signed: measure(null) }; }
  // a record with a non-JSON field (canonicalJSON refuses it) is invalid, never a crash
  let r: Verified;
  try { r = family === 'di' ? await verifyDI(doc) : family === 'vta' ? await verifyVta(doc) : await verifyVrc(doc); }
  catch (e) { return { state: 'invalid', reason: 'record has a field that is not a JSON value: ' + (e instanceof Error ? e.message : String(e)), signer: null, verificationMethod: null, signed: measure(null) }; }
  return { state: r.state, reason: r.reason, signer: r.signer, verificationMethod: r.verificationMethod, signed: measure(r) };
}
// ---- the Hold ------------------------------------------------------------------------
export const holdBytes = (h: StarHold) => enc.encode(canonicalJSON({ kind: h.kind, bearer: h.bearer, kappa: h.kappa, root: h.root, count: h.count, at: h.at }));
export async function verifyHold(hold: StarHold, { key = null, now = new Date() }: { key?: Record<string, unknown> | null; now?: Date } = {}): Promise<HoldVerification> {
  const why: string[] = []; const push = (c: boolean, m: string) => { if (!c) why.push(m); return c; };
  const legacy = hold?.kind === HOLD_KIND_V1;
  push(hold?.kind === HOLD_KIND || legacy, 'kind');
  push(isHex(hold?.bearerPublicKeyHex, 64) && hold?.bearer === didKey(hold.bearerPublicKeyHex), 'bearer did does not derive from bearerPublicKeyHex');
  const items = Array.isArray(hold?.items) ? hold.items : [];
  push(items.length > 0, 'items');
  const bearerSig = isHex(hold?.sig, 128) && isHex(hold?.bearerPublicKeyHex, 64) && (await edVerify(hold.bearerPublicKeyHex, holdBytes(hold), fromHex(hold.sig)));
  push(bearerSig, 'bearer signature over {kind,bearer,kappa,root,count,at} does not verify');
  let refsMatch = true;
  for (const i of items) if (typeof i?.envelope !== 'string' || (legacy && isNodePreimage(itemBytes(i))) || (await refOf(itemBytes(i))) !== i.ref) refsMatch = false;
  push(refsMatch, 'an item ref does not re-derive from its retained bytes');
  let derived: string | null = null;
  try { derived = legacy ? await merkleRootV1(items.map((i) => i.ref)) : await holdRootV2(items.map((i) => i.ref)); }
  catch { push(false, 'two items share a ref'); }
  const rootMatches = derived === hold?.root;
  push(rootMatches, 'root does not re-derive from item refs');
  push(hold?.count === items.length, 'count');
  const results: ItemResult[] = [];
  for (const i of items) { const v = await verifyEnvelope(i.profile, itemBytes(i)); results.push({ ref: i.ref, profile: i.profile, role: i.role, state: v.state, reason: v.reason, signer: v.signer, signed: v.signed }); }
  let keyMatches: boolean | null = null;
  if (key) {
    const holds = key.holds as { root?: string; count?: number } | undefined;
    keyMatches = (await kappaOf(key)) === hold?.kappa && (holds == null || (holds.root === hold.root && holds.count === hold.count));
    push(keyMatches, 'the Hold does not belong to this key (κ or holds{root,count} differ)');
  }
  const used = items.reduce((n, i) => n + (i?.signed?.envelopeBytes ?? 0), 0);
  return { ok: why.length === 0, tree: legacy ? 'legacy-packets/1' : 'kappa-merkle/1', legacy, bearerSig, root: { derived, stamped: hold?.root ?? null, matches: rootMatches }, refsMatch, keyChecked: !!key, keyMatches, items: results,
    allValid: results.length > 0 && results.every((r) => r.state === 'valid'), budget: { bytes: hold?.budget?.bytes ?? null, used, fits: hold?.budget?.bytes == null ? null : used <= hold.budget.bytes }, checkedAt: now.toISOString(), why };
}
// Refs and states only: no envelopes, no counterpart DIDs, no subjects.
export function projectHold(hold: StarHold) {
  return { kind: 'agentprivacy.star-hold-projection/1', bearer: hold.bearer, kappa: hold.kappa, root: hold.root, count: hold.count, at: hold.at, sig: hold.sig,
    items: hold.items.map((i) => ({ ref: i.ref, profile: i.profile, role: i.role, signed: i.signed, verification: { state: i.verification.state } })) };
}

// ---- a disclosure: chosen items under the root ----------------------------------------
// The rung before a presentation: the bearer shows the items they choose, each
// with its path to the root the key carries, so anyone holding that root can
// verify them. It discloses exactly those items (their bytes, their signers)
// and of the others only their number. The zero-knowledge presentation of the
// reference runtime (dtg-zkp/star-hold, which refuses even the raw root on the
// public side) is a later rung, and is not this.
export const DISCLOSURE_KIND = 'agentprivacy.star-hold-disclosure/2';
// /2 items carry a κ-tree inclusion proof; /1 items (legacy) carry the old path.
export interface DisclosedItem { ref: string; profile: Profile; role: HoldItem['role']; envelope: string; signed: Measured; proof?: ProofStep[]; path?: PathStep[] }
export interface HoldDisclosure { kind: typeof DISCLOSURE_KIND | typeof DISCLOSURE_KIND_V1; bearer: string; root: string; count: number; k: number; items: DisclosedItem[]; at: string }
export interface DisclosureVerification {
  ok: boolean; root: { stamped: string; expected: string | null; matches: boolean | null }; k: number; count: number;
  items: { ref: string; profile: Profile; role: HoldItem['role']; state: ItemState; reason: string | null; signer: string | null; signed: Measured; underRoot: boolean }[];
  bytes: number; legacy: boolean; why: string[];
}

/** The bearer's chosen items, each with its path to the Hold's root. */
export async function discloseHold(hold: StarHold, refs: readonly string[], now: Date = new Date()): Promise<HoldDisclosure> {
  const chosen = hold.items.filter((i) => refs.includes(i.ref));
  if (!chosen.length) throw new Error('choose at least one item');
  const leaves = hold.items.map((i) => i.ref);
  const legacy = hold.kind === HOLD_KIND_V1;
  const items: DisclosedItem[] = [];
  for (const i of chosen) {
    const base = { ref: i.ref, profile: i.profile, role: i.role, envelope: i.envelope, signed: i.signed };
    if (legacy) {
      const path = await merklePathV1(leaves, i.ref);
      if (!path) throw new Error('item not in hold');
      items.push({ ...base, path });
    } else {
      const proof = await holdProofV2(leaves, i.ref);
      if (!proof) throw new Error('item not in hold');
      items.push({ ...base, proof });
    }
  }
  return { kind: legacy ? DISCLOSURE_KIND_V1 : DISCLOSURE_KIND, bearer: hold.bearer, root: hold.root, count: hold.count, k: items.length, items, at: now.toISOString() };
}

export const disclosureBytes = (d: HoldDisclosure) => enc.encode(canonicalJSON(d)).length;

/** Verify a disclosure: each item's bytes re-derive its ref, its path leads to the
 *  stamped root and its envelope verifies; and when the verifier holds a root
 *  (a key's `holds.root`), the stamped root is that one. */
export async function verifyDisclosure(d: HoldDisclosure, { root = null }: { root?: string | null } = {}): Promise<DisclosureVerification> {
  const why: string[] = []; const push = (c: boolean, m: string) => { if (!c) why.push(m); return c; };
  const legacy = d?.kind === DISCLOSURE_KIND_V1;
  push(d?.kind === DISCLOSURE_KIND || legacy, 'kind');
  const items = Array.isArray(d?.items) ? d.items : [];
  push(items.length > 0, 'items');
  push(d?.k === items.length, 'k');
  push(Number.isInteger(d?.count) && d.count >= items.length, 'count');
  const results: DisclosureVerification['items'] = [];
  for (const i of items) {
    const bytes = itemBytes(i);
    // /2's leaf tag makes an interior node unpresentable as an item; /1 refuses its shape instead
    const nodeShaped = legacy && isNodePreimage(bytes);
    push(!nodeShaped, 'item bytes have the form of an interior Merkle node (leaf/node confusion)');
    const refOk = !nodeShaped && (await refOf(bytes)) === i.ref;
    push(refOk || nodeShaped, 'an item ref does not re-derive from its bytes');
    const underRoot = refOk && (legacy
      ? Array.isArray(i.path) && (await rootFromPathV1(i.ref, i.path)) === d.root
      : Array.isArray(i.proof) && (await holdVerifyV2(d.root, i.ref, i.proof)));
    push(underRoot, 'an item path does not lead to the root');
    const v = await verifyEnvelope(i.profile, bytes);
    results.push({ ref: i.ref, profile: i.profile, role: i.role, state: v.state, reason: v.reason, signer: v.signer, signed: v.signed, underRoot });
  }
  const matches = root == null ? null : d?.root === root;
  push(matches !== false, 'the stamped root is not the root the verifier holds');
  return { ok: why.length === 0, root: { stamped: d?.root ?? '', expected: root, matches }, k: items.length, count: d?.count ?? 0, items: results, bytes: d ? disclosureBytes(d) : 0, legacy, why };
}

// /1 helpers under their former names, for code and tests that read sealed /1 artefacts.
export { merkleRootV1 as merkleRoot, merklePathV1 as merklePath, rootFromPathV1 as rootFromPath };
export { holdRootV2, holdProofV2, holdVerifyV2 };
