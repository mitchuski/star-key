// Reading a Hold from a file the bearer chose. Pure: no DOM, no network, no
// verification — that is star-hold.ts's job. Accepts a bare Hold
// (`agentprivacy.star-hold/1`) or the reference runtime's fixture wrapper
// (`star-hold-fixture/1`, which carries the key beside the hold), so the pane
// can show the same fixture the three verifiers agree on.
import { HOLD_KIND, type StarHold } from './star-hold.js';

export interface HoldFile { hold: StarHold; key: Record<string, unknown> | null; source: 'hold' | 'fixture' }

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function readHoldFile(text: string): HoldFile {
  if (text.length > 4 * 1024 * 1024) throw new Error('Choose a Hold smaller than 4 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('The file is not valid JSON.'); }
  if (!isObject(parsed)) throw new Error('Expected a Hold object.');
  if (parsed.kind === HOLD_KIND) return { hold: parsed as unknown as StarHold, key: null, source: 'hold' };
  if (parsed.schema === 'star-hold-fixture/1') {
    if (!isObject(parsed.hold) || parsed.hold.kind !== HOLD_KIND) throw new Error('The fixture carries no Hold of kind ' + HOLD_KIND + '.');
    return { hold: parsed.hold as unknown as StarHold, key: isObject(parsed.key) ? parsed.key : null, source: 'fixture' };
  }
  throw new Error('Not a Star Hold (kind ' + HOLD_KIND + ') or a star-hold-fixture/1.');
}

export function readKeyFile(text: string): Record<string, unknown> {
  if (text.length > 1024 * 1024) throw new Error('Choose a key smaller than 1 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('The key is not valid JSON.'); }
  if (!isObject(parsed) || parsed.version !== 1) throw new Error('Expected a City Key v1.');
  return parsed;
}
