// The κ registry's Merkle tree (kappa-core merkle.rs; agentprivacy-mcp
// lib/merkle-kappa.mjs; kappa_evidence_mage kappa.py), the tree a Star Hold
// uses from agentprivacy.star-hold/2. Leaves and interior nodes are hashed
// under different tags — sha256(0x00 ‖ leaf), sha256(0x01 ‖ left ‖ right) — so
// an interior node can never be presented as a leaf (formal_mage
// Formal.Merkle.disclosure_sound). An odd last node pairs with itself, as
// merkle.rs does; safe because a Hold's leaves are its refs, sorted and unique.

const enc = new TextEncoder();
async function sha(...parts: Uint8Array[]): Promise<Uint8Array> {
  const n = parts.reduce((a, p) => a + p.length, 0); const buf = new Uint8Array(n);
  let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf as BufferSource));
}
const LEAF = Uint8Array.of(0x00), NODE = Uint8Array.of(0x01);
export const hashLeaf = (data: Uint8Array) => sha(LEAF, data);
export const hashNode = (l: Uint8Array, r: Uint8Array) => sha(NODE, l, r);
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], (h) => parseInt(h, 16));

async function nextLevel(level: Uint8Array[]): Promise<Uint8Array[]> {
  const next: Uint8Array[] = [];
  for (let i = 0; i < level.length; i += 2) next.push(await hashNode(level[i]!, level[i + 1] ?? level[i]!));
  return next;
}
function refLeaves(refs: readonly string[]): string[] {
  const sorted = [...refs].sort();
  for (let i = 1; i < sorted.length; i++) if (sorted[i] === sorted[i - 1]) throw new Error('duplicate-item: two items share a ref');
  return sorted;
}

export interface ProofStep { sibling: string; left: boolean }

/** The Hold root over its refs (UTF-8, sorted, unique). */
export async function holdRootV2(refs: readonly string[]): Promise<string | null> {
  if (!refs.length) return null;
  let level = await Promise.all(refLeaves(refs).map((r) => hashLeaf(enc.encode(r))));
  while (level.length > 1) level = await nextLevel(level);
  return 'sha256:' + hex(level[0]!);
}

/** (sibling, siblingIsLeft) pairs from the leaf level up, as merkle.rs builds them. */
export async function holdProofV2(refs: readonly string[], ref: string): Promise<ProofStep[] | null> {
  const sorted = refLeaves(refs); let index = sorted.indexOf(ref);
  if (index < 0) return null;
  let level = await Promise.all(sorted.map((r) => hashLeaf(enc.encode(r)))); const proof: ProofStep[] = [];
  while (level.length > 1) {
    let sib = index ^ 1; if (sib >= level.length) sib = index;
    proof.push({ sibling: hex(level[sib]!), left: sib < index });
    level = await nextLevel(level); index = Math.floor(index / 2);
  }
  return proof;
}

export async function holdVerifyV2(root: string, ref: string, proof: readonly ProofStep[]): Promise<boolean> {
  if (!/^sha256:[0-9a-f]{64}$/.test(root ?? '') || !Array.isArray(proof)) return false;
  if (!proof.every((s) => /^[0-9a-f]{64}$/.test(s?.sibling ?? '') && typeof s.left === 'boolean')) return false;
  let cur = await hashLeaf(enc.encode(ref));
  for (const s of proof) cur = s.left ? await hashNode(unhex(s.sibling), cur) : await hashNode(cur, unhex(s.sibling));
  return 'sha256:' + hex(cur) === root;
}
