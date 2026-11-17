// Earned light: the vertices of a City Key's Star that the City's evidence lit.
//
// On the star of the chains (mages.city/star.html) a visitor composes a *face of the evidence*:
// one evidence-chain root per lattice state, with the order they were chosen in (the trace).
// Folding a face into a City Key adds its root to the key's `chains` (a packet root over every
// folded face, with a count) and keeps the faces themselves beside the key, in
// `chain-faces.json` (`agentprivacy.chain-faces/1`).
//
// This module re-derives both roots here, with the same packets rule the City uses
// (agentprivacy lib/chain-face.ts: sort, sha256("a|b") pairwise, an odd one promoted), and only
// then names the vertices those faces set. That is the difference this module exists for:
// `lit` on a City Key is a list its bearer supplies (`unverified-import`); a vertex returned
// here is one a face of the evidence set, under a root the key itself carries.
//
// What it does not check: that each face's roots are real roots of real evidence chains. A face
// names its roots; whether a chain holds one is the chain's own page to answer. The Star reads
// "lit by N faces of the evidence, re-derived here", never "verified evidence".
//
// It does check one thing about each root: that it sits on its own state. A hash lands on the
// state named by its first six bits (lattice.ts), and the City only ever places a root there, so a
// face that moves a root to another vertex lights nothing. The light is the hashes', not the
// bearer's placement.
//
// DOM-free: WebCrypto only, so the tests run it in plain Node.

import { stateOfHash } from "./lattice.js";

export const CHAIN_FACES_SCHEMA = "agentprivacy.chain-faces/1";
export const CHAIN_FACE_SCHEMA = "agentprivacy.chain-face/1";

const MAX_FACES = 512;

async function sha(text: string): Promise<string> {
  const d = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return "sha256:" + [...d].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** The packets rule: sorted, hashed in pairs as `a|b`, an odd one promoted, to one root.
 *  `null` for no items. Identical to the City's `packets`. */
export async function packetsRoot(items: readonly string[]): Promise<string | null> {
  let level = items.filter((x) => typeof x === "string" && x.length > 0).slice().sort();
  if (level.length === 0) return null;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? await sha(`${level[i]}|${level[i + 1]}`) : level[i]!);
    level = next;
  }
  return level[0]!;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isRoot = (v: unknown): v is string => typeof v === "string" && /^sha256:[0-9a-f]{64}$/.test(v);

/** A face's root, re-derived from its states and trace: packets over `<vertex>|<root>` for
 *  each state and `trace|<mode>|<v1>v2>…`. Throws on a face that is not well formed. */
export async function faceRoot(face: unknown): Promise<{ root: string; vertices: number[] }> {
  if (!isObj(face) || face.schema !== CHAIN_FACE_SCHEMA) throw new Error("not a face of the evidence");
  const states = face.states;
  if (!isObj(states)) throw new Error("a face has no states");
  const items: string[] = [];
  const vertices: number[] = [];
  for (const [v, it] of Object.entries(states)) {
    const n = Number(v);
    if (!/^\d{1,2}$/.test(v) || !Number.isInteger(n) || n < 0 || n > 63) throw new Error(`a face names a state outside the lattice: ${v}`);
    const k = isObj(it) ? it.k : undefined;
    if (!isRoot(k)) throw new Error(`state ${v} carries no root`);
    const own = stateOfHash(k);
    if (own !== n) throw new Error(`state ${v} holds a root that lands on ${own}`);
    items.push(`${v}|${k}`);
    vertices.push(n);
  }
  if (vertices.length === 0) throw new Error("a face sets no state");
  const trace = face.trace;
  if (!isObj(trace) || typeof trace.mode !== "string" || !Array.isArray(trace.order)) throw new Error("a face has no trace");
  items.push(`trace|${trace.mode}|${trace.order.join(">")}`);
  const root = await packetsRoot(items);
  return { root: root!, vertices: vertices.sort((a, b) => a - b) };
}

export type EarnedLight =
  | {
      ok: true;
      /** faces re-derived and folded under the key's `chains.root` */
      faces: number;
      /** the lattice vertices those faces set, ascending */
      vertices: number[];
      /** how many faces set each vertex */
      weight: Record<number, number>;
    }
  | { ok: false; reason: string };

/** Light a City Key's Star from its faces of the evidence. Every face's root is re-derived
 *  from its states and trace, and the packet root over those roots must equal the key's
 *  `chains.root`, with the key's count. Anything else lights nothing. */
export async function earnedLight(key: unknown, chainFaces: unknown): Promise<EarnedLight> {
  if (!isObj(key)) return { ok: false, reason: "not a City Key" };
  const chains = key.chains;
  if (!isObj(chains) || !isRoot(chains.root) || typeof chains.count !== "number") return { ok: false, reason: "this key carries no faces of the evidence" };
  if (!isObj(chainFaces) || chainFaces.schema !== CHAIN_FACES_SCHEMA || !Array.isArray(chainFaces.faces)) return { ok: false, reason: "not a chain-faces.json" };
  const faces = chainFaces.faces;
  if (faces.length === 0 || faces.length > MAX_FACES) return { ok: false, reason: "the faces file holds no faces, or too many" };
  if (faces.length !== chains.count) return { ok: false, reason: `the key carries ${chains.count} face(s), the file ${faces.length}` };
  const roots: string[] = [];
  const weight: Record<number, number> = {};
  for (const [i, face] of faces.entries()) {
    let derived: { root: string; vertices: number[] };
    try {
      derived = await faceRoot(face);
    } catch (e) {
      return { ok: false, reason: `face ${i + 1}: ${e instanceof Error ? e.message : "unreadable"}` };
    }
    if ((face as Record<string, unknown>).root !== derived.root) return { ok: false, reason: `face ${i + 1}: its root does not match its states and trace` };
    roots.push(derived.root);
    for (const v of derived.vertices) weight[v] = (weight[v] ?? 0) + 1;
  }
  if ((await packetsRoot(roots)) !== chains.root) return { ok: false, reason: "these faces do not fold to the key's chains root" };
  return { ok: true, faces: faces.length, vertices: Object.keys(weight).map(Number).sort((a, b) => a - b), weight };
}
