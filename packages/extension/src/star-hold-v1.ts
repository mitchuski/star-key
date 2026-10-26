// LEGACY — agentprivacy.star-hold/1 and its disclosure, frozen and verify-only.
//
// The /1 tree is the packets rule: sorted refs, each interior node
// 'sha256:' + sha256(a + '|' + b), an odd node promoted. Leaves and nodes are
// hashed alike, so an interior node's preimage `sha256:<64 hex>|sha256:<64 hex>`
// could be offered as an item's bytes and pass with a shortened path; /1 is
// verified with that shape refused (`isNodePreimage`). New Holds are /2
// (kappa-merkle.ts, the κ registry tree with leaf/node tags); this module exists
// so every Hold and disclosure sealed under /1 keeps its standing.
//
// Not a fold: nothing new is built under /1, star-hold.ts reaches this module only
// by dispatching on the `kind` the artefact itself carries, and the day no /1 Hold
// matters this file and its two dispatch arms are deleted whole. Archive:
// agentprivacy_master docs/chronicles/2026-10-25_the-tree-learns-its-leaves.md.

export const HOLD_KIND_V1 = 'agentprivacy.star-hold/1';
export const DISCLOSURE_KIND_V1 = 'agentprivacy.star-hold-disclosure/1';
export interface PathStep { sibling: string | null; side: 'left' | 'right' | null }

const enc = new TextEncoder();
const sha256hex = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))), (x) => x.toString(16).padStart(2, '0')).join('');

const NODE_PREIMAGE = /^sha256:[0-9a-f]{64}\|sha256:[0-9a-f]{64}$/;
/** Bytes with the shape of a /1 interior node's preimage are never an envelope. */
export const isNodePreimage = (bytes: Uint8Array): boolean =>
  bytes.length === 143 && NODE_PREIMAGE.test(new TextDecoder().decode(bytes));

/** The /1 root over sorted leaves, odd promoted. */
export async function merkleRootV1(leaves: string[]): Promise<string | null> {
  let level = [...leaves].sort();
  if (!level.length) return null;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]!, b = level[i + 1];
      next.push(b !== undefined ? 'sha256:' + (await sha256hex(a + '|' + b)) : a);
    }
    level = next;
  }
  return level[0] ?? null;
}

/** The /1 path from one leaf to the root. */
export async function merklePathV1(leaves: string[], leaf: string): Promise<PathStep[] | null> {
  let level = [...leaves].sort();
  let idx = level.indexOf(leaf);
  if (idx < 0) return null;
  const steps: PathStep[] = [];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]!, b = level[i + 1];
      if (b === undefined) {
        next.push(a);
        if (i === idx) { steps.push({ sibling: null, side: null }); idx = next.length - 1; }
      } else {
        next.push('sha256:' + (await sha256hex(a + '|' + b)));
        if (i === idx) { steps.push({ sibling: b, side: 'right' }); idx = next.length - 1; }
        else if (i + 1 === idx) { steps.push({ sibling: a, side: 'left' }); idx = next.length - 1; }
      }
    }
    level = next;
  }
  return steps;
}

/** The /1 root a leaf and its path lead to. */
export async function rootFromPathV1(leaf: string, path: readonly PathStep[]): Promise<string> {
  let cur = leaf;
  for (const s of path) {
    if (s.sibling === null) continue;
    cur = 'sha256:' + (await sha256hex(s.side === 'right' ? cur + '|' + s.sibling : s.sibling + '|' + cur));
  }
  return cur;
}
