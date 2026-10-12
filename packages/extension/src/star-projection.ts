// An allowlisted reading, not a copy of the imported carrier or credential evidence.
export interface StarProjection {
  schema: 'star-reading/0.1';
  authority: 'unverified-import';
  sourceVersion: 1;
  name: string;
  palette: Record<'cool' | 'warm' | 'sword' | 'mage', string>;
  lit: number[];
}
export function inspectCityKey(value: unknown): StarProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Choose a City Key JSON object.');
  const key = value as Record<string, unknown>;
  if (key.version !== 1) throw Error('Only City Key version 1 is supported in this experiment.');
  if (typeof key.name !== 'string' || !key.name.trim() || key.name.length > 200) throw Error('The key needs a name of 1–200 characters.');
  const palette = key.palette as Record<string, unknown> | undefined;
  const selected = {} as StarProjection['palette'];
  for (const field of ['cool', 'warm', 'sword', 'mage'] as const) {
    const color = palette?.[field];
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw Error('Palette colours must be six-digit hex values.');
    selected[field] = color;
  }
  if (key.lit !== undefined && (!Array.isArray(key.lit) || key.lit.length > 64 || key.lit.some(v => !Number.isInteger(v) || v < 0 || v > 63))) throw Error('Lit vertices must be integers from 0 to 63, with at most 64 entries.');
  return { schema: 'star-reading/0.1', authority: 'unverified-import', sourceVersion: 1, name: key.name.trim(), palette: selected, lit: [...new Set((key.lit ?? []) as number[])].sort((a, b) => a - b) };
}
export function compressReading(reading: StarProjection, includeVertices: boolean): string {
  return JSON.stringify({ ...reading, lit: includeVertices ? [...reading.lit] : [] });
}

// What the imported carrier holds that this reading does NOT carry. Counts and presence only,
// never values. A reader holding the retained key, or the City's logs, can reconstruct lineage
// that this projection omits (the κ chain, the walks). Provenance needs a declared reader and an
// explicit access basis (V7 research intake · OPH, 2026-09-11); decide whether lineage references
// are disclosable before export.
export interface RetainedSummary {
  descriptions: number; lit: number; focus: number; walks: number; packets: number; receipts: number; credentials: number;
  identity: boolean; did: boolean; kappa: boolean; prior: boolean; trace: boolean; figures: boolean; geometry: boolean;
  /** names of any further top-level fields, never their values */
  other: string[];
}
const RETAINED_KNOWN = new Set(['name', 'version', 'palette', 'lit', 'descriptions', 'focus', 'walks', 'packets', 'identity', 'did', 'kappa', 'prior', 'trace', 'figures', 'geometry', 'receipts', 'credentials']);
export function retainedSummary(value: unknown): RetainedSummary {
  const key = (value && typeof value === 'object' && !Array.isArray(value)) ? value as Record<string, unknown> : {};
  const count = (v: unknown) => Array.isArray(v) ? v.length : (v && typeof v === 'object') ? Object.keys(v as object).length : 0;
  const has = (v: unknown) => v !== undefined && v !== null && v !== '';
  const packets = key.packets as Record<string, unknown> | undefined;
  return {
    descriptions: count(key.descriptions), lit: count(key.lit), focus: count(key.focus), walks: count(key.walks),
    packets: typeof packets?.count === 'number' ? packets.count : count(packets),
    receipts: count(key.receipts), credentials: count(key.credentials),
    identity: has(key.identity), did: has(key.did), kappa: has(key.kappa), prior: has(key.prior), trace: has(key.trace), figures: has(key.figures), geometry: has(key.geometry),
    other: Object.keys(key).filter(k => !RETAINED_KNOWN.has(k)).sort(),
  };
}
