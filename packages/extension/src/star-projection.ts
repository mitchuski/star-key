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
