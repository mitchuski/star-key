// The 64-state lattice, as every surface of the family names it.
//
// One rule, three places: the canonical module (agentprivacy lib/lattice-vertex.ts), the City's
// star of the chains (mages.city/star.html) and the seal check (sigil/sealcheck.js). A state is a
// 6-bit number; its bits, from weight 32 down to 1, are Protection · Delegation · Memory ·
// Connection · Computation · Value. The first three are the state's *house*, the last three its
// *place* (a house of eight, a place of eight). A hash lands on the state named by its first six
// bits. The Star figure draws the same 64 states in its own projection; the numbers, and so the
// names, are the same everywhere. tests/lattice.test.mts pins this against the City's vectors.

export const DIMENSIONS = ["Protection", "Delegation", "Memory", "Connection", "Computation", "Value"] as const;

const isState = (v: number) => Number.isInteger(v) && v >= 0 && v < 64;

/** Bits from weight 32 (Protection) to 1 (Value). */
export function stateBits(v: number): number[] {
  if (!isState(v)) throw new Error(`not a lattice state: ${v}`);
  return [5, 4, 3, 2, 1, 0].map((b) => (v >> b) & 1);
}

/** The dimensions a state holds, in canonical order. */
export function stateDimensions(v: number): string[] {
  return stateBits(v).flatMap((b, i) => (b ? [DIMENSIONS[i]!] : []));
}

/** House (Protection · Delegation · Memory) and place (Connection · Computation · Value). */
export function houseAndPlace(v: number): { house: number; place: number } {
  stateBits(v);
  return { house: v >> 3, place: v & 7 };
}

/** "V38 · Protection · Connection · Computation", or "V0 · none". */
export function stateName(v: number): string {
  const dims = stateDimensions(v);
  return `V${v} · ${dims.length ? dims.join(" · ") : "none"}`;
}

/** The state a hash lands on: its first six bits. Accepts `sha256:<hex>`, `<algo>:<hex>` or bare hex;
 *  `undefined` for anything else. */
export function stateOfHash(k: string): number | undefined {
  const hex = String(k).split(":").pop() ?? "";
  if (!/^[0-9a-f]{2,}$/i.test(hex)) return undefined;
  return parseInt(hex.slice(0, 2), 16) >> 2;
}
